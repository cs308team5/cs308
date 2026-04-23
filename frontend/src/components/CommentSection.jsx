import { useEffect, useMemo, useState } from "react";
import { getCurrentUser } from "../services/authService.js";
import { supabase } from "../lib/supabaseClient.js";
import "./CommentSection.css";

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
      aria-label="Choose a rating"
    >
      {[1, 2, 3, 4, 5].map((starNumber) => {
        const fill = Math.max(0, Math.min(1, displayValue - (starNumber - 1)));

        return (
          <button
            key={starNumber}
            type="button"
            className="rs-star-button"
            disabled={disabled}
            onMouseMove={(event) => setHoverValue(getValueFromPointer(event, starNumber))}
            onClick={(event) => onChange(getValueFromPointer(event, starNumber))}
            aria-label={`Rate ${starNumber} stars`}
          >
            <span className="rs-star-shell">☆</span>
            <span
              className="rs-star-fill"
              style={{ width: `${fill * 100}%` }}
              aria-hidden="true"
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

function StaticStars({ value }) {
  return (
    <div className="rs-static-stars" aria-label={`Rated ${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((starNumber) => {
        const fill = Math.max(0, Math.min(1, value - (starNumber - 1)));

        return (
          <span key={starNumber} className="rs-static-star">
            <span className="rs-star-shell">☆</span>
            <span
              className="rs-star-fill"
              style={{ width: `${fill * 100}%` }}
              aria-hidden="true"
            >
              ★
            </span>
          </span>
        );
      })}
    </div>
  );
}

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

      if (!ratingsRes.error) {
        setRatings(ratingsRes.data || []);
      } else {
        console.error("Could not load ratings:", ratingsRes.error);
      }

      if (!commentsRes.error) {
        setComments(commentsRes.data || []);
      } else {
        console.error("Could not load comments:", commentsRes.error);
      }

      const userIds = [
        ...(ratingsRes.data || []).map((rating) => rating.user_id),
        ...(commentsRes.data || []).map((comment) => comment.user_id),
      ];

      const uniqueIds = [...new Set(userIds.filter(Boolean))];

      if (uniqueIds.length === 0) {
        setUserMap({});
        return;
      }

      const { data, error } = await supabase
        .from("customers")
        .select("customer_id, username, name")
        .in("customer_id", uniqueIds);

      if (error) {
        console.error("Could not load usernames:", error);
        return;
      }

      const nextMap = {};
      (data || []).forEach((entry) => {
        nextMap[entry.customer_id] = entry.username || entry.name || "Customer";
      });

      setUserMap(nextMap);
    }

    loadReviews();
  }, [productId]);

  useEffect(() => {
    if (!onStatsChange) return;

    const count = ratings.length;
    const average =
      count > 0
        ? ratings.reduce((sum, rating) => sum + Number(rating.rating || 0), 0) / count
        : 0;

    onStatsChange({ count, average });
  }, [onStatsChange, ratings]);

  const mergedReviews = useMemo(() => {
    const merged = ratings.map((rating) => ({
      id: rating.id,
      userId: rating.user_id,
      rating: Number(rating.rating),
      comment: rating.comment || "",
      createdAt: rating.created_at,
    }));

    comments.forEach((comment) => {
      const exists = merged.some((entry) => entry.userId === comment.user_id);

      if (!exists) {
        merged.push({
          id: `comment-${comment.id}`,
          userId: comment.user_id,
          rating: 0,
          comment: comment.text,
          createdAt: comment.created_at,
        });
      }
    });

    return merged.sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    );
  }, [comments, ratings]);

  const handleSubmit = async () => {
    if (!user) {
      setSubmitMsg("Log in to submit a rating.");
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

      const { error: ratingError } = await supabase.from("ratings").insert({
        user_id: userId,
        product_id: productId,
        rating: ratingValue,
        comment: commentText.trim() || null,
      });

      if (ratingError) {
        throw ratingError;
      }

      if (commentText.trim()) {
        const { error: commentError } = await supabase.from("comments").insert({
          user_id: userId,
          product_id: productId,
          text: commentText.trim(),
          status: "pending",
        });

        if (commentError) {
          throw commentError;
        }
      }

      setRatings((current) => [
        {
          id: `temp-${Date.now()}`,
          user_id: userId,
          rating: ratingValue,
          comment: commentText.trim() || "",
          created_at: new Date().toISOString(),
        },
        ...current.filter((entry) => entry.user_id !== userId),
      ]);

      setUserMap((current) => ({
        ...current,
        [userId]: user.username || user.name || "Customer",
      }));

      setRatingValue(0);
      setCommentText("");
      setSubmitMsg(
        commentText.trim()
          ? "Your rating was submitted. Your comment is pending approval."
          : "Your rating was submitted."
      );
    } catch (error) {
      console.error("Error submitting review:", error);
      setSubmitMsg("Error submitting.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="cs-container">
      <h2 className="cs-title">Ratings & Comments</h2>

      <div className="cs-input-wrap">
        <StarRatingInput
          value={ratingValue}
          onChange={setRatingValue}
          disabled={!user || submitting}
        />

        <textarea
          className="cs-textarea"
          value={commentText}
          onChange={(event) => setCommentText(event.target.value)}
          placeholder={user ? "Write comment..." : "Log in to write a comment"}
          disabled={!user || submitting}
          rows={4}
        />

        <button
          type="button"
          className="cs-submit-btn"
          onClick={handleSubmit}
          disabled={!user || submitting || ratingValue <= 0}
        >
          {submitting ? "Submitting..." : "Submit"}
        </button>

        {submitMsg && <p className="cs-msg">{submitMsg}</p>}
      </div>

      <div className="cs-list">
        {mergedReviews.length === 0 && (
          <p className="cs-empty">No reviews yet.</p>
        )}

        {mergedReviews.map((review) => (
          <div key={review.id} className="cs-card">
            <div className="cs-card-header">
              <div className="cs-author-block">
                <span className="cs-author">{userMap[review.userId] || "Customer"}</span>
                {review.rating > 0 && <StaticStars value={review.rating} />}
              </div>

              <span className="cs-date">
                {new Date(review.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>

            {review.comment ? (
              <p className="cs-text">{review.comment}</p>
            ) : (
              <p className="cs-rating-only">Rated only</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
