import { mergeGuestCartOnLogin } from "./productAndCartService";

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

    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: cleanFullName,
        username: cleanUsername,
        email: cleanEmail,
        password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.message || "Registration failed.",
      };
    }

    return {
      success: true,
      message: "Account created successfully.",
      data: data.customer,
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
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email?.trim().toLowerCase(),
        password,
      }),
    });

    const rawText = await response.text();
    const data = rawText ? JSON.parse(rawText) : {};

    if (!response.ok || !data.customer || !data.token) {
      return {
        success: false,
        message:
          data.message ||
          (response.status === 502
            ? "Backend server is not reachable. Please restart the backend."
            : "Email or password is incorrect."),
      };
    }

    const normalizedUser = {
      ...data.customer,
      token: data.token,
      customer_id: data.customer.customer_id ?? data.customer.customerId,
      customerId: data.customer.customerId ?? data.customer.customer_id,
      isAdmin: Boolean(data.customer.isAdmin ?? data.customer.is_admin),
      is_admin: Boolean(data.customer.isAdmin ?? data.customer.is_admin),
    };

    localStorage.setItem("user", JSON.stringify(normalizedUser));
    await mergeGuestCartOnLogin(normalizedUser.customerId);

    return {
      success: true,
      message: "Logged in successfully.",
      data: normalizedUser,
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
