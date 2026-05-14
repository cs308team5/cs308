import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../services/authService.js";
import "./MyOrdersPage.css";

const STATUS_CONFIG = {
  processing: { label: "Processing", color: "#6b7280", bg: "#f3f4f6", dot: "#9ca3af" },
  "in-transit": { label: "In Transit", color: "#1d4ed8", bg: "#eff6ff", dot: "#3b82f6" },
  delivered: { label: "Delivered", color: "#15803d", bg: "#f0fdf4", dot: "#4ade80" },
};

const REFUND_STATUS_CONFIG = {
  pending:  { label: "Refund Pending",          color: "#92400e", bg: "#fef3c7" },
  received: { label: "Product Received — Under Review", color: "#1d4ed8", bg: "#eff6ff" },
  approved: { label: "Refund Approved",          color: "#15803d", bg: "#f0fdf4" },
  rejected: { label: "Refund Rejected",          color: "#b91c1c", bg: "#fef2f2" },
};

function isWithin30Days(dateStr) {
  const days = (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24);
  return days <= 30;
}

export default function MyOrdersPage() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState({});

  // refund state
  const [refundMap, setRefundMap] = useState({});
  const [refundForm, setRefundForm] = useState(null); // { orderId, productId }
  const [refundReason, setRefundReason] = useState("");
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [refundMsg, setRefundMsg] = useState("");

  useEffect(() => {
    if (!user?.token) {
      navigate("/login");
      return;
    }
    fetchOrders();
    fetchMyRefunds();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/orders/my-orders", {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (res.status === 401) {
        navigate("/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch orders.");
      setOrders(data.orders ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyRefunds = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/refunds/my-refunds", {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const data = await res.json();
      if (!res.ok) return;
      const map = {};
      for (const r of data.refunds ?? []) {
        map[`${r.order_id}_${r.product_id}`] = r;
      }
      setRefundMap(map);
    } catch {}
  };

  const toggleExpand = (orderId) => {
    setExpanded((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const openRefundForm = (orderId, productId) => {
    setRefundForm({ orderId, productId });
    setRefundReason("");
    setRefundMsg("");
  };

  const cancelRefundForm = () => {
    setRefundForm(null);
    setRefundReason("");
    setRefundMsg("");
  };

  const submitRefund = async () => {
    if (!refundForm) return;
    setRefundSubmitting(true);
    setRefundMsg("");
    try {
      const res = await fetch("http://localhost:3000/api/refunds", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          order_id: refundForm.orderId,
          product_id: refundForm.productId,
          reason: refundReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRefundMsg(data.message || "Failed to submit refund request.");
        return;
      }
      const key = `${refundForm.orderId}_${refundForm.productId}`;
      setRefundMap((prev) => ({ ...prev, [key]: data.refund }));
      setRefundForm(null);
      setRefundReason("");
    } catch {
      setRefundMsg("Could not submit refund request.");
    } finally {
      setRefundSubmitting(false);
    }
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
            const eligibleForRefund = isWithin30Days(order.created_at);
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
                      className="myorders-status-badge"
                      style={{ color: config.color, background: config.bg }}
                    >
                      <span className="myorders-status-dot" style={{ background: config.dot }} />
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
                    {(order.items ?? []).map((item, i) => {
                      const refundKey = `${order.order_id}_${item.product_id}`;
                      const existingRefund = refundMap[refundKey];
                      const isFormOpen =
                        refundForm?.orderId === order.order_id &&
                        refundForm?.productId === item.product_id;

                      return (
                        <div className="order-item-wrapper" key={i}>
                          <div className="order-item">
                            {item.image && (
                              <img
                                src={item.image}
                                alt={item.name}
                                style={{ cursor: "pointer" }}
                                onClick={() => navigate(`/products/${item.product_id}`)}
                              />
                            )}
                            <div className="item-info">
                              <span
                                className="item-name"
                                style={{ cursor: "pointer" }}
                                onClick={() => navigate(`/products/${item.product_id}`)}
                              >
                                {item.name}
                              </span>
                              <span className="item-qty">Qty: {item.quantity}</span>
                            </div>
                            <span className="item-price">
                              ${(Number(item.unit_price) * item.quantity).toFixed(2)}
                            </span>

                            {existingRefund ? (
                              <span
                                className="refund-status-badge"
                                style={{
                                  color: REFUND_STATUS_CONFIG[existingRefund.status]?.color,
                                  background: REFUND_STATUS_CONFIG[existingRefund.status]?.bg,
                                }}
                              >
                                {REFUND_STATUS_CONFIG[existingRefund.status]?.label}
                              </span>
                            ) : eligibleForRefund ? (
                              <button
                                className="refund-btn"
                                onClick={() => openRefundForm(order.order_id, item.product_id)}
                              >
                                Request Refund
                              </button>
                            ) : (
                              <span className="refund-expired">Refund period expired</span>
                            )}
                          </div>

                          {isFormOpen && (
                            <div className="refund-form">
                              <p className="refund-form-title">Refund reason (optional)</p>
                              <textarea
                                className="refund-textarea"
                                placeholder="Describe the issue..."
                                value={refundReason}
                                onChange={(e) => setRefundReason(e.target.value)}
                                rows={3}
                              />
                              {refundMsg && <p className="refund-form-error">{refundMsg}</p>}
                              <div className="refund-form-actions">
                                <button
                                  className="refund-submit-btn"
                                  onClick={submitRefund}
                                  disabled={refundSubmitting}
                                >
                                  {refundSubmitting ? "Submitting..." : "Submit Request"}
                                </button>
                                <button
                                  className="refund-cancel-btn"
                                  onClick={cancelRefundForm}
                                  disabled={refundSubmitting}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
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
