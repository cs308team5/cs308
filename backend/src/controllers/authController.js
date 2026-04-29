import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";
import { isAdminCustomer } from "../utils/adminAccess.js";

const toSafeCustomer = (customer) => {
  const isAdmin = isAdminCustomer(customer);

  return {
    customerId: customer.customer_id,
    customer_id: customer.customer_id,
    name: customer.name,
    username: customer.username ?? null,
    email: customer.email,
    isAdmin,
    is_admin: isAdmin,
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
    let isMatch = false;

    if (passwordHash.startsWith("$2")) {
      isMatch = await bcrypt.compare(password, passwordHash);
    } else {
      isMatch = passwordHash === password;
    }

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        customerId: customer.customer_id,
        email: customer.email,
        name: customer.name,
        isAdmin: isAdminCustomer(customer),
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