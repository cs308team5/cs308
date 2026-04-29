import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../services/authService";
import "./OrderTrackingPage.css";

const STATUS_STEPS = ["processing", "in-transit", "delivered"];

export default function OrderTrackingPage() {
    const navigate = useNavigate();
    const user = getCurrentUser();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            navigate("/login");
            return;
        }

        fetch(`http://localhost:3000/api/deliveries/my/${user.customer_id}`)
            .then((res) => res.json())
            .then((data) => {
                setOrders(data.data || []);
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    if (loading) return <div className="loading">Loading...</div>;

    return (
        <div className="page">
            <div className="navbar">
                <div className="nav-left" onClick={() => navigate("/home")}>HOME</div>
                <div className="nav-center">THE DARE</div>
                <div className="nav-right">
                    <span onClick={() => navigate("/profile")}>PROFILE</span>
                    <span onClick={() => navigate("/cart")}>CART</span>
                </div>
            </div>

            <div className="tracking-page">
                <h1 className="tracking-title">MY ORDERS</h1>

                {orders.length === 0 ? (
                    <p className="no-orders">You have no orders yet.</p>
                ) : (
                    orders.map((order) => (
                        <div className="order-card" key={order.delivery_id}>
                            <div className="order-header">
                                <span className="order-id">Order #{order.order_id}</span>
                                <span className="order-date">
                                    {new Date(order.created_at).toLocaleDateString()}
                                </span>
                                <span className="order-total">{order.total_price} TL</span>
                            </div>

                            <div className="order-address">📍 {order.delivery_address}</div>

                            <div className="order-items">
                                {order.items.map((item, i) => (
                                    <div className="order-item" key={i}>
                                        <img
                                            src={item.image_url || "https://via.placeholder.com/50"}
                                            alt={item.name}
                                            className="order-item-img"
                                        />
                                        <span>{item.name}</span>
                                        <span>x{item.quantity}</span>
                                        <span>{item.unit_price} TL</span>
                                    </div>
                                ))}
                            </div>

                            <div className="status-tracker">
                                {STATUS_STEPS.map((step, i) => {
                                    const currentIndex = STATUS_STEPS.indexOf(order.status);
                                    const isActive = i <= currentIndex;
                                    return (
                                        <React.Fragment key={step}>
                                            <div className={`status-step ${isActive ? "active" : ""}`}>
                                                <div className="status-dot" />
                                                <span className="status-label">
                                                    {step.toUpperCase()}
                                                </span>
                                            </div>
                                            {i < STATUS_STEPS.length - 1 && (
                                                <div className={`status-line ${isActive && i < currentIndex ? "active" : ""}`} />
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
