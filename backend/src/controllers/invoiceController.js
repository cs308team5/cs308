import PDFDocument from "pdfkit";
import pool from "../config/db.js";
import { sendEmail } from "../services/emailService.js";

function buildInvoiceBufferFromPayload(order) {
  const normalizedOrder = {
    order_id: order.invoiceNumber || `INV-${Date.now()}`,
    created_at: order.date || new Date().toISOString(),
    status: "confirmed",
    total_price: order.total,
    name: order.shipping?.fullName || "Customer",
    email: order.shipping?.email,
    address: [
      order.shipping?.street,
      order.shipping?.city,
      order.shipping?.state,
      order.shipping?.zip,
      order.shipping?.country,
    ]
      .filter(Boolean)
      .join(", "),
    tax_id: null,
  };

  const normalizedItems = (order.items || []).map((item) => ({
    product_name: item.name,
    quantity: Number(item.quantity) || 1,
    unit_price: Number(item.price) || 0,
  }));

  return buildInvoiceBuffer(normalizedOrder, normalizedItems);
}

function buildInvoiceBuffer(order, items) {
  return new Promise((resolve, reject) => {
    const buffers = [];
    const doc = new PDFDocument({ margin: 50 });

    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

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
      if (rowY > 700) {
        doc.addPage();
        rowY = 50;
      }
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

    doc.end();
  });
}

async function saveInvoiceRecord(orderId, customerId, totalPrice) {
  const existing = await pool.query(
    `SELECT invoice_id FROM invoices WHERE order_id = $1`,
    [orderId]
  );

  if (existing.rows.length === 0) {
    await pool.query(
      `INSERT INTO invoices (order_id, customer_id, generated_at, total_price)
            VALUES ($1, $2, NOW(), $3)`,
      [orderId, customerId, totalPrice]
    );
  }
}

async function fetchOrderData(orderId, customerId) {
  const orderResult = await pool.query(
    `SELECT o.order_id, o.total_price, o.status, o.created_at,
              c.name, c.email, c.tax_id, c.address
       FROM orders o
       JOIN customers c ON o.customer_id = c.customer_id
       WHERE o.order_id = $1 AND o.customer_id = $2`,
    [orderId, customerId]
  );

  if (orderResult.rows.length === 0) {
    return null;
  }

  const itemsResult = await pool.query(
    `SELECT oi.quantity, oi.unit_price,
              p.name AS product_name
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = $1`,
    [orderId]
  );

  return {
    order: orderResult.rows[0],
    items: itemsResult.rows,
  };
}

export const generateInvoice = async (req, res) => {
  const { orderId } = req.params;
  const customerId = req.customer.customerId;

  try {
    const data = await fetchOrderData(orderId, customerId);
    if (!data) {
      return res.status(404).json({ message: "Order not found." });
    }

    const pdfBuffer = await buildInvoiceBuffer(data.order, data.items);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=invoice-${orderId}.pdf`
    );

    await saveInvoiceRecord(orderId, customerId, data.order.total_price);
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Invoice generation error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const sendInvoiceEmail = async (req, res) => {
  const { orderId } = req.params;
  const customerId = req.customer.customerId;

  try {
    const data = await fetchOrderData(orderId, customerId);
    if (!data) {
      return res.status(404).json({ message: "Order not found." });
    }

    const pdfBuffer = await buildInvoiceBuffer(data.order, data.items);
    const recipient = data.order.email;

    console.log("before sendEmail");

const emailResult = await sendEmail({
  to: recipient,
  subject: `Your Invoice for Order ${data.order.order_id}`,
  text: `Hello ${data.order.name},\n\nYour invoice for order ${data.order.order_id} is attached to this email.\n\nIf you have any questions, please reply to this message.\n\nThank you for your purchase.`,
  html: `<p>Hello ${data.order.name},</p>
         <p>Your invoice for order <strong>${data.order.order_id}</strong> is attached to this email.</p>
         <p>If you have any questions, please reply to this message.</p>
         <p>Thank you for your purchase.</p>`,
  attachments: [
    {
      filename: `invoice-${data.order.order_id}.pdf`,
      content: pdfBuffer,
      contentType: "application/pdf",
    },
  ],
});

console.log("after sendEmail", emailResult);
    await saveInvoiceRecord(orderId, customerId, data.order.total_price);

    return res.status(200).json({
      success: true,
      message: "Invoice email has been sent successfully. Please check your inbox.",
      previewUrl: emailResult.previewUrl,
    });
  }catch (error) {
  console.error("Invoice email error:", error);
  return res.status(500).json({
    message: "Failed to send the invoice email.",
    error: error.message,
    stack: error.stack,
  });
}
};

export const sendInvoicePreviewEmail = async (req, res) => {
  const { order } = req.body;

  if (!order?.shipping?.email) {
    return res.status(400).json({ message: "Recipient email is required." });
  }

  if (!Array.isArray(order.items) || order.items.length === 0) {
    return res.status(400).json({ message: "Invoice items are required." });
  }

  try {
    const pdfBuffer = await buildInvoiceBufferFromPayload(order);

    const emailResult = await sendEmail({
      to: order.shipping.email,
      subject: `Your Invoice ${order.invoiceNumber || ""}`.trim(),
      text: `Hello ${order.shipping.fullName || "Customer"},\n\nYour invoice is attached to this email.\n\nThank you for your purchase.`,
      html: `<p>Hello ${order.shipping.fullName || "Customer"},</p><p>Your invoice is attached to this email.</p><p>Thank you for your purchase.</p>`,
      attachments: [
        {
          filename: `${order.invoiceNumber || "invoice"}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    return res.status(200).json({
      success: true,
      message: "Invoice email sent successfully.",
      previewUrl: emailResult.previewUrl,
    });
  } catch (error) {
    console.error("Preview invoice email error:", error);
    return res.status(500).json({
      message: "Failed to send invoice email.",
      error: error.message,
    });
  }
};
