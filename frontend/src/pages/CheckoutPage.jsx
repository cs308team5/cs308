import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getCurrentUser } from "../services/authService.js";
import "./CheckoutPage.css";

export default function CheckoutPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const user = getCurrentUser();

  const cart = state?.cart ?? [];
  const subtotal = state?.subtotal ?? 0;
  const shipping = 15.0;
  const tax = +(subtotal * 0.0835).toFixed(2);
  const total = subtotal + shipping + tax;

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    street: "",
    city: "",
    state: "",
    zip: "",
    country: "",
    cardNumber: "",
    cardName: "",
    expiry: "",
    cvv: "",
  });

  const validateEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const formatCardNumber = (value) =>
    value
      .replace(/\D/g, "")
      .slice(0, 16)
      .replace(/(.{4})/g, "$1 ")
      .trim();

  const formatExpiry = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);

    if (digits.length <= 2) {
      return digits;
    }

    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (name === "cardNumber") {
      setForm({ ...form, cardNumber: formatCardNumber(value) });
      return;
    }

    if (name === "expiry") {
      setForm({ ...form, expiry: formatExpiry(value) });
      return;
    }

    if (name === "cvv") {
      setForm({ ...form, cvv: value.replace(/\D/g, "").slice(0, 4) });
      return;
    }

    setForm({ ...form, [name]: value });
  };

  const handlePlaceOrder = async () => {
    if (!cart.length) {
      alert("Your cart is empty.");
      navigate("/cart");
      return;
    }

    if (!user?.token) {
      alert("Please log in to complete checkout.");
      navigate("/login");
      return;
    }

    if (!form.fullName.trim()) {
      alert("Full name is required.");
      return;
    }

    if (!form.email.trim()) {
      alert("Recipient email is required.");
      return;
    }

    if (!validateEmail(form.email.trim())) {
      alert("Please enter a valid email address.");
      return;
    }

    if (!form.phone.trim()) {
      alert("Phone number is required.");
      return;
    }

    if (!form.street.trim()) {
      alert("Street address is required.");
      return;
    }

    if (!form.city.trim()) {
      alert("City is required.");
      return;
    }

    if (!form.state.trim()) {
      alert("State is required.");
      return;
    }

    if (!form.zip.trim()) {
      alert("ZIP code is required.");
      return;
    }

    if (!form.country.trim() || form.country === "Select country") {
      alert("Country is required.");
      return;
    }

    if (form.cardNumber.replace(/\s/g, "").length !== 16) {
      alert("Please enter a valid 16-digit card number.");
      return;
    }

    if (!form.cardName.trim()) {
      alert("Cardholder name is required.");
      return;
    }

    if (!/^\d{2}\/\d{2}$/.test(form.expiry)) {
      alert("Please enter a valid expiry date in MM/YY format.");
      return;
    }

    const [expiryMonth, expiryYear] = form.expiry
      .split("/")
      .map((value) => Number(value.trim()));

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear() % 100;

    if (expiryMonth < 1 || expiryMonth > 12) {
      alert("Expiry month must be between 01 and 12.");
      return;
    }

    if (
      expiryYear < currentYear ||
      (expiryYear === currentYear && expiryMonth <= currentMonth)
    ) {
      alert("Card expiry date cannot be in the past.");
      return;
    }

    if (!/^\d{3,4}$/.test(form.cvv)) {
      alert("Please enter a valid CVV.");
      return;
    }

    const paymentPayload = {
      cardNumber: form.cardNumber.replace(/\s/g, ""),
      cvv: form.cvv,
      expiryMonth,
      expiryYear,
      amount: total,
      cart_items: cart.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
      })),
      delivery_address: {
        street: form.street,
        city: form.city,
        state: form.state,
        zip: form.zip,
        country: form.country,
      },
    };

    let paymentRes;
    try {
      const res = await fetch("/api/payment/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify(paymentPayload),
      });
      paymentRes = await res.json();
    } catch (err) {
      alert("Payment request failed. Please try again.");
      return;
    }

    if (!paymentRes.success) {
      alert(paymentRes.message || "Payment declined.");
      return;
    }

    if (!paymentRes.order_id) {
      alert("Payment was approved, but the order could not be created.");
      return;
    }

    const order = {
      invoiceNumber: paymentRes.order_id,
      date: new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      items: cart,
      shipping: {
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        street: form.street,
        city: form.city,
        state: form.state,
        zip: form.zip,
        country: form.country,
      },
      subtotal,
      shippingCost: shipping,
      tax,
      total,
    };

    try {
      const response = await fetch(`/api/invoice/send/${paymentRes.order_id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to send invoice email.");
      }

      const data = await response.json();

      if (data.previewUrl) {
        window.open(data.previewUrl, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      alert(error.message || "Invoice email could not be sent.");
      return;
    }

    navigate("/invoice", {
      state: {
        order,
      },
    });
  };

  return (
    <div className="checkout-container">
      <div className="checkout-content">
        <div className="checkout-left">
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
                <input name="fullName" value={form.fullName} onChange={handleChange} placeholder="John Doe" required />
              </div>

              <div className="input-group">
                <label>Email</label>
                <input name="email" value={form.email} onChange={handleChange} placeholder="john@example.com" required />
              </div>
            </div>

            <div className="input-group">
              <label>Phone Number</label>
              <input name="phone" value={form.phone} onChange={handleChange} placeholder="+1 (555) 123-4567" required />
            </div>

            <div className="input-group">
              <label>Street Address</label>
              <input name="street" value={form.street} onChange={handleChange} placeholder="123 Main Street, Apt 4B" required />
            </div>

            <div className="grid-3">
              <div className="input-group">
                <label>City</label>
                <input name="city" value={form.city} onChange={handleChange} placeholder="New York" required />
              </div>

              <div className="input-group">
                <label>State</label>
                <input name="state" value={form.state} onChange={handleChange} placeholder="NY" required />
              </div>

              <div className="input-group">
                <label>ZIP Code</label>
                <input name="zip" value={form.zip} onChange={handleChange} placeholder="10001" required />
              </div>
            </div>

            <div className="input-group">
              <label>Country</label>
              <select name="country" value={form.country} onChange={handleChange} required>
                <option value="">Select country</option>
                <option>United States</option>
                <option>United Kingdom</option>
                <option>Germany</option>
                <option>France</option>
                <option>Turkey</option>
              </select>
            </div>
          </div>

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
              <input name="cardNumber" value={form.cardNumber} onChange={handleChange} placeholder="1234 5678 9012 3456" maxLength="19" required />
            </div>

            <div className="input-group">
              <label>Cardholder Name</label>
              <input name="cardName" value={form.cardName} onChange={handleChange} placeholder="Name as it appears on card" required />
            </div>

            <div className="grid-2">
              <div className="input-group">
                <label>Expiry Date</label>
                <input name="expiry" value={form.expiry} onChange={handleChange} placeholder="MM/YY" maxLength="5" required />
              </div>

              <div className="input-group">
                <label>CVV</label>
                <input name="cvv" value={form.cvv} onChange={handleChange} placeholder="123" maxLength="4" required />
              </div>
            </div>

            <div className="secure-box">🔒 Your payment information is encrypted and secure</div>
          </div>
        </div>

        <div className="checkout-right">
          <p className="checkout-summary-label">Review</p>
          <h2>Order Summary</h2>

          <div className="summary-row">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>

          <div className="summary-row">
            <span>Shipping</span>
            <span>${shipping.toFixed(2)}</span>
          </div>

          <div className="summary-row">
            <span>Tax</span>
            <span>${tax.toFixed(2)}</span>
          </div>

          <hr />

          <div className="total">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>

          <button className="place-order" onClick={handlePlaceOrder}>Place Order</button>

          <div className="extra">
            <p>🔒 Secure 256-bit SSL encryption</p>
            <p>🛡 30-day money-back guarantee</p>
          </div>
        </div>
      </div>
    </div>
  );
}
