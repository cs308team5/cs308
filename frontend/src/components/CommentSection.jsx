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
      aria-label="Choose a rating between 0.5 and 5 stars"
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
            aria-label={`Rate ${starNumber} star${starNumber === 1 ? "" : "s"}`}
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
        {value > 0 ? `${value.toFixed(1)} / 5` : "Select a rating"}
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
      const [ratingsResponse, commentsResponse] = await Promise.all([
        supabase
          .from("ratings")
          .select("id, user_id, product_id, rating, comment, created_at")
          .eq("product_id", productId)
          .order("created_at", { ascending: false }),
        supabase
          .from("comments")
          .select("id, user_id, product_id, text, status, created_at")
          .eq("product_id", productId)
          .eq("status", "approved")
          .order("created_at", { ascending: false }),
      ]);

      if (ratingsResponse.error) {
        console.error("Could not load ratings:", ratingsResponse.error);
      } else {
        setRatings(ratingsResponse.data || []);
      }

      if (commentsResponse.error) {
        console.error("Could not load comments:", commentsResponse.error);
      } else {
        setComments(commentsResponse.data || []);
      }

      const userIds = Array.from(
        new Set([
          ...(ratingsResponse.data || []).map((entry) => entry.user_id),
          ...(commentsResponse.data || []).map((entry) => entry.user_id),
        ].filter(Boolean))
      );

      if (userIds.length === 0) {
        setUserMap({});
        return;
      }

      const { data: users, error: usersError } = await supabase
        .from("customers")
        .select("customer_id, username, name")
        .in("customer_id", userIds);

      if (usersError) {
        console.error("Could not load review authors:", usersError);
        return;
      }

      const nextUserMap = {};
      (users || []).forEach((entry) => {
        nextUserMap[entry.customer_id] = entry.username || entry.name || "Customer";
      });
      setUserMap(nextUserMap);
    }

    loadReviews();
  }, [productId]);

  const mergedReviews = useMemo(() => {
    const approvedCommentByUser = new Map();
    comments.forEach((entry) => {
      if (!approvedCommentByUser.has(entry.user_id)) {
        approvedCommentByUser.set(entry.user_id, entry);
      }
    });

    const merged = ratings.map((entry) => {
      const matchedComment =
        entry.comment?.trim() ? { text: entry.comment } : approvedCommentByUser.get(entry.user_id);

      return {
        id: entry.id,
        userId: entry.user_id,
        rating: Number(entry.rating),
        comment: matchedComment?.text?.trim() || "",
        createdAt: matchedComment?.created_at || entry.created_at,
      };
    });

    comments.forEach((entry) => {
      const alreadyIncluded = merged.some((review) => review.userId === entry.user_id);
      if (!alreadyIncluded) {
        merged.push({
          id: `comment-${entry.id}`,
          userId: entry.user_id,
          rating: 0,
          comment: entry.text,
          createdAt: entry.created_at,
        });
      }
    });

    return merged.sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    );
  }, [comments, ratings]);

  useEffect(() => {
    if (!onStatsChange) return;

    const count = ratings.length;
    const average =
      count > 0
        ? ratings.reduce((sum, entry) => sum + Number(entry.rating || 0), 0) / count
        : 0;

    onStatsChange({
      count,
      average,
    });
  }, [onStatsChange, ratings]);

  const handleSubmit = async () => {
    if (!user) {
      setSubmitMsg("Please log in to submit a rating.");
      return;
    }

    if (ratingValue <= 0) {
      setSubmitMsg("Please choose a star rating first.");
      return;
    }

    setSubmitting(true);
    setSubmitMsg("");

    try {
      const userId = user.customer_id ?? user.customerId;

      const { data: existingRating, error: existingRatingError } = await supabase
        .from("ratings")
        .select("id")
        .eq("product_id", productId)
        .eq("user_id", userId)
        .maybeSingle();

      if (existingRatingError) {
        throw existingRatingError;
      }

      const ratingPayload = {
        user_id: userId,
        product_id: productId,
        rating: ratingValue,
        comment: commentText.trim() || null,
      };

      let ratingWriteError = null;

      if (existingRating?.id) {
        const { error } = await supabase
          .from("ratings")
          .update(ratingPayload)
          .eq("id", existingRating.id);
        ratingWriteError = error;
      } else {
        const { error } = await supabase.from("ratings").insert(ratingPayload);
        ratingWriteError = error;
      }

      if (ratingWriteError) {
        throw ratingWriteError;
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

      const username = user.username || user.name || "You";
      setRatings((current) => {
        const next = current.filter((entry) => entry.user_id !== userId);
        return [
          {
            id: existingRating?.id || `temp-${Date.now()}`,
            user_id: userId,
            product_id: productId,
            rating: ratingValue,
            comment: commentText.trim() || null,
            created_at: new Date().toISOString(),
          },
          ...next,
        ];
      });
      setUserMap((current) => ({
        ...current,
        [userId]: username,
      }));

      setRatingValue(0);
      setCommentText("");
      setSubmitMsg(
        commentText.trim()
          ? "Your rating was saved. Your comment is pending approval."
          : "Your rating was saved."
      );
    } catch (error) {
      console.error("Could not submit review:", error);
      setSubmitMsg(error.message || "Could not submit your review.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="cs-container">
      <h2 className="cs-title brand">Ratings & Comments</h2>

      <div className="cs-input-wrap">
        <StarRatingInput
          value={ratingValue}
          onChange={setRatingValue}
          disabled={!user || submitting}
        />

        <textarea
          className="cs-textarea"
          placeholder={user ? "Add a comment if you want..." : "Log in to rate and comment"}
          value={commentText}
          onChange={(event) => setCommentText(event.target.value)}
          disabled={!user || submitting}
          rows={4}
        />

        <button
          className="cs-submit-btn"
          onClick={handleSubmit}
          disabled={!user || submitting || ratingValue <= 0}
        >
          {submitting ? "Submitting..." : "Submit Rating"}
        </button>

        {submitMsg && <p className="cs-msg">{submitMsg}</p>}
      </div>

      <div className="cs-list">
        {mergedReviews.length === 0 && (
          <p className="cs-empty">No reviews yet.</p>
        )}

        {mergedReviews.map((review) => (
          <div className="cs-card" key={review.id}>
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
              <p className="cs-rating-only">Rated this product.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
