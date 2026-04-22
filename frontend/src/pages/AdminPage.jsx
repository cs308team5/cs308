import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../services/authService.js";
import brushStroke from "../assets/homePageAssets/brushStroke.png";
import "./AdminPage.css";

const buttonData = [
    { id: "home",      label: "Home",      path: "/home" },
    { id: "discover",  label: "Discover",  path: "/discover" },
    { id: "admin",     label: "Admin",     path: "/admin" },
];

const SideBarButton = ({ label, isActive, onClick }) => (
    <div className={`sidebar-btn-container ${isActive ? "active" : ""}`} onClick={onClick}>
        {isActive && <img src={brushStroke} className="btn-brush-stroke" alt="" />}
        <button className="sidebar-btn" />
        <span className="btn-text">{label}</span>
    </div>
);

export default function AdminPage() {
    const navigate = useNavigate();
    const user = getCurrentUser();
    const token = user?.token ?? null;

    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState("");
    const [msgType, setMsgType] = useState("success");

    useEffect(() => {
        fetchPending();
    }, []);

    const fetchPending = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/comments/pending", {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) setComments(data.data);
        } catch {
            showMsg("Could not load comments.", "error");
        } finally {
            setLoading(false);
        }
    };

    const showMsg = (text, type = "success") => {
        setMsg(text);
        setMsgType(type);
        setTimeout(() => setMsg(""), 3000);
    };

    const handleDecision = async (id, status) => {
        try {
            const res = await fetch(`/api/comments/${id}/status`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ status }),
            });
            const data = await res.json();
            if (data.success) {
                setComments(prev => prev.filter(c => c.id !== id));
                showMsg(`Comment ${status} successfully.`, "success");
            }
        } catch {
            showMsg("Action failed.", "error");
        }
    };

    return (
        <div className="container">
            {/* SIDEBAR */}
            <div className="sidebar">
                <div className="logo-area">
                    <h2 className="logo-text brand">Dare</h2>
                </div>
                <div className="button-column">
                    {buttonData.map((btn) => (
                        <SideBarButton
                            key={btn.id}
                            label={btn.label}
                            isActive={btn.id === "admin"}
                            onClick={() => navigate(btn.path)}
                        />
                    ))}
                </div>
            </div>

            {/* CONTENT */}
            <div className="content-area">
                <div className="admin-header">
                    <h1 className="greeting-text brand">Pending Comments</h1>
                    {msg && (
                        <p className={`admin-msg ${msgType}`}>{msg}</p>
                    )}
                </div>

                <div className="admin-list">
                    {loading && (
                        <p className="admin-empty">Loading...</p>
                    )}
                    {!loading && comments.length === 0 && (
                        <p className="admin-empty">No pending comments ✓</p>
                    )}
                    {comments.map(c => (
                        <div className="admin-card" key={c.id}>
                            <div className="admin-card-meta">
                                <span className="admin-product-name brand">{c.product_name}</span>
                                <span className="admin-date">
                                    {new Date(c.created_at).toLocaleDateString("en-US", {
                                        year: "numeric", month: "short", day: "numeric"
                                    })}
                                </span>
                            </div>
                            <p className="admin-card-text">{c.text}</p>
                            <div className="admin-actions">
                                <button
                                    className="admin-btn approve"
                                    onClick={() => handleDecision(c.id, "approved")}
                                >
                                    Approve
                                </button>
                                <button
                                    className="admin-btn reject"
                                    onClick={() => handleDecision(c.id, "rejected")}
                                >
                                    Reject
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}