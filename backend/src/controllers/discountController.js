import pool from "../config/db.js";
import { sendEmail } from "../services/emailService.js";

async function notifyWishlistUsers(product) {
    const { rows } = await pool.query(
        `SELECT c.email, c.name
         FROM wishlist_items w
         JOIN customers c ON c.customer_id = w.customer_id
         WHERE w.product_id = $1`,
        [product.id]
    );

    if (rows.length === 0) return;

    const discountPct = Math.round(Number(product.discount_rate) * 100);
    const originalPrice = Number(product.price).toFixed(2);
    const discountedPrice = Number(product.discounted_price).toFixed(2);

    for (const user of rows) {
        await sendEmail({
            to: user.email,
            subject: `Price drop on "${product.name}" — ${discountPct}% off!`,
            html: `
                <p>Hi ${user.name},</p>
                <p>Great news! A product on your wishlist just got a discount:</p>
                <table style="border-collapse:collapse;margin:16px 0;">
                    <tr>
                        <td style="padding:8px 16px 8px 0;font-weight:600;">${product.name}</td>
                        <td style="padding:8px 0;">
                            <span style="text-decoration:line-through;opacity:0.5;margin-right:8px;">$${originalPrice}</span>
                            <span style="color:#dc2626;font-weight:700;">$${discountedPrice}</span>
                            <span style="color:#dc2626;font-size:0.85em;margin-left:6px;">(${discountPct}% off)</span>
                        </td>
                    </tr>
                </table>
                <p>Don't miss out — head over to the store and grab it before it's gone!</p>
                <p>— The Dare Team</p>
            `,
        });
    }
}

export const setDiscount = async (req, res) => {
    const { id } = req.params;
    const { discount_rate } = req.body;

    if (discount_rate === undefined || discount_rate === null) {
        return res.status(400).json({ success: false, message: "discount_rate is required." });
    }

    const rate = parseFloat(discount_rate);
    if (isNaN(rate) || rate < 0 || rate >= 1) {
        return res.status(400).json({ success: false, message: "discount_rate must be between 0 (inclusive) and 1 (exclusive)." });
    }

    try {
        const result = await pool.query(
            `UPDATE products
             SET discount_rate = $1::real,
                 discounted_price = ROUND(price * (1 - $1::numeric), 2)
             WHERE id = $2
             RETURNING id, name, price, discount_rate, discounted_price`,
            [rate, id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: "Product not found." });
        }

        const product = result.rows[0];
        res.json({ success: true, product });

        // Notify wishlist users after responding — errors are non-fatal
        notifyWishlistUsers(product).catch(err =>
            console.error("Wishlist notification error:", err)
        );
    } catch (err) {
        console.error("setDiscount error:", err);
        res.status(500).json({ success: false, message: "Server error." });
    }
};

export const removeDiscount = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            `UPDATE products
             SET discount_rate = NULL, discounted_price = NULL
             WHERE id = $1
             RETURNING id, name, price, discount_rate, discounted_price`,
            [id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: "Product not found." });
        }
        res.json({ success: true, product: result.rows[0] });
    } catch (err) {
        console.error("removeDiscount error:", err);
        res.status(500).json({ success: false, message: "Server error." });
    }
};

export const getDiscountedProducts = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, name, price, discount_rate, discounted_price, image_url, category
             FROM products
             ORDER BY name`
        );
        res.json({ success: true, products: result.rows });
    } catch (err) {
        console.error("getDiscountedProducts error:", err);
        res.status(500).json({ success: false, message: "Server error." });
    }
};
