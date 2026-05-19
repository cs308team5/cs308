import pool from "../config/db.js";

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
        res.json({ success: true, product: result.rows[0] });
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
