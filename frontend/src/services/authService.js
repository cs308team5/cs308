import {mergeGuestCartOnLogin} from "./productAndCartService.js";

async function readJsonResponse(response) {
  const raw = await response.text();

  if (!raw) {
    return {};
  }

  return JSON.parse(raw);
}

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

    const data = await readJsonResponse(response);

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
      message: "Registration failed. Please make sure the backend server is running.",
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

    const data = await readJsonResponse(response);

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
    mergeGuestCartOnLogin(normalizedUser.customer_id).catch((err) => {
      console.error("Error merging guest cart on login:", err);
    });

    return {
      success: true,
      message: "Logged in successfully.",
      data: normalizedUser,
    };
  } catch (err) {
    console.error("Login catch error:", err);
    return {
      success: false,
      message: "Login failed. Please make sure the backend server is running.",
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
