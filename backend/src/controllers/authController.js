import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";

export const signup = async (req, res) => {
  const { name, email, password, tax_id, address } = req.body;

  // 1. Validate
  if (!name || !email || !password) {
    return res.status(400).json({
      message: "Name, email and password are required",
    });
  }

  try {
    // 2. Check if user exists
    const existing = await pool.query(
      "SELECT * FROM customers WHERE email = $1",
      [email]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        message: "Email already registered",
      });
    }

    // 3. Hash password (required for login to work)
    const passwordHash = await bcrypt.hash(password, 10);

    // 4. Insert user
    const result = await pool.query(
      `INSERT INTO customers (name, email, password_hash, tax_id, address)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING customer_id, name, email`,
      [name, email, passwordHash, tax_id || null, address || null]
    );

    const customer = result.rows[0];

    // 5. Response
    res.status(201).json({
      message: "Signup successful",
      customer,
    });

  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  // 1. Alanlar dolu mu?
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    // 2. Kullanıcıyı veritabanında bul
    const result = await pool.query(
      "SELECT * FROM customers WHERE email = $1",
      [email]
    );

    const customer = result.rows[0];

    // 3. Kullanıcı var mı?
    if (!customer) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 4. Şifre doğru mu?
    const isMatch = await bcrypt.compare(password, customer.password_hash);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 5. JWT token oluştur (SCRUM-71)
    const token = jwt.sign(
      {
        customerId: customer.customer_id,
        email: customer.email,
        name: customer.name,
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    // 6. Başarılı response
    res.status(200).json({
      message: "Login successful",
      token,
      customer: {
        customerId: customer.customer_id,
        name: customer.name,
        email: customer.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};