import PDFDocument from "pdfkit";
import pool from "../config/db.js";

export const generateInvoice = async (req, res) => {
    const { orderId } = req.params;
    const customerId = req.customer.customerId;

    try {
        // 1. Fetch order and verify it belongs to this customer
        const orderResult = await pool.query(
            `SELECT o.order_id, o.total_price, o.status, o.created_at,
              c.name, c.email, c.tax_id, c.address
       FROM orders o
       JOIN customers c ON o.customer_id = c.customer_id
       WHERE o.order_id = $1 AND o.customer_id = $2`,
            [orderId, customerId]
        );

        if (orderResult.rows.length === 0) {
            return res.status(404).json({ message: "Order not found." });
        }

        const order = orderResult.rows[0];

        // 2. Fetch order items with product names
        const itemsResult = await pool.query(
            `SELECT oi.quantity, oi.unit_price,
              p.name AS product_name
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = $1`,
            [orderId]
        );

        const items = itemsResult.rows;

        // 3. Generate PDF
        const doc = new PDFDocument({ margin: 50 });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename=invoice-${orderId}.pdf`
        );

        doc.pipe(res);

        // --- Header ---
        doc.fontSize(24).font("Helvetica-Bold").text("INVOICE", { align: "right" });
        doc.moveDown(0.5);
        doc
            .fontSize(10)
            .font("Helvetica")
            .text(`Invoice #: ${order.order_id}`, { align: "right" })
            .text(`Date: ${new Date(order.created_at).toLocaleDateString()}`, {
                align: "right",
            })
            .text(`Status: ${order.status}`, { align: "right" });

        doc.moveDown(1.5);

        // --- Bill To ---
        doc.fontSize(12).font("Helvetica-Bold").text("Bill To:");
        doc
            .fontSize(10)
            .font("Helvetica")
            .text(order.name)
            .text(order.email)
            .text(order.address || "N/A")
            .text(order.tax_id ? `Tax ID: ${order.tax_id}` : "");

        doc.moveDown(1.5);

        // --- Table Header ---
        const tableTop = doc.y;
        const colProduct = 50;
        const colQty = 320;
        const colUnitPrice = 390;
        const colTotal = 470;

        doc.fontSize(10).font("Helvetica-Bold");
        doc.text("Product", colProduct, tableTop);
        doc.text("Qty", colQty, tableTop);
        doc.text("Unit Price", colUnitPrice, tableTop);
        doc.text("Total", colTotal, tableTop);

        doc
            .moveTo(50, tableTop + 15)
            .lineTo(550, tableTop + 15)
            .stroke();

        // --- Table Rows ---
        let rowY = tableTop + 25;
        doc.font("Helvetica").fontSize(10);

        for (const item of items) {
            const lineTotal = (item.quantity * parseFloat(item.unit_price)).toFixed(2);

            doc.text(item.product_name, colProduct, rowY, { width: 250 });
            doc.text(String(item.quantity), colQty, rowY);
            doc.text(`$${parseFloat(item.unit_price).toFixed(2)}`, colUnitPrice, rowY);
            doc.text(`$${lineTotal}`, colTotal, rowY);

            rowY += 20;
        }

        // --- Divider + Total ---
        doc.moveTo(50, rowY + 5).lineTo(550, rowY + 5).stroke();
        rowY += 15;

        doc
            .fontSize(11)
            .font("Helvetica-Bold")
            .text("Total:", colUnitPrice, rowY)
            .text(`$${parseFloat(order.total_price).toFixed(2)}`, colTotal, rowY);

        // --- Footer ---
        doc.moveDown(3);
        doc
            .fontSize(9)
            .font("Helvetica")
            .fillColor("gray")
            .text("Thank you for your order.", { align: "center" });

        // 4. Save invoice record to database
        await pool.query(
            `INSERT INTO invoices (order_id, customer_id, generated_at, total_price)
            VALUES ($1, $2, NOW(), $3)`,
            [orderId, customerId, order.total_price]
        );

        doc.end();
    } catch (error) {
        console.error("Invoice generation error:", error);
        res.status(500).json({ message: "Server error" });
    }
};