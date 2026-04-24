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

// Tüm pending yorumları getir (admin için)
export const getPendingComments = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.id, c.text, c.status, c.created_at,
              c.product_id, p.name AS product_name,
              c.user_id,
              COALESCE(cu.username, cu.name, 'Customer') AS author_name
       FROM comments c
       JOIN products p ON c.product_id = p.id
       LEFT JOIN customers cu ON c.user_id = cu.customer_id
       WHERE c.status = 'pending'
       ORDER BY c.created_at ASC`
    );
    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Get pending comments error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

// Yorumu onayla veya reddet (admin için)
export const updateCommentStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // "approved" veya "rejected"

  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({ message: "Status must be 'approved' or 'rejected'." });
  }

  try {
    const result = await pool.query(
      `UPDATE comments SET status = $1 WHERE id = $2
       RETURNING id, status`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Comment not found." });
    }

    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("Update comment status error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};