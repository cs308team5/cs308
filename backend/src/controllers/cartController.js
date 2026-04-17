import pool from "../config/db.js";

export const addToCart = async (req, res) => {
  const { userId, productId } = req.body;

  if (!userId || !productId) {
    return res.status(400).json({
      message: "userId and productId are required",
    });
  }

  try {
    const productResult = await pool.query(
      "SELECT id, stock_quantity FROM products WHERE id = $1",
      [productId]
    );

    const product = productResult.rows[0];

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    if (product.stock_quantity <= 0) {
      return res.status(400).json({
        message: "Product is out of stock",
      });
    }

    const existingResult = await pool.query(
      `SELECT id, quantity
       FROM cart_items
       WHERE customer_id = $1 AND product_id = $2`,
      [userId, productId]
    );

    const existing = existingResult.rows[0];

    if (existing) {
      await pool.query(
        `UPDATE cart_items
         SET quantity = quantity + 1
         WHERE id = $1`,
        [existing.id]
      );
    } else {
      await pool.query(
        `INSERT INTO cart_items (customer_id, product_id, quantity)
         VALUES ($1, $2, 1)`,
        [userId, productId]
      );
    }

    return res.status(200).json({
      message: "Product added to cart",
    });
  } catch (error) {
    console.error("Add to cart error:", error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};