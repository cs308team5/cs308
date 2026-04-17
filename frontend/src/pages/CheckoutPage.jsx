import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import React from "react";
import { useState, useEffect } from "react";
import { fetchCart } from "../services/productAndCartService.js";
import { getCurrentUser } from "../services/authService.js";
import "./CheckoutPage.css";

export default function CheckoutPage() {
  const user = getCurrentUser();
  const [cart, setCart] = useState([]);
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchCart(user.customer_id).then(setCart).catch(console.error);
  }, []);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = 15.00;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  const handlePlaceOrder = async () => {
    setError("");
    const [expiryMonth, expiryYear] = expiry.split("/").map((s) => s.trim());

    setSubmitting(true);
    try {
      // hardcoded for now but change it later
      const res = await fetch("http://localhost:3000/api/payment/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardNumber,
          cvv,
          expiryMonth,
          expiryYear,
          amount: total.toFixed(2),
          customer_id: user.customer_id,
          cart_items: cart.map((item) => ({
            product_id: item.product_id,
            quantity: item.quantity,
            price: item.price,
          })),
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.message || "Payment failed.");
        return;
      }
      // alerti silebiliriz belki
      alert('Order placed!');
    } catch (err) {
      setError("Could not connect to server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="checkout-container">

      <div className="checkout-content">

        {/* LEFT SIDE */}
        <div className="checkout-left">

          {/* SHIPPING CARD */}
          <div className="card">
            <div className="card-header">
              <div className="icon purple">📍</div>
              <div>
                <h2>Shipping Address</h2>
                <p>Where should we deliver?</p>
              </div>
            </div>

            <div className="grid-2">
              <div className="input-group">
                <label>Full Name</label>
                <input name="fullName" value={form.fullName} onChange={handleChange} placeholder="John Doe" />
              </div>

              <div className="input-group">
                <label>Email</label>
                <input name="email" value={form.email} onChange={handleChange} placeholder="john@example.com" />
              </div>
            </div>

            <div className="input-group">
              <label>Phone Number</label>
              <input name="phone" value={form.phone} onChange={handleChange} placeholder="+1 (555) 123-4567" />
            </div>

            <div className="input-group">
              <label>Street Address</label>
              <input name="street" value={form.street} onChange={handleChange} placeholder="123 Main Street, Apt 4B" />
            </div>

            <div className="grid-3">
              <div className="input-group">
                <label>City</label>
                <input name="city" value={form.city} onChange={handleChange} placeholder="New York" />
              </div>

              <div className="input-group">
                <label>State</label>
                <input name="state" value={form.state} onChange={handleChange} placeholder="NY" />
              </div>

              <div className="input-group">
                <label>ZIP Code</label>
                <input name="zip" value={form.zip} onChange={handleChange} placeholder="10001" />
              </div>
            </div>

            <div className="input-group">
              <label>Country</label>
              <select name="country" value={form.country} onChange={handleChange}>
                <option>Select country</option>
                <option>United States</option>
                <option>United Kingdom</option>
                <option>Germany</option>
                <option>France</option>
                <option>Turkey</option>
              </select>
            </div>
          </div>

          {/* PAYMENT CARD */}
          <div className="card">
            <div className="card-header">
              <div className="icon blue">💳</div>
              <div>
                <h2>Payment Information</h2>
                <p>Secure payment processing</p>
              </div>
            </div>

            <div className="input-group">
              <label>Card Number</label>
              <input placeholder="1234 5678 9012 3456" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} />
            </div>

            <div className="input-group">
              <label>Cardholder Name</label>
              <input name="cardName" value={form.cardName} onChange={handleChange} placeholder="Name as it appears on card" />
            </div>

            <div className="grid-2">
              <div className="input-group">
                <label>Expiry Date</label>
                <input placeholder="MM/YY" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
              </div>

              <div className="input-group">
                <label>CVV</label>
                <input placeholder="123" value={cvv} onChange={(e) => setCvv(e.target.value)} />
              </div>
            </div>

            <div className="secure-box">
              🔒 Your payment information is encrypted and secure
            </div>
          </div>

        </div>

        {/* RIGHT SIDE */}
        <div className="checkout-right">
          <h2>Order Summary</h2>

          <div className="summary-row">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>

          <div className="summary-row">
            <span>Shipping</span>
            <span>${shipping.toFixed(2)}</span>
          </div>

          <div className="summary-row">
            <span>Tax (8%)</span>
            <span>${tax.toFixed(2)}</span>
          </div>

          <hr />

          <div className="total">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>

          {error && <p style={{ color: "red", fontSize: "0.9rem" }}>{error}</p>}

          <button className="place-order" onClick={handlePlaceOrder} disabled={submitting}>
            {submitting ? "Placing Order..." : "Place Order"}
          </button>

          <div className="extra">
            <p>🔒 Secure 256-bit SSL encryption</p>
            <p>🛡 30-day money-back guarantee</p>
          </div>
        </div>

      </div>
    </div>
  );
}
