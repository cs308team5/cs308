import React from "react";
import "./CheckoutPage.css";

export default function CheckoutPage() {
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
                <input placeholder="John Doe" />
              </div>

              <div className="input-group">
                <label>Email</label>
                <input placeholder="john@example.com" />
              </div>
            </div>

            <div className="input-group">
              <label>Phone Number</label>
              <input placeholder="+1 (555) 123-4567" />
            </div>

            <div className="input-group">
              <label>Street Address</label>
              <input placeholder="123 Main Street, Apt 4B" />
            </div>

            <div className="grid-3">
              <div className="input-group">
                <label>City</label>
                <input placeholder="New York" />
              </div>

              <div className="input-group">
                <label>State</label>
                <input placeholder="NY" />
              </div>

              <div className="input-group">
                <label>ZIP Code</label>
                <input placeholder="10001" />
              </div>
            </div>

            <div className="input-group">
              <label>Country</label>
              <select>
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
              <input placeholder="1234 5678 9012 3456" />
            </div>

            <div className="input-group">
              <label>Cardholder Name</label>
              <input placeholder="Name as it appears on card" />
            </div>

            <div className="grid-2">
              <div className="input-group">
                <label>Expiry Date</label>
                <input placeholder="MM/YY" />
              </div>

              <div className="input-group">
                <label>CVV</label>
                <input placeholder="123" />
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
            <span>$299.00</span>
          </div>

          <div className="summary-row">
            <span>Shipping</span>
            <span>$15.00</span>
          </div>

          <div className="summary-row">
            <span>Tax</span>
            <span>$24.92</span>
          </div>

          <hr />

          <div className="total">
            <span>Total</span>
            <span>$338.92</span>
          </div>

          <button className="place-order">Place Order</button>

          <div className="extra">
            <p>🔒 Secure 256-bit SSL encryption</p>
            <p>🛡 30-day money-back guarantee</p>
          </div>
        </div>

      </div>
    </div>
  );
}