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
    tax_id: customer.tax_id ?? null,
    address: customer.address ?? null,
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

export const updateProfile = async (req, res) => {
  const customerId = req.customer?.customerId || req.customer?.customer_id;
  const name = req.body.name?.trim();
  const email = req.body.email?.trim().toLowerCase();
  const taxId = req.body.tax_id?.trim();
  const address = req.body.address?.trim();

  if (!customerId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (!name || !email || !taxId || !address) {
    return res.status(400).json({
      message: "Name, email, tax ID, and home address are required",
    });
  }

  try {
    const duplicate = await pool.query(
      "SELECT customer_id FROM customers WHERE email = $1 AND customer_id <> $2",
      [email, customerId]
    );

    if (duplicate.rows.length > 0) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const result = await pool.query(
      `UPDATE customers
       SET name = $1,
           email = $2,
           tax_id = $3,
           address = $4
       WHERE customer_id = $5
       RETURNING *`,
      [name, email, taxId, address, customerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Customer not found" });
    }

    return res.json({
      message: "Profile updated successfully",
      customer: toSafeCustomer(result.rows[0]),
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
