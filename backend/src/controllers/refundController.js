import pool from "../config/db.js";
import { sendEmail } from "../services/emailService.js";

async function notifyRefundApproved(refund) {
  if (!refund.customer_email) return;

  const productName = refund.product_name || `Product #${refund.product_id}`;
  const refundedAmount = (Number(refund.unit_price) * Number(refund.quantity)).toFixed(2);

  await sendEmail({
    to: refund.customer_email,
    subject: `Refund approved for ${productName}`,
    html: `
      <p>Hi ${refund.customer_name || "there"},</p>
      <p>Your refund request for <strong>${productName}</strong> has been approved.</p>
      <p><strong>Refund amount:</strong> $${refundedAmount}</p>
      <p>The returned item has been added back to store stock.</p>
      <p>- The Dare Team</p>
    `,
  });
}

// POST /api/refunds
export async function requestRefund(req, res) {
  const customerId = req.customer.customerId;
  const { order_id, product_id, reason } = req.body;

  if (!order_id || !product_id) {
    return res.status(400).json({ success: false, message: "order_id and product_id are required." });
  }

  try {
    const orderResult = await pool.query(
      "SELECT order_id, created_at FROM orders WHERE order_id = $1 AND customer_id = $2",
      [order_id, customerId]
    );
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    const daysSincePurchase =
      (Date.now() - new Date(orderResult.rows[0].created_at).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSincePurchase > 30) {
      return res.status(400).json({
        success: false,
        message: "Refund requests must be submitted within 30 days of purchase.",
      });
    }

    const itemResult = await pool.query(
      "SELECT quantity, unit_price FROM order_items WHERE order_id = $1 AND product_id = $2",
      [order_id, product_id]
    );
    if (itemResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Product not found in this order." });
    }

    const existing = await pool.query(
      "SELECT refund_id FROM refund_requests WHERE order_id = $1 AND product_id = $2 AND status != 'rejected'",
      [order_id, product_id]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: "A refund request already exists for this item." });
    }

    const { quantity, unit_price } = itemResult.rows[0];
    const insert = await pool.query(
      `INSERT INTO refund_requests (order_id, customer_id, product_id, quantity, unit_price, reason, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING *`,
      [order_id, customerId, product_id, quantity, unit_price, reason || null]
    );

    res.status(201).json({ success: true, refund: insert.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// GET /api/refunds/my-refunds
export async function getMyRefunds(req, res) {
  const customerId = req.customer.customerId;

  try {
    const result = await pool.query(
      `SELECT r.refund_id, r.order_id, r.product_id, r.quantity, r.unit_price,
              r.reason, r.status, r.requested_at, r.reviewed_at,
              p.name AS product_name, p.image_url AS product_image
       FROM refund_requests r
       JOIN products p ON p.id = r.product_id
       WHERE r.customer_id = $1
       ORDER BY r.requested_at DESC`,
      [customerId]
    );
    res.json({ success: true, refunds: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// GET /api/refunds  (admin)
export async function getAllRefunds(req, res) {
  try {
    const result = await pool.query(
      `SELECT r.refund_id, r.order_id, r.product_id, r.quantity, r.unit_price,
              r.reason, r.status, r.requested_at, r.reviewed_at,
              c.name AS customer_name, c.email AS customer_email,
              p.name AS product_name, p.image_url AS product_image
       FROM refund_requests r
       JOIN customers c ON c.customer_id = r.customer_id
       JOIN products p ON p.id = r.product_id
       ORDER BY r.requested_at DESC`
    );
    res.json({ success: true, refunds: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// PATCH /api/refunds/:refundId  (admin)
// Valid transitions: pending → received, received → approved | rejected
export async function reviewRefund(req, res) {
  const { refundId } = req.params;
  const { status } = req.body;
  const adminId = req.customer.customerId;

  const VALID_STATUSES = ["received", "approved", "rejected"];
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ success: false, message: "Status must be 'received', 'approved', or 'rejected'." });
  }

  try {
    const refundResult = await pool.query(
      `SELECT r.*,
              c.email AS customer_email,
              c.name AS customer_name,
              p.name AS product_name
       FROM refund_requests r
       JOIN customers c ON c.customer_id = r.customer_id
       LEFT JOIN products p ON p.id = r.product_id
       WHERE r.refund_id = $1`,
      [refundId]
    );
    if (refundResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Refund request not found." });
    }

    const refund = refundResult.rows[0];

    const ALLOWED_TRANSITIONS = {
      pending:  ["received"],
      received: ["approved", "rejected"],
    };

    const allowed = ALLOWED_TRANSITIONS[refund.status] ?? [];
    if (!allowed.includes(status)) {
      return res.status(409).json({
        success: false,
        message: `Cannot transition from '${refund.status}' to '${status}'.`,
      });
    }

    await pool.query(
      "UPDATE refund_requests SET status = $1, reviewed_at = NOW(), reviewed_by = $2 WHERE refund_id = $3",
      [status, adminId, refundId]
    );

    if (status === "approved") {
      await pool.query(
        "UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id = $2",
        [refund.quantity, refund.product_id]
      );
    }

    res.json({ success: true, message: `Refund marked as ${status}.` });

    if (status === "approved") {
      notifyRefundApproved(refund).catch((err) =>
        console.error("Refund approval notification error:", err)
      );
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}
