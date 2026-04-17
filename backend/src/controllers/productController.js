import pool from "../config/db.js";


export const getProducts = async (req, res) => {
  const { q, attributes } = req.query;

  try {
    // 1. Start with a base query that always works
    let sqlQuery = "SELECT * FROM products WHERE 1=1";
    const params = [];

    // 2. Add Name Search if 'q' exists
    if (q && q.trim() !== "") {
      if (q.trim().length < 2) {
        return res.status(400).json({ message: "Searched product name must be at least 2 characters" });
      }
      params.push(`%${q.trim()}%`);
      sqlQuery += ` AND name ILIKE $${params.length}`;
    }

    // 3. Add Attribute Filters if 'attributes' exists
    if (attributes) {
      const attributeArray = attributes.split(",");
      attributeArray.forEach((attr) => {
        const parts = attr.split(":");
        if (parts.length === 2) {
          const key = parts[0].trim();
          const value = parts[1].trim();
          params.push(`%${value}%`);
          sqlQuery += ` AND additional_attributes->>'${key}' ILIKE $${params.length}`;
        }
      });
    }

    // 4. Always apply the same ordering
    sqlQuery += " ORDER BY created_at DESC";

    const result = await pool.query(sqlQuery, params);
    res.status(200).json(result.rows);

  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: "Server error" });
  }
};