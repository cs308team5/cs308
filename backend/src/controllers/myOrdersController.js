import pool from "../config/db.js";

export async function getMyOrders(req, res) {
  const customerId = req.customer.customerId;

  try {
    const result = await pool.query(
      `SELECT
         o.order_id,
         o.total_price,
         o.status,
         o.created_at,
         d.status        AS delivery_status,
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
