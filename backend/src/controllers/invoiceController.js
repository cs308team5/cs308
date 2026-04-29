import PDFDocument from "pdfkit";
import pool from "../config/db.js";
import { sendEmail } from "../services/emailService.js";

function buildInvoiceBufferFromPayload(order) {
  const normalizedOrder = {
    order_id: order.invoiceNumber || `INV-${Date.now()}`,
    created_at: order.date || new Date().toISOString(),
    status: "confirmed",
    total_price: order.total,
    shipping_amount: Number(order.shippingCost) || 0,
    tax_amount: Number(order.tax) || 0,
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
    const headerY = doc.y;
    doc.fontSize(26).font("Helvetica-Bold").text("DARE", 50, headerY, {
      align: "left",
      width: 200,
    });
    doc.fontSize(26).font("Helvetica-Bold").text("INVOICE", 300, headerY, {
      align: "right",
      width: 250,
    });
    doc.y = headerY + 40;
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
    const billToX = 50;
    const billToY = doc.y;
    doc.fontSize(12).font("Helvetica-Bold").text("Bill To:", billToX, billToY);
    doc
      .fontSize(10)
      .font("Helvetica")
      .text(order.name, billToX)
      .text(order.email, billToX);
    doc.text(`Billing Address: ${order.address || "N/A"}`, billToX);
    doc.text(
      `Delivery Address: ${order.delivery_address || order.address || "N/A"}`,
      billToX
    );
    if (order.tax_id) {
      doc.text(`Tax ID: ${order.tax_id}`);
    }

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

    // --- Divider + Totals ---
    doc.moveTo(50, rowY + 5).lineTo(550, rowY + 5).stroke();
    rowY += 15;

    const itemsSubtotal = items.reduce(
      (sum, item) => sum + Number(item.quantity) * Number(item.unit_price),
      0
    );
    const totalAmount = Number(order.total_price) || 0;

    let shippingAmount = Number(order.shipping_amount);
    let taxAmount = Number(order.tax_amount);

    if (!Number.isFinite(shippingAmount) || shippingAmount < 0) {
      shippingAmount = 0;
    }
    if (!Number.isFinite(taxAmount) || taxAmount < 0) {
      taxAmount = 0;
    }

    // Fallback for records that only have total_price stored.
    if (shippingAmount === 0 && taxAmount === 0 && totalAmount >= itemsSubtotal) {
      const extraAmount = totalAmount - itemsSubtotal;
      const estimatedShipping = Math.min(15, extraAmount);
      const estimatedTax = Math.max(extraAmount - estimatedShipping, 0);
      shippingAmount = estimatedShipping;
      taxAmount = estimatedTax;
    }

    doc
      .fontSize(10)
      .font("Helvetica")
      .text("Subtotal:", colUnitPrice, rowY)
      .text(`$${itemsSubtotal.toFixed(2)}`, colTotal, rowY);
    rowY += 16;

    doc
      .fontSize(10)
      .font("Helvetica")
      .text("Shipping:", colUnitPrice, rowY)
      .text(`$${shippingAmount.toFixed(2)}`, colTotal, rowY);
    rowY += 16;

    doc
      .fontSize(10)
      .font("Helvetica")
      .text("Tax:", colUnitPrice, rowY)
      .text(`$${taxAmount.toFixed(2)}`, colTotal, rowY);
    rowY += 18;

    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .text("Total:", colUnitPrice, rowY)
      .text(`$${totalAmount.toFixed(2)}`, colTotal, rowY);

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
              c.name, c.email, c.tax_id, c.address,
              d.delivery_address
       FROM orders o
       JOIN customers c ON o.customer_id = c.customer_id
       LEFT JOIN deliveries d ON d.order_id = o.order_id
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
    const emailResult = await sendInvoiceEmailForOrder(orderId, customerId);
    return res.status(200).json({
      success: true,
      message: "Invoice email has been sent successfully. Please check your inbox.",
      previewUrl: emailResult.previewUrl,
    });
  } catch (error) {
    console.error("Invoice email error:", error);
    return res.status(500).json({
      message: "Failed to send the invoice email.",
      error: error.message,
      stack: error.stack,
    });
  }
};

export async function sendInvoiceEmailForOrder(orderId, customerId, options = {}) {
  const data = await fetchOrderData(orderId, customerId);
  if (!data) {
    const notFoundError = new Error("Order not found.");
    notFoundError.status = 404;
    throw notFoundError;
  }

  const pdfBuffer = await buildInvoiceBuffer(data.order, data.items);
  const recipient = options.recipientEmail?.trim() || data.order.email;

  const emailResult = await sendEmail({
    to: recipient,
    subject: "Your Invoice from Dare",
    text: `Hello ${data.order.name},\n\nThank you for your order.\nYour invoice is attached as a PDF.\n\nIf you need any help with your order, just reply to this email and our team will assist you.\n\nBest regards,\nDare Team`,
    html: `<p>Hello ${data.order.name},</p>
         <p>Thank you for your order.</p>
         <p>Your invoice is attached as a PDF.</p>
         <p>If you need any help with your order, just reply to this email and our team will assist you.</p>
         <p>Best regards,<br/>Dare Team</p>`,
    attachments: [
      {
        filename: `invoice-${data.order.order_id}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });

  await saveInvoiceRecord(orderId, customerId, data.order.total_price);
  return emailResult;
}

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
      subject: "Your Invoice from Dare",
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
