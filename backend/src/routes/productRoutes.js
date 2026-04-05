import express from "express";
import pool from "../config/db.js";

const router = express.Router();

router.get("/search", async (req, res) => {
  const query = req.query.q;

  if (!query) {
    return res.json([]);
  }

  try {
    const result = await pool.query(
      `
      SELECT * FROM products
      WHERE name ILIKE $1 OR description ILIKE $1
      LIMIT 10
      `,
      [`%${query}%`]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;