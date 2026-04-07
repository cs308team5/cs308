import React, { useState, useEffect } from "react";
import { fetchCart, updateCartQuantity, removeFromCart } from "../services/productAndCartService.js";
import { getCurrentUser } from "../services/authService.js";
import { useNavigate } from "react-router-dom";
import "./CartPage.css";


export default function CartPage() {
  const [cart, setCart] = useState([]);
  const user = getCurrentUser();
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    fetchCart(user.customer_id)
        .then(setCart)
        .catch(console.error)
        .finally(() => setLoading(false));
  }, []);

  const updateQuantity = async (item, change) => {
    if (change > 0 && item.quantity >= item.stock_quantity) return;
    const newQty = Math.max(1, item.quantity + change);
    await updateCartQuantity(item.id, newQty);
    setCart(cart.map(c => c.id === item.id ? { ...c, quantity: newQty } : c));
  };

  const removeItem = async (id) => {
      await removeFromCart(id);
      setCart(cart.filter(c => c.id !== id));
  };

  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const total = subtotal;

  return (
    <div className="cart-container">
      <div className="cart-left">
        <h1 className="brand">Shopping Cart</h1>
        <p className="text">{cart.length} items in your cart</p>

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
        <h2 className="brand">Order Summary</h2>

        <div className="summary-row">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>

        <div className="summary-row">
          <span>Shipping</span>
          <span>Free</span>
        </div>

        <hr />

        <div className="total">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>

        <button className="checkout" onClick={() => navigate("/checkout")} disabled={cart.length === 0}>
          
        Proceed to Checkout
      </button>

        <p className="note">Free shipping on orders over $100</p>
      </div>
    </div>
  );
}