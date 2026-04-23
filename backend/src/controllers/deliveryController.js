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
