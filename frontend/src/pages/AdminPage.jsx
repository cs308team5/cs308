import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../services/authService.js";
import "./AdminPage.css";

export default function AdminPage() {
    const navigate = useNavigate();
    const user = getCurrentUser();
    const token = user?.token ?? null;
    const isAdmin = Boolean(user?.isAdmin ?? user?.is_admin);

    const [comments, setComments] = useState([]);
    const [commentsLoading, setCommentsLoading] = useState(true);
    const [commentActionId, setCommentActionId] = useState(null);
    const [msg, setMsg] = useState("");
    const [msgType, setMsgType] = useState("success");

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "auto" });
    }, []);

    const showMsg = (text, type = "success") => {
        setMsg(text);
        setMsgType(type);
        setTimeout(() => setMsg(""), 3000);
    };

    useEffect(() => {
        fetchPending();
    }, [token]);

    const fetchPending = async () => {
        if (!token) {
            setComments([]);
            setCommentsLoading(false);
            return;
        }

        setCommentsLoading(true);
        try {
            const res = await fetch("/api/comments/pending", {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();

            if (!res.ok) {
                showMsg(data.message || "Could not load comments.", "error");
                setComments([]);
                return;
            }

            if (data.success) setComments(data.data);
        } catch {
            showMsg("Could not load comments.", "error");
        } finally {
            setCommentsLoading(false);
        }
    };

    const handleDecision = async (id, status) => {
        setCommentActionId(id);
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

            if (!res.ok) {
                showMsg(data.message || "Action failed.", "error");
                return;
            }

            if (data.success) {
                setComments((prev) => prev.filter((comment) => comment.id !== id));
                showMsg(`Comment ${status} successfully.`);
            }
        } catch {
            showMsg("Action failed.", "error");
        } finally {
            setCommentActionId(null);
        }
    };

    if (!token || !isAdmin) {
        return (
            <main className="admin-content">
                <div className="admin-guard-card">
                    <h2 className="brand">Admin access required</h2>
                    <p className="admin-empty">Please log in with an admin account to manage comments.</p>
                    <button className="admin-btn add-product" onClick={() => navigate("/login")}>Go to Login</button>
                </div>
            </main>
        );
    }

    return (
        <main className="admin-content">
            <div className="admin-panel">
                <div className="admin-header">
                    <div>
                        <p className="admin-kicker">Comments</p>
                        <h1 className="admin-title">Pending Comments ({comments.length})</h1>
                    </div>
                    {msg && <p className={`admin-msg ${msgType}`}>{msg}</p>}
                </div>

                <div className="admin-list">
                    {commentsLoading && <p className="admin-empty">Loading...</p>}
                    {!commentsLoading && comments.length === 0 && (
                        <p className="admin-empty">No pending comments</p>
                    )}
                    {comments.map((comment) => (
                        <div className="admin-card" key={comment.id}>
                            <div className="admin-card-meta">
                                <span className="admin-product-name brand">{comment.product_name}</span>
                                <span className="admin-date">
                                    {new Date(comment.created_at).toLocaleDateString("en-US", {
                                        year: "numeric",
                                        month: "short",
                                        day: "numeric",
                                    })}
                                </span>
                            </div>
                            <p className="admin-comment-author">
                                By {comment.author_name || `User #${comment.user_id}`}
                            </p>
                            <p className="admin-card-text">{comment.text}</p>
                            <div className="admin-actions">
                                <button
                                    className="admin-btn approve"
                                    disabled={commentActionId === comment.id}
                                    onClick={() => handleDecision(comment.id, "approved")}
                                >
                                    {commentActionId === comment.id ? "Saving..." : "Approve"}
                                </button>
                                <button
                                    className="admin-btn reject"
                                    disabled={commentActionId === comment.id}
                                    onClick={() => handleDecision(comment.id, "rejected")}
                                >
                                    {commentActionId === comment.id ? "Saving..." : "Reject"}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    );
}
