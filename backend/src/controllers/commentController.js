import pool from "../config/db.js";

export const submitComment = async (req, res) => {
  const { productId, text } = req.body;
  const userId = req.customer?.customerId;

  if (!productId || !text || !text.trim()) {
    return res.status(400).json({ message: "productId and text are required." });
  }

  try {
    const productCheck = await pool.query(
      "SELECT id FROM products WHERE id = $1",
      [productId]
    );

    if (productCheck.rows.length === 0) {
      return res.status(404).json({ message: "Product not found." });
    }

    const result = await pool.query(
      `INSERT INTO comments (user_id, product_id, text, status, created_at)
       VALUES ($1, $2, $3, 'pending', NOW())
       RETURNING id, user_id, product_id, text, status, created_at`,
      [userId, productId, text.trim()]
    );

    return res.status(201).json({
      success: true,
      message: "Comment submitted and is pending approval.",
      data: result.rows[0],
    });

  } catch (error) {
    console.error("Submit comment error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};