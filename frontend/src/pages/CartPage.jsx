import React, { useState, useEffect } from "react";
import { fetchCart, updateCartQuantity, removeFromCart, getGuestCart, saveGuestCart } from "../services/productAndCartService.js";
import { getCurrentUser } from "../services/authService.js";
import { useNavigate } from "react-router-dom";
import "./CartPage.css";


export default function CartPage() {
  const [cart, setCart] = useState([]);
  const user = getCurrentUser();
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      const guestCart = getGuestCart().map((item, index) => ({
        ...item,
        id: index, // use index as local id
      }));
      setCart(guestCart);
      setLoading(false);
      return;
    }
    fetchCart(user.customer_id)
        .then(setCart)
        .catch(console.error)
        .finally(() => setLoading(false));
  }, []);

  const updateQuantity = async (item, change) => {
    if (change > 0 && item.quantity >= item.stock_quantity) return;
    const newQty = Math.max(1, item.quantity + change);

    if (!user) {
      const updated = cart.map(c =>
          c.product_id === item.product_id ? { ...c, quantity: newQty } : c
      );
      setCart(updated);
      saveGuestCart(updated);
      return;
    }

    await updateCartQuantity(item.id, newQty);
    setCart(cart.map(c => c.id === item.id ? { ...c, quantity: newQty } : c));
  };

  const removeItem = async (id) => {

    if (!user) {
      const updated = cart.filter((_, i) => i !== id);
      setCart(updated);
      saveGuestCart(updated);
      return;
    }

    await removeFromCart(id);
    setCart(cart.filter(c => c.id !== id));
  };

  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const shipping = 15.0;
  const tax = +(subtotal * 0.0835).toFixed(2);
  const total = subtotal + shipping + tax;

  return (
    <div className="cart-container">
      <div className="cart-left">
        <p className="type-eyebrow">Curated Selection</p>
        <h1 className="type-page-title cart-page-title">Shopping Cart</h1>
        <p className="type-body-muted cart-page-subtitle">{cart.length} items in your cart</p>

        {cart.map(item => (
          <div className="cart-item" key={item.id}>
            <img src={item.image} alt="" />

            <div className="item-details">
              <h3>{item.name}</h3>
              <p>{item.description}</p>

              <div className="quantity">
                <button onClick={() => updateQuantity(item, -1)}>-</button>
                <span>{item.quantity}</span>
                <button className={item.quantity >= item.stock_quantity ? "stock-reached" : ""} onClick={() => updateQuantity(item, 1)} disabled={item.quantity >= item.stock_quantity}>{item.quantity >= item.stock_quantity ? "Stock Reached" : "+"}</button>
              </div>
            </div>

            <div className="item-right">
              <button className="remove" onClick={() => removeItem(item.id)}>
                🗑
              </button>
              <h3>${(item.price * item.quantity).toFixed(2)}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="cart-right">
        <p className="cart-summary-label">Review</p>
        <h2 className="cart-summary-title">Order Summary</h2>

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

        <button className="checkout" onClick={() => navigate("/checkout", {state: {cart, subtotal, total,}})}  disabled={cart.length === 0}>
          
        Proceed to Checkout
      </button>

      </div>
    </div>
  );
}
