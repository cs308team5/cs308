import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";
import {
  normalizeRole,
  PRODUCT_MANAGER_ROLE,
  SALES_MANAGER_ROLE,
} from "../utils/adminAccess.js";

const toSafeCustomer = (customer) => {
  const role = normalizeRole(customer.role);

  return {
    customerId: customer.customer_id,
    customer_id: customer.customer_id,
    name: customer.name,
    username: customer.username ?? null,
    email: customer.email,
    role,
    isProductManager: role === PRODUCT_MANAGER_ROLE,
    isSalesManager: role === SALES_MANAGER_ROLE,
  };
};

export const signup = async (req, res) => {
  const { name, username, email, password, tax_id, address } = req.body;

  if (!name || !username || !email || !password) {
    return res.status(400).json({
      message: "Name, username, email and password are required",
    });
  }

  try {
    const existing = await pool.query(
      "SELECT customer_id, email, username FROM customers WHERE email = $1 OR username = $2",
      [email, username]
    );

    if (existing.rows.length > 0) {
      const duplicateUser = existing.rows[0];

      return res.status(409).json({
        message:
          duplicateUser.email === email
            ? "Email already registered"
            : "Username already taken",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO customers (name, username, email, password_hash, tax_id, address)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, username, email, passwordHash, tax_id || null, address || null]
    );

    res.status(201).json({
      message: "Signup successful",
      customer: toSafeCustomer(result.rows[0]),
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM customers WHERE email = $1",
      [email]
    );

    const customer = result.rows[0];

    if (!customer) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const passwordHash = customer.password_hash ?? "";

    if (!passwordHash.startsWith("$2")) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, passwordHash);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        customerId: customer.customer_id,
        email: customer.email,
        name: customer.name,
        role: normalizeRole(customer.role),
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      customer: toSafeCustomer(customer),
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
