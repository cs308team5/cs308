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

/*
 * Submit a rating for a product
 */
export const submitRating = async (req, res) => {
  const { id: product_id } = req.params;
  const { rating, user_id } = req.body;

  try {
    // 1. Validate input
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5"
      });
    }

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required"
      });
    }

    // 2. Check if product exists
    const productCheck = await pool.query(
      "SELECT id FROM products WHERE id = $1",
      [product_id]
    );

    if (productCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    // 3. Check if user already rated
    const existing = await pool.query(
      "SELECT * FROM ratings WHERE user_id = $1 AND product_id = $2",
      [user_id, product_id]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "You have already rated this product"
      });
    }

    // 4. Insert rating
    const result = await pool.query(
      "INSERT INTO ratings (user_id, product_id, rating) VALUES ($1, $2, $3) RETURNING *",
      [user_id, product_id, rating]
    );

    res.status(201).json({
      success: true,
      message: "Rating submitted successfully",
      data: result.rows[0]
    });

  } catch (error) {
    console.error("Error submitting rating:", error);

    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};