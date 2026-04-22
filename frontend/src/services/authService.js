import { supabase } from "../lib/supabaseClient";

export async function register({ fullName, username, email, password }) {
  try {
    const cleanFullName = fullName?.trim();
    const cleanUsername = username?.trim().toLowerCase();
    const cleanEmail = email?.trim().toLowerCase();

    if (!cleanFullName || !cleanUsername || !cleanEmail || !password) {
      return {
        success: false,
        message: "Full name, username, email, and password are required.",
      };
    }

    // Duplicate username control
    const { data: existingUsername, error: usernameCheckError } = await supabase
      .from("customers")
      .select("customer_id")
      .eq("username", cleanUsername)
      .maybeSingle();

    if (usernameCheckError) {
      console.error("Username check error:", usernameCheckError);
      return {
        success: false,
        message: "Could not check username. Please try again.",
      };
    }

    if (existingUsername) {
      return {
        success: false,
        message: "Username is already taken.",
      };
    }

    // Duplicate email control
    const { data: existingEmail, error: emailCheckError } = await supabase
      .from("customers")
      .select("customer_id")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (emailCheckError) {
      console.error("Email check error:", emailCheckError);
      return {
        success: false,
        message: "Could not check email. Please try again.",
      };
    }

    if (existingEmail) {
      return {
        success: false,
        message: "Email is already registered.",
      };
    }

    const { data, error } = await supabase.from("customers").insert([
      {
        name: cleanFullName,
        username: cleanUsername,
        email: cleanEmail,
        password_hash: password,
      },
    ]);

    if (error) {
      console.error("Supabase registration error!:", {
        message: error.message,
        code: error.code,
        status: error.status,
        details: error.details,
        hint: error.hint,
      });

      if (error.code === "23505") {
        if (error.message?.toLowerCase().includes("username")) {
          return {
            success: false,
            message: "This username is already taken.",
          };
        }
        if (error.message?.toLowerCase().includes("email")) {
          return {
            success: false,
            message: "This email is already registered.",
          };
        }

        return {
          success: false,
          message: "Username or email already exists.",
        };
      }

      return {
        success: false,
        message: error.message || "Registration failed.",
      };
    }

    return {
      success: true,
      message: "Account created successfully.",
      data,
    };
  } catch (err) {
    console.error("Registration catch error:", err);
    return {
      success: false,
      message: err.message || "Registration failed.",
    };
  }
}

export async function login(email, password) {
  try {
    const { data, error } = await supabase.from("customers").select("*").eq("email", email).single();

    if (error) {
      console.error("Supabase login error:", error);
      return {
        success: false,
        message: "Email or password is incorrect.",
      };
    }

    if (!data) {
      return {
        success: false,
        message: "Email or password is incorrect.",
      };
    }

    
    if (data.password_hash !== password) {
      return {
        success: false,
        message: "Email or password is incorrect.",
      };
    }

    localStorage.setItem("user", JSON.stringify(data));
    localStorage.removeItem("guest_cart");

    return {
      success: true,
      message: "Logged in successfully.",
      data,
    };
  } catch (err) {
    console.error("Login catch error:", err);
    return {
      success: false,
      message: "Login failed. Please try again.",
    };
  }
}

export async function logout() {
  localStorage.removeItem("user");
  return {
    success: true,
    message: "Logged out successfully.",
  };
}

export function getCurrentUser() {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
}