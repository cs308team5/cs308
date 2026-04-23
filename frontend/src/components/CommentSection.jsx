import { useEffect, useMemo, useState } from "react";
import { getCurrentUser } from "../services/authService.js";
import { supabase } from "../lib/supabaseClient.js";
import "./CommentSection.css";

/* Interactive Star Input */
function StarRatingInput({ value, onChange, disabled }) {
  const [hoverValue, setHoverValue] = useState(null);
  const displayValue = hoverValue ?? value;

  const getValueFromPointer = (event, starNumber) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const isLeftHalf = event.clientX - rect.left < rect.width / 2;
    return isLeftHalf ? starNumber - 0.5 : starNumber;
  };

  return (
    <div
      className="rs-star-input"
      onMouseLeave={() => setHoverValue(null)}
    >
      {[1, 2, 3, 4, 5].map((starNumber) => {
        const fill = Math.max(0, Math.min(1, displayValue - (starNumber - 1)));

        return (
          <button
            key={starNumber}
            type="button"
            className="rs-star-button"
            disabled={disabled}
            onMouseMove={(e) => setHoverValue(getValueFromPointer(e, starNumber))}
            onClick={(e) => onChange(getValueFromPointer(e, starNumber))}
          >
            <span className="rs-star-shell">☆</span>
            <span
              className="rs-star-fill"
              style={{ width: `${fill * 100}%` }}
            >
              ★
            </span>
          </button>
        );
      })}

      <span className="rs-selected-rating">
        {value > 0 ? `${value.toFixed(1)} / 5` : "Select rating"}
      </span>
    </div>
  );
}

/* Static Stars */
function StaticStars({ value }) {
  return (
    <div className="rs-static-stars">
      {[1, 2, 3, 4, 5].map((starNumber) => {
        const fill = Math.max(0, Math.min(1, value - (starNumber - 1)));

        return (
          <span key={starNumber} className="rs-static-star">
            <span className="rs-star-shell">☆</span>
            <span
              className="rs-star-fill"
              style={{ width: `${fill * 100}%` }}
            >
              ★
            </span>
          </span>
        );
      })}
    </div>
  );
}

/* Main Component */
export default function CommentSection({ productId, onStatsChange }) {
  const user = getCurrentUser();

  const [ratings, setRatings] = useState([]);
  const [comments, setComments] = useState([]);
  const [userMap, setUserMap] = useState({});

  const [ratingValue, setRatingValue] = useState(0);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState("");

  useEffect(() => {
    if (!productId) return;

    async function loadReviews() {
      const [ratingsRes, commentsRes] = await Promise.all([
        supabase
          .from("ratings")
          .select("*")
          .eq("product_id", productId)
          .order("created_at", { ascending: false }),

        supabase
          .from("comments")
          .select("*")
          .eq("product_id", productId)
          .eq("status", "approved")
          .order("created_at", { ascending: false }),
      ]);

      if (!ratingsRes.error) setRatings(ratingsRes.data || []);
      if (!commentsRes.error) setComments(commentsRes.data || []);

      /* 👤 Load user names */
      const userIds = [
        ...(ratingsRes.data || []).map((r) => r.user_id),
        ...(commentsRes.data || []).map((c) => c.user_id),
      ];

      const uniqueIds = [...new Set(userIds)];

      if (uniqueIds.length > 0) {
        const { data } = await supabase
          .from("customers")
          .select("customer_id, username, name")
          .in("customer_id", uniqueIds);

        const map = {};
        (data || []).forEach((u) => {
          map[u.customer_id] = u.username || u.name || "Customer";
        });

        setUserMap(map);
      }
    }

    loadReviews();
  }, [productId]);

  /* Stats */
  useEffect(() => {
    if (!onStatsChange) return;

    const count = ratings.length;
    const avg =
      count > 0
        ? ratings.reduce((sum, r) => sum + Number(r.rating || 0), 0) / count
        : 0;

    onStatsChange({ count, average: avg });
  }, [ratings]);

  /* Merge reviews */
  const mergedReviews = useMemo(() => {
    const merged = ratings.map((r) => ({
      id: r.id,
      userId: r.user_id,
      rating: Number(r.rating),
      comment: r.comment || "",
      createdAt: r.created_at,
    }));

    comments.forEach((c) => {
      const exists = merged.some((m) => m.userId === c.user_id);
      if (!exists) {
        merged.push({
          id: `c-${c.id}`,
          userId: c.user_id,
          rating: 0,
          comment: c.text,
          createdAt: c.created_at,
        });
      }
    });

    return merged.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  }, [ratings, comments]);

  /* Submit */
  const handleSubmit = async () => {
    if (!user) {
      setSubmitMsg("Login required.");
      return;
    }

    if (ratingValue <= 0) {
      setSubmitMsg("Select a rating.");
      return;
    }

    setSubmitting(true);
    setSubmitMsg("");

    try {
      const userId = user.customer_id ?? user.customerId;

      await supabase.from("ratings").insert({
        user_id: userId,
        product_id: productId,
        rating: ratingValue,
        comment: commentText || null,
      });

      if (commentText.trim()) {
        await supabase.from("comments").insert({
          user_id: userId,
          product_id: productId,
          text: commentText,
          status: "pending",
        });
      }

      setSubmitMsg("Submitted!");
      setRatingValue(0);
      setCommentText("");

    } catch (err) {
      setSubmitMsg("Error submitting.");
      console.error(err);
    }

    setSubmitting(false);
  };

  return (
    <div className="cs-container">
      <h2>Ratings & Comments</h2>

      <StarRatingInput
        value={ratingValue}
        onChange={setRatingValue}
        disabled={!user || submitting}
      />

      <textarea
        value={commentText}
        onChange={(e) => setCommentText(e.target.value)}
        placeholder="Write comment..."
        disabled={!user || submitting}
      />

      <button onClick={handleSubmit} disabled={submitting}>
        Submit
      </button>

      {submitMsg && <p>{submitMsg}</p>}

      <div>
        {mergedReviews.map((r) => (
          <div key={r.id}>
            <strong>{userMap[r.userId] || "User"}</strong>
            {r.rating > 0 && <StaticStars value={r.rating} />}
            <p>{r.comment || "Rated only"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}