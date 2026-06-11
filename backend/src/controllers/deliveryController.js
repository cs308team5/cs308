import pool from "../config/db.js";
import { normalizeDeliveryStatus } from "../utils/inputValidation.js";

export const updateDeliveryStatus = async (req, res) => {
  const { deliveryId } = req.params;
  const status = normalizeDeliveryStatus(req.body?.status);

  if (!status) {
    return res.status(400).json({
      success: false,
      message: "Invalid delivery status.",
    });
  }

  const isCompleted = status === "delivered";

  try {
    const orderCheck = await pool.query(
      `SELECT o.status FROM deliveries d JOIN orders o ON d.order_id = o.order_id WHERE d.delivery_id = $1`,
      [deliveryId]
    );

    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Delivery not found." });
    }

    if (orderCheck.rows[0].status === "cancelled") {
      return res.status(409).json({ success: false, message: "Cannot update status of a cancelled order." });
    }

    const result = await pool.query(
      `
      UPDATE deliveries
      SET status = $1,
          is_completed = $2
      WHERE delivery_id = $3
      RETURNING *
      `,
      [status, isCompleted, deliveryId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Delivery not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Delivery status updated successfully.",
      delivery: result.rows[0],
    });
  } catch (error) {
    console.error("Update delivery status error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update delivery status.",
      error: error.message,
    });
  }
};

export const getAllDeliveries = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        d.delivery_id,
        d.order_id,
        d.customer_id,
        d.delivery_address,
        d.status,
        d.is_completed,
        o.status AS order_status,
        o.total_price,
        o.created_at,
        COALESCE(c.username, c.name, 'Customer') AS customer_name,
        c.email AS customer_email,
        json_agg(json_build_object(
          'product_id', p.id,
          'name', p.name,
          'quantity', oi.quantity,
          'unit_price', oi.unit_price,
          'image_url', p.image_url
        ) ORDER BY p.name) AS items
      FROM deliveries d
      JOIN orders o ON d.order_id = o.order_id
      JOIN customers c ON d.customer_id = c.customer_id
      LEFT JOIN order_items oi ON o.order_id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      GROUP BY d.delivery_id, o.order_id, o.total_price, o.created_at, c.username, c.name, c.email
      ORDER BY o.created_at DESC`
    );

    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Get all deliveries error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load deliveries.",
    });
  }
};

export const getMyDeliveries = async (req, res) => {
  const { customerId } = req.params;
  const authenticatedCustomerId = req.customer?.customerId ?? req.customer?.customer_id;

  if (!authenticatedCustomerId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
  }

  if (customerId && String(authenticatedCustomerId) !== String(customerId)) {
    return res.status(403).json({
      success: false,
      message: "You can only view your own deliveries.",
    });
  }

  try {
    const result = await pool.query(
      `SELECT 
        d.delivery_id,
        d.order_id,
        d.delivery_address,
        d.status,
        d.is_completed,
        o.total_price,
        o.created_at,
        json_agg(json_build_object(
          'name', p.name,
          'quantity', oi.quantity,
          'unit_price', oi.unit_price,
          'image_url', p.image_url
        )) AS items
      FROM deliveries d
      JOIN orders o ON d.order_id = o.order_id
      JOIN order_items oi ON o.order_id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      WHERE d.customer_id = $1
      GROUP BY d.delivery_id, o.order_id, o.total_price, o.created_at
      ORDER BY o.created_at DESC`,
      [authenticatedCustomerId]
    );

    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Get my deliveries error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};
