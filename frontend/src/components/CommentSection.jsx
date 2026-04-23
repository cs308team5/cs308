import { useState, useEffect } from "react";
import { getCurrentUser } from "../services/authService.js";
import { supabase } from "../lib/supabaseClient.js";
import "./CommentSection.css";

export default function CommentSection({ productId }) {
    const user = getCurrentUser();
    const [comments, setComments] = useState([]);
    const [commentText, setCommentText] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitMsg, setSubmitMsg] = useState("");

    useEffect(() => {
        if (!productId) return;
        supabase
            .from("comments")
            .select("id, text, created_at")
            .eq("product_id", productId)
            .eq("status", "approved")
            .order("created_at", { ascending: false })
            .then(({ data, error }) => {
                if (!error && data) setComments(data);
            });
    }, [productId]);

    const handleSubmit = async () => {
        if (!commentText.trim()) return;

        setSubmitting(true);
        setSubmitMsg("");

        try {
            const stored = localStorage.getItem("user");
            const token = stored ? JSON.parse(stored)?.token : null;

            const res = await fetch("/api/comments", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ productId, text: commentText }),
            });

            const data = await res.json();

            if (data.success) {
                setCommentText("");
                setSubmitMsg("Your comment has been submitted and is pending approval.");
            } else {
                setSubmitMsg(data.message || "Failed to submit.");
            }
        } catch {
            setSubmitMsg("Could not connect to server.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="cs-container">
            <h2 className="cs-title brand">Comments</h2>

            {/* INPUT */}
            <div className="cs-input-wrap">
                <textarea
                    className="cs-textarea"
                    placeholder={user ? "Write a comment..." : "Log in to write a comment"}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    disabled={!user}
                    rows={3}
                />
                <button
                    className="cs-submit-btn"
                    onClick={handleSubmit}
                    disabled={submitting || !user || !commentText.trim()}
                >
                    {submitting ? "Submitting..." : "Submit"}
                </button>
                {submitMsg && <p className="cs-msg">{submitMsg}</p>}
            </div>

            {/* COMMENT LIST */}
            <div className="cs-list">
                {comments.length === 0 && (
                    <p className="cs-empty">No approved comments yet.</p>
                )}
                {comments.map((c) => (
                    <div className="cs-card" key={c.id}>
                        <div className="cs-card-header">
                            <span className="cs-author">Customer</span>
                            <span className="cs-date">
                                {new Date(c.created_at).toLocaleDateString("en-US", {
                                    year: "numeric", month: "short", day: "numeric",
                                })}
                            </span>
                        </div>
                        <p className="cs-text">{c.text}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
