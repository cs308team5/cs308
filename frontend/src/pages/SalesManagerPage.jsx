import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../services/authService.js";
import "./AdminPage.css";

const REFUND_STATUS_COLOR = {
    pending:  { color: "#92400e", bg: "#fef3c7" },
    received: { color: "#1d4ed8", bg: "#eff6ff" },
    approved: { color: "#15803d", bg: "#f0fdf4" },
    rejected: { color: "#b91c1c", bg: "#fef2f2" },
};

export default function SalesManagerPage() {
    const navigate = useNavigate();
    const user = getCurrentUser();
    const token = user?.token ?? null;
    const isSalesManager = user?.role === "sales_manager";

    const [refunds, setRefunds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionId, setActionId] = useState(null);
    const [msg, setMsg] = useState("");
    const [msgType, setMsgType] = useState("success");

    const showMsg = (text, type = "success") => {
        setMsg(text);
        setMsgType(type);
        setTimeout(() => setMsg(""), 3000);
    };

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "auto" });
        fetchRefunds();
    }, [token]);

    const fetchRefunds = async () => {
        if (!token) { setLoading(false); return; }
        setLoading(true);
        try {
            const res = await fetch("/api/refunds", {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) setRefunds(data.refunds);
            else showMsg(data.message || "Could not load refund requests.", "error");
        } catch {
            showMsg("Could not load refund requests.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleDecision = async (refundId, status) => {
        setActionId(refundId);
        try {
            const res = await fetch(`/api/refunds/${refundId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ status }),
            });
            const data = await res.json();
            if (!res.ok) { showMsg(data.message || "Action failed.", "error"); return; }
            if (data.success) {
                setRefunds(prev =>
                    prev.map(r => r.refund_id === refundId ? { ...r, status } : r)
                );
                showMsg(`Refund ${status} successfully.`);
            }
        } catch {
            showMsg("Action failed.", "error");
        } finally {
            setActionId(null);
        }
    };

    if (!token || !isSalesManager) {
        return (
            <main className="admin-content">
                <div className="admin-guard-card">
                    <h2 className="brand">Sales manager access required</h2>
                    <p className="admin-empty">Please log in with a sales manager account to review refunds.</p>
                    <button className="admin-btn add-product" onClick={() => navigate("/login")}>Go to Login</button>
                </div>
            </main>
        );
    }

    const pending  = refunds.filter(r => r.status === "pending").length;

    return (
        <main className="admin-content">
            <div className="admin-panel">
                <div className="admin-header">
                    <div>
                        <p className="admin-kicker">Refunds</p>
                        <h1 className="admin-title">
                            Refund Requests
                            {pending > 0 && (
                                <span className="admin-pending-badge">{pending} pending</span>
                            )}
                        </h1>
                    </div>
                    {msg && <p className={`admin-msg ${msgType}`}>{msg}</p>}
                </div>

                <div className="admin-list">
                    {loading && <p className="admin-empty">Loading...</p>}
                    {!loading && refunds.length === 0 && (
                        <p className="admin-empty">No refund requests yet.</p>
                    )}
                    {refunds.map(r => {
                        const badge = REFUND_STATUS_COLOR[r.status] ?? REFUND_STATUS_COLOR.pending;
                        return (
                            <div className="admin-card" key={r.refund_id}>
                                <div className="admin-card-meta">
                                    <span className="admin-product-name brand">{r.product_name}</span>
                                    <span style={{
                                        color: badge.color,
                                        background: badge.bg,
                                        padding: "4px 12px",
                                        borderRadius: "999px",
                                        fontSize: "12px",
                                        fontWeight: 600,
                                    }}>
                                        {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                                    </span>
                                </div>
                                <p className="admin-comment-author">
                                    Order #{r.order_id} · {r.customer_name} ({r.customer_email})
                                </p>
                                <p className="admin-comment-author">
                                    Qty: {r.quantity} · Refund: ${(Number(r.unit_price) * r.quantity).toFixed(2)}
                                </p>
                                {r.reason && <p className="admin-card-text">"{r.reason}"</p>}
                                <p className="admin-date">
                                    Requested: {new Date(r.requested_at).toLocaleDateString("en-US", {
                                        year: "numeric", month: "short", day: "numeric",
                                    })}
                                </p>
                                {r.status === "pending" && (
                                    <div className="admin-actions">
                                        <button
                                            className="admin-btn approve"
                                            disabled={actionId === r.refund_id}
                                            onClick={() => handleDecision(r.refund_id, "received")}
                                        >
                                            {actionId === r.refund_id ? "Saving..." : "Mark as Received"}
                                        </button>
                                    </div>
                                )}
                                {r.status === "received" && (
                                    <div className="admin-actions">
                                        <button
                                            className="admin-btn approve"
                                            disabled={actionId === r.refund_id}
                                            onClick={() => handleDecision(r.refund_id, "approved")}
                                        >
                                            {actionId === r.refund_id ? "Saving..." : "Approve Refund"}
                                        </button>
                                        <button
                                            className="admin-btn reject"
                                            disabled={actionId === r.refund_id}
                                            onClick={() => handleDecision(r.refund_id, "rejected")}
                                        >
                                            {actionId === r.refund_id ? "Saving..." : "Reject"}
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </main>
    );
}
