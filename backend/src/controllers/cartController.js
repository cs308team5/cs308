import pool from "../config/db.js";

const getAuthenticatedCustomerId = (req) =>
  req.customer?.customerId ?? req.customer?.customer_id;

export const getCart = async (req, res) => {
  const userId = getAuthenticatedCustomerId(req);

  if (!userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const result = await pool.query(
      `SELECT ci.id,
              ci.customer_id,
              ci.product_id,
              ci.quantity,
              p.name,
              p.description,
              p.price,
              p.discounted_price,
              p.image_url,
              p.stock_quantity
         FROM cart_items ci
         JOIN products p ON p.id = ci.product_id
        WHERE ci.customer_id = $1
        ORDER BY ci.id ASC`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Get cart error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const addToCart = async (req, res) => {
  const userId = getAuthenticatedCustomerId(req);
  const { productId } = req.body;
  const quantity = Number(req.body.quantity ?? 1);

  if (!userId) {
    return res.status(401).json({
      message: "Authentication required",
    });
  }

  if (!productId) {
    return res.status(400).json({
      message: "productId is required",
    });
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    return res.status(400).json({
      message: "Quantity must be a positive whole number",
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
      if (existing.quantity + quantity > product.stock_quantity) {
        return res.status(400).json({
          message: "No more stock available for this item",
        });
      }

      await pool.query(
        `UPDATE cart_items
         SET quantity = quantity + $1
         WHERE id = $2`,
        [quantity, existing.id]
      );
    } else {
      if (quantity > product.stock_quantity) {
        return res.status(400).json({
          message: "No more stock available for this item",
        });
      }

      await pool.query(
        `INSERT INTO cart_items (customer_id, product_id, quantity)
         VALUES ($1, $2, $3)`,
        [userId, productId, quantity]
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

export const updateCartQuantity = async (req, res) => {
  const userId = getAuthenticatedCustomerId(req);
  const { cartItemId } = req.params;
  const quantity = Number(req.body.quantity);

  if (!userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    return res.status(400).json({ message: "Quantity must be a positive whole number" });
  }

  try {
    const existingResult = await pool.query(
      `SELECT ci.id, ci.product_id, p.stock_quantity
         FROM cart_items ci
         JOIN products p ON p.id = ci.product_id
        WHERE ci.id = $1 AND ci.customer_id = $2`,
      [cartItemId, userId]
    );

    const existing = existingResult.rows[0];

    if (!existing) {
      return res.status(404).json({ message: "Cart item not found" });
    }

    if (quantity > existing.stock_quantity) {
      return res.status(400).json({ message: "No more stock available for this item" });
    }

    const result = await pool.query(
      `UPDATE cart_items
          SET quantity = $1
        WHERE id = $2 AND customer_id = $3
        RETURNING id, product_id, quantity`,
      [quantity, cartItemId, userId]
    );

    return res.status(200).json({
      success: true,
      message: "Cart quantity updated",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Update cart quantity error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const removeFromCart = async (req, res) => {
  const userId = getAuthenticatedCustomerId(req);
  const { cartItemId } = req.params;

  if (!userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const result = await pool.query(
      `DELETE FROM cart_items
        WHERE id = $1 AND customer_id = $2
        RETURNING id`,
      [cartItemId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Cart item not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Cart item removed",
    });
  } catch (error) {
    console.error("Remove cart item error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
