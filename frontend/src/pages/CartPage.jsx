import React, { useState } from "react";
import "./CartPage.css";

const initialCart = [
  {
    id: 1,
    name: "Premium Wireless Headphones",
    description: "High-quality audio with active noise cancellation",
    price: 299.99,
    quantity: 1,
    image: "https://via.placeholder.com/80",
  },
  {
    id: 2,
    name: "Minimalist Watch",
    description: "Swiss movement with sapphire crystal glass",
    price: 189.99,
    quantity: 1,
    image: "https://via.placeholder.com/80",
  },
  {
    id: 3,
    name: "Leather Backpack",
    description: "Genuine leather with laptop compartment",
    price: 149.99,
    quantity: 1,
    image: "https://via.placeholder.com/80",
  },
];

export default function CartPage() {
  const [cart, setCart] = useState(initialCart);

  const updateQuantity = (id, change) => {
    setCart(cart.map(item =>
      item.id === id
        ? { ...item, quantity: Math.max(1, item.quantity + change) }
        : item
    ));
  };

  const removeItem = (id) => {
    setCart(cart.filter(item => item.id !== id));
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
                <button onClick={() => updateQuantity(item.id, -1)}>-</button>
                <span>{item.quantity}</span>
                <button onClick={() => updateQuantity(item.id, 1)}>+</button>
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

        <button className="checkout">Proceed to Checkout</button>

        <p className="note">Free shipping on orders over $100</p>
      </div>
    </div>
  );
}