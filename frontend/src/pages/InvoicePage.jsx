import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getCurrentUser } from "../services/authService.js";
import "./InvoicePage.css";

export default function InvoicePage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const previewFrameRef = useRef(null);
  const [invoicePreviewUrl, setInvoicePreviewUrl] = useState("");
  const [isInvoiceLoading, setIsInvoiceLoading] = useState(false);

  const order = state?.order ?? {
    invoiceNumber: "INV-20240410-8821",
    date: new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    items: [
      {
        id: 1,
        name: "Wireless Headphones",
        description: "Noise-cancelling, 30h battery",
        image: "https://placehold.co/80x80",
        quantity: 1,
        price: 199.0,
      },
      {
        id: 2,
        name: "USB-C Hub",
        description: "7-in-1 multiport adapter",
        image: "https://placehold.co/80x80",
        quantity: 2,
        price: 50.0,
      },
    ],
    shipping: {
      fullName: "John Doe",
      email: "john@example.com",
      phone: "+1 (555) 123-4567",
      street: "123 Main Street, Apt 4B",
      city: "New York",
      state: "NY",
      zip: "10001",
      country: "United States",
    },
    subtotal: 299.0,
    shippingCost: 15.0,
    tax: 24.92,
    total: 338.92,
  };

  const invoiceFileName = `${order.shipping.fullName || "customer"} - invoice`;

  useEffect(() => {
    return () => {
      if (invoicePreviewUrl) {
        URL.revokeObjectURL(invoicePreviewUrl);
      }
    };
  }, [invoicePreviewUrl]);

  const closeInvoicePreview = () => {
    setInvoicePreviewUrl("");
  };

  const fetchInvoiceUrl = async () => {
    const user = getCurrentUser();

    if (!user?.token || !order.invoiceNumber) {
      throw new Error("Invoice PDF is not available for this order.");
    }

    const response = await fetch(`/api/invoice/${order.invoiceNumber}`, {
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Invoice PDF could not be generated.");
    }

    const invoiceBlob = await response.blob();
    const invoiceFile = new File([invoiceBlob], `${invoiceFileName}.pdf`, {
      type: "application/pdf",
    });

    return URL.createObjectURL(invoiceFile);
  };

  const handlePreview = async () => {
    setIsInvoiceLoading(true);

    try {
      const invoiceUrl = await fetchInvoiceUrl();
      setInvoicePreviewUrl(invoiceUrl);
    } catch (error) {
      alert(error.message || "Invoice PDF could not be opened.");
    } finally {
      setIsInvoiceLoading(false);
    }
  };

  const printInvoiceUrl = (invoiceUrl) => {
    const originalTitle = document.title;
    const printFrame = document.createElement("iframe");

    printFrame.style.position = "fixed";
    printFrame.style.right = "0";
    printFrame.style.bottom = "0";
    printFrame.style.width = "0";
    printFrame.style.height = "0";
    printFrame.style.border = "0";
    printFrame.src = invoiceUrl;
    printFrame.onload = () => {
      document.title = invoiceFileName;
      printFrame.contentWindow?.focus();
      printFrame.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(printFrame);
        URL.revokeObjectURL(invoiceUrl);
        document.title = originalTitle;
      }, 60000);
    };

    document.body.appendChild(printFrame);
  };

  const handlePrint = async () => {
    try {
      const invoiceUrl = await fetchInvoiceUrl();
      printInvoiceUrl(invoiceUrl);
    } catch (error) {
      alert(error.message || "Invoice PDF could not be printed.");
    }
  };

  const handlePrintPreview = () => {
    const originalTitle = document.title;
    const frameWindow = previewFrameRef.current?.contentWindow;

    if (!frameWindow) {
      alert("Invoice preview is not ready yet.");
      return;
    }

    document.title = invoiceFileName;
    frameWindow.focus();
    frameWindow.print();

    setTimeout(() => {
      document.title = originalTitle;
    }, 60000);
  };

  return (
    <div className="invoice-container">
      <div className="success-banner">
        <div className="success-icon">✓</div>
        <div>
          <h1>Payment Successful!</h1>
          <p>
            Your order has been placed. A confirmation has been sent to{" "}
            <strong>{order.shipping.email}</strong>
          </p>
        </div>
        <button className="preview-btn" onClick={handlePreview} disabled={isInvoiceLoading}>
          {isInvoiceLoading ? "Preparing..." : "Preview Invoice"}
        </button>
        <button className="print-btn" onClick={handlePrint}>
          🖨 Print Invoice
        </button>
      </div>

      <div className="invoice-content">
        <div className="invoice-left">
          <div className="card">
            <div className="card-header">
              <div className="icon">🧾</div>
              <div>
                <h2>Invoice</h2>
                <p>{order.invoiceNumber}</p>
              </div>
              <div className="invoice-date">
                <span>Date</span>
                <strong>{order.date}</strong>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="icon">📦</div>
              <div>
                <h2>Items Ordered</h2>
                <p>{order.items.length} product{order.items.length !== 1 ? "s" : ""}</p>
              </div>
            </div>

            {order.items.map((item) => (
              <div className="invoice-item" key={item.id}>
                <img src={item.image} alt={item.name} />
                <div className="item-details">
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                  <span className="qty-badge">Qty: {item.quantity}</span>
                </div>
                <div className="item-price">
                  ${(item.price * item.quantity).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-header">
              <div className="icon">📍</div>
              <div>
                <h2>Shipping Address</h2>
                <p>Delivery destination</p>
              </div>
            </div>

            <div className="address-grid">
              <div className="address-field">
                <label>Full Name</label>
                <span>{order.shipping.fullName}</span>
              </div>
              <div className="address-field">
                <label>Email</label>
                <span>{order.shipping.email}</span>
              </div>
              <div className="address-field">
                <label>Phone</label>
                <span>{order.shipping.phone}</span>
              </div>
              <div className="address-field full-width">
                <label>Street Address</label>
                <span>{order.shipping.street}</span>
              </div>
              <div className="address-field">
                <label>City</label>
                <span>{order.shipping.city}</span>
              </div>
              <div className="address-field">
                <label>State / ZIP</label>
                <span>
                  {order.shipping.state}, {order.shipping.zip}
                </span>
              </div>
              <div className="address-field">
                <label>Country</label>
                <span>{order.shipping.country}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="invoice-right">
          <p className="invoice-summary-label">Confirmed</p>
          <h2>Order Summary</h2>

          <div className="summary-row">
            <span>Subtotal</span>
            <span>${order.subtotal.toFixed(2)}</span>
          </div>

          <div className="summary-row">
            <span>Shipping</span>
            <span>${order.shippingCost.toFixed(2)}</span>
          </div>

          <div className="summary-row">
            <span>Tax</span>
            <span>${order.tax.toFixed(2)}</span>
          </div>

          <hr />

          <div className="total">
            <span>Total</span>
            <span>${order.total.toFixed(2)}</span>
          </div>

          <div className="status-badge">
            <span className="dot" /> Payment Confirmed
          </div>

          <button className="continue-btn" onClick={() => navigate("/")}>
            Continue Shopping
          </button>

          <div className="extra">
            <p>🔒 Secure 256-bit SSL encryption</p>
            <p>🛡 30-day money-back guarantee</p>
            <p>📬 Estimated delivery: 3-5 business days</p>
          </div>
        </div>
      </div>

      {invoicePreviewUrl && (
        <div className="invoice-preview-overlay" role="dialog" aria-modal="true">
          <div className="invoice-preview-modal">
            <div className="invoice-preview-header">
              <div>
                <h2>Invoice Preview</h2>
                <p>{invoiceFileName}</p>
              </div>
              <button
                className="invoice-preview-close"
                onClick={closeInvoicePreview}
                aria-label="Close invoice preview"
              >
                x
              </button>
            </div>

            <iframe
              ref={previewFrameRef}
              className="invoice-preview-frame"
              src={`${invoicePreviewUrl}#toolbar=0&navpanes=0`}
              title="Invoice preview"
            />

            <div className="invoice-preview-actions">
              <button className="invoice-preview-secondary" onClick={closeInvoicePreview}>
                Close
              </button>
              <button className="invoice-preview-primary" onClick={handlePrintPreview}>
                Print / Save PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
