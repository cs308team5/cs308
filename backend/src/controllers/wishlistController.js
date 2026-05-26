import pool from "../config/db.js";

const getCustomerId = (req) =>
  req.body?.userId ?? req.body?.customerId ?? req.params?.userId ?? req.query?.userId;

const getProductId = (req) =>
  req.body?.productId ?? req.body?.product_id ?? req.params?.productId;

export const listWishlist = async (req, res) => {
  const userId = getCustomerId(req);

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: "userId is required",
    });
  }

  try {
    const result = await pool.query(
      `SELECT
         wi.id AS wishlist_id,
         wi.customer_id,
         wi.product_id,
         wi.created_at,
         p.*
       FROM wishlist_items wi
       JOIN products p ON p.id = wi.product_id
       WHERE wi.customer_id = $1
       ORDER BY wi.created_at DESC`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      data: result.rows.map((row) => ({
        id: row.wishlist_id,
        customer_id: row.customer_id,
        product_id: row.product_id,
        created_at: row.created_at,
        product: {
          id: row.product_id,
          name: row.name,
          description: row.description,
          price: row.price,
          category: row.category,
          image_url: row.image_url,
          stock_quantity: row.stock_quantity,
          model: row.model,
          serial_number: row.serial_number,
          warranty_status: row.warranty_status,
          distributor_information: row.distributor_information,
          additional_attributes: row.additional_attributes,
        },
      })),
    });
  } catch (error) {
    console.error("List wishlist error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const addToWishlist = async (req, res) => {
  const userId = getCustomerId(req);
  const productId = getProductId(req);

  if (!userId || !productId) {
    return res.status(400).json({
      success: false,
      message: "userId and productId are required",
    });
  }

  try {
    const productResult = await pool.query(
      "SELECT id FROM products WHERE id = $1",
      [productId]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const result = await pool.query(
      `INSERT INTO wishlist_items (customer_id, product_id)
       VALUES ($1, $2)
       ON CONFLICT (customer_id, product_id) DO NOTHING
       RETURNING *`,
      [userId, productId]
    );

    return res.status(result.rows.length > 0 ? 201 : 200).json({
      success: true,
      message: result.rows.length > 0
        ? "Product added to wishlist"
        : "Product is already in wishlist",
      data: result.rows[0] ?? null,
    });
  } catch (error) {
    console.error("Add to wishlist error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const removeFromWishlist = async (req, res) => {
  const userId = getCustomerId(req);
  const productId = getProductId(req);

  if (!userId || !productId) {
    return res.status(400).json({
      success: false,
      message: "userId and productId are required",
    });
  }

  try {
    const result = await pool.query(
      `DELETE FROM wishlist_items
       WHERE customer_id = $1 AND product_id = $2
       RETURNING id`,
      [userId, productId]
    );

    return res.status(200).json({
      success: true,
      message: result.rows.length > 0
        ? "Product removed from wishlist"
        : "Product was not in wishlist",
    });
  } catch (error) {
    console.error("Remove from wishlist error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
