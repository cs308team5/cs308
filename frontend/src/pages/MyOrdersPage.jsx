import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../services/authService.js";
import "./MyOrdersPage.css";

const STATUS_CONFIG = {
  processing: { label: "Processing", color: "#6b7280", bg: "#f3f4f6", dot: "#9ca3af" },
  "in-transit": { label: "In Transit", color: "#1d4ed8", bg: "#eff6ff", dot: "#3b82f6" },
  delivered: { label: "Delivered", color: "#15803d", bg: "#f0fdf4", dot: "#4ade80" },
};

export default function MyOrdersPage() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    if (!user?.token) {
      navigate("/login");
      return;
    }
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/orders/my-orders", {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch orders.");
      setOrders(data.orders ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (orderId) => {
    setExpanded((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  if (loading) {
    return (
      <div className="myorders-container">
        <p className="myorders-loading">Loading your orders...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="myorders-container">
        <p className="myorders-error">{error}</p>
      </div>
    );
  }

  return (
    <div className="myorders-container">
      <div className="myorders-header">
        <h1>My Orders</h1>
        <p>{orders.length} order{orders.length !== 1 ? "s" : ""} placed</p>
      </div>

      {orders.length === 0 ? (
        <div className="myorders-empty">
          <div className="empty-icon">📦</div>
          <h2>No orders yet</h2>
          <p>Once you place an order, it will appear here.</p>
          <button className="shop-btn" onClick={() => navigate("/home")}>
            Start Shopping
          </button>
        </div>
      ) : (
        <div className="myorders-list">
          {orders.map((order) => {
            const status = order.delivery_status ?? "processing";
            const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.processing;
            const isOpen = expanded[order.order_id];
            const date = new Date(order.created_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            });

            return (
              <div className="order-card" key={order.order_id}>
                <div className="order-card-header">
                  <div className="order-meta">
                    <span className="order-id">Order #{order.order_id}</span>
                    <span className="order-date">{date}</span>
                  </div>
                  <div className="order-right">
                    <span
                      className="status-badge"
                      style={{ color: config.color, background: config.bg }}
                    >
                      <span className="status-dot" style={{ background: config.dot }} />
                      {config.label}
                    </span>
                    <span className="order-total">${Number(order.total_price).toFixed(2)}</span>
                    <button
                      className="toggle-btn"
                      onClick={() => toggleExpand(order.order_id)}
                    >
                      {isOpen ? "Hide items" : "View items"}
                    </button>
                  </div>
                </div>

                {order.delivery_address && (
                  <p className="delivery-address">📍 {order.delivery_address}</p>
                )}

                {isOpen && (
                  <div className="order-items">
                    {(order.items ?? []).map((item, i) => (
                      <div className="order-item" key={i}>
                        {item.image && <img src={item.image} alt={item.name} />}
                        <div className="item-info">
                          <span className="item-name">{item.name}</span>
                          <span className="item-qty">Qty: {item.quantity}</span>
                        </div>
                        <span className="item-price">
                          ${(Number(item.unit_price) * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
