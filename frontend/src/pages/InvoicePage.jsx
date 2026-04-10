import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./InvoicePage.css";

export default function InvoicePage() {
  const { state } = useLocation();
  const navigate = useNavigate();

  // Fallback mock data for preview/dev
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

  const handlePrint = () => window.print();

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
        <button className="print-btn" onClick={handlePrint}>
          🖨 Print Invoice
        </button>
      </div>

      <div className="invoice-content">
        {/* LEFT SIDE */}
        <div className="invoice-left">

          {/* INVOICE META */}
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

          {/* ORDER ITEMS */}
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

          {/* SHIPPING ADDRESS */}
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

        {/* RIGHT SIDE — dark panel matching cart/checkout */}
        <div className="invoice-right">
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

          <button
            className="continue-btn"
            onClick={() => navigate("/")}
          >
            Continue Shopping
          </button>

          <div className="extra">
            <p>🔒 Secure 256-bit SSL encryption</p>
            <p>🛡 30-day money-back guarantee</p>
            <p>📬 Estimated delivery: 3–5 business days</p>
          </div>
        </div>
      </div>
    </div>
  );
}
