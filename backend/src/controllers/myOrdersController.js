import pool from "../config/db.js";

export async function getMyOrders(req, res) {
  const customerId = req.customer?.customerId ?? req.customer?.customer_id;

  if (!customerId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
  }

  try {
    const result = await pool.query(
      `SELECT
         o.order_id,
         o.total_price,
         o.status,
         o.created_at,
         CASE WHEN o.status = 'cancelled' THEN o.status ELSE d.status END AS delivery_status,
         d.delivery_address,
         d.is_completed,
         json_agg(json_build_object(
           'product_id', oi.product_id,
           'quantity',   oi.quantity,
           'unit_price', oi.unit_price,
           'name',       p.name,
           'image',      p.image_url
         )) AS items
       FROM orders o
       LEFT JOIN deliveries  d  ON d.order_id  = o.order_id
       LEFT JOIN order_items oi ON oi.order_id = o.order_id
       LEFT JOIN products    p  ON p.id        = oi.product_id
       WHERE o.customer_id = $1
       GROUP BY o.order_id, d.status, d.delivery_address, d.is_completed
       ORDER BY o.created_at DESC`,
      [customerId]
    );

    res.json({ success: true, orders: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function cancelMyOrder(req, res) {
  const customerId = req.customer?.customerId ?? req.customer?.customer_id;
  const { orderId } = req.params;

  if (!customerId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const orderResult = await client.query(
      `SELECT o.order_id, o.status, d.status AS delivery_status, d.is_completed
         FROM orders o
         LEFT JOIN deliveries d ON d.order_id = o.order_id
        WHERE o.order_id = $1 AND o.customer_id = $2
        FOR UPDATE OF o`,
      [orderId, customerId]
    );

    const order = orderResult.rows[0];

    if (!order) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    if (order.status === "cancelled") {
      await client.query("ROLLBACK");
      return res.status(409).json({
        success: false,
        message: "Order is already cancelled.",
      });
    }

    if (
      order.is_completed ||
      ["in-transit", "delivered"].includes(String(order.delivery_status ?? ""))
    ) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        success: false,
        message: "Only processing orders can be cancelled.",
      });
    }

    const itemsResult = await client.query(
      "SELECT product_id, quantity FROM order_items WHERE order_id = $1",
      [orderId]
    );

    for (const item of itemsResult.rows) {
      await client.query(
        "UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id = $2",
        [item.quantity, item.product_id]
      );
    }

    const updateResult = await client.query(
      `UPDATE orders
          SET status = 'cancelled'
        WHERE order_id = $1
        RETURNING order_id, status`,
      [orderId]
    );

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "Order cancelled successfully.",
      order: updateResult.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Cancel order error:", error);
    return res.status(500).json({
      success: false,
      message: "Could not cancel order.",
    });
  } finally {
    client.release();
  }
}
