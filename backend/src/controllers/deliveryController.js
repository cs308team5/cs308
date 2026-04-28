import pool from "../config/db.js";

export const updateDeliveryStatus = async (req, res) => {
  const { deliveryId } = req.params;
  const { status } = req.body;

  const allowedStatuses = ["processing", "in-transit", "delivered"];

  if (!status || !allowedStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid delivery status.",
    });
  }

  const isCompleted = status === "delivered";

  try {
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

export const getMyDeliveries = async (req, res) => {
  const { customerId } = req.params;

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
      [customerId]
    );

    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Get my deliveries error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};
