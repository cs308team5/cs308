import { useEffect, useMemo, useState } from "react";
import { getCurrentUser } from "../services/authService.js";
import { supabase } from "../lib/supabaseClient.js";
import "./CommentSection.css";

const STAR_PATH =
  "M12 1.8l3.09 6.26 6.91 1-5 4.87 1.18 6.89L12 17.77 5.82 20.82 7 13.93 2 9.06l6.91-1L12 1.8z";

function StarIcon({ variant }) {
  if (variant === "full") {
    return (
      <svg viewBox="0 0 24 24" className="rs-star-svg" aria-hidden="true">
        <path d={STAR_PATH} className="rs-star-full" />
      </svg>
    );
  }

  if (variant === "half") {
    return (
      <svg viewBox="0 0 24 24" className="rs-star-svg" aria-hidden="true">
        <defs>
          <clipPath id="half-star-fill">
            <rect x="0" y="0" width="12" height="24" />
          </clipPath>
        </defs>
        <path d={STAR_PATH} className="rs-star-empty" />
        <path d={STAR_PATH} className="rs-star-full" clipPath="url(#half-star-fill)" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="rs-star-svg" aria-hidden="true">
      <path d={STAR_PATH} className="rs-star-empty" />
    </svg>
  );
}

function getStarVariant(value, starNumber) {
  if (value >= starNumber) {
    return "full";
  }

  if (value >= starNumber - 0.5) {
    return "half";
  }

  return "empty";
}

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
      {[1, 2, 3, 4, 5].map((starNumber) => (
        <button
          key={starNumber}
          type="button"
          className="rs-star-button"
          disabled={disabled}
          onMouseMove={(event) =>
            setHoverValue(getValueFromPointer(event, starNumber))
          }
          onClick={(event) => onChange(getValueFromPointer(event, starNumber))}
          aria-label={`Rate ${starNumber} stars`}
        >
          <StarIcon variant={getStarVariant(displayValue, starNumber)} />
        </button>
      ))}

      <span className="rs-selected-rating">
        {value > 0 ? `${value.toFixed(1)} / 5` : "Select rating"}
      </span>
    </div>
  );
}

function StaticStars({ value }) {
  return (
    <div className="rs-static-stars" aria-label={`Rated ${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((starNumber) => (
        <span key={starNumber} className="rs-static-star">
          <StarIcon variant={getStarVariant(value, starNumber)} />
        </span>
      ))}
    </div>
  );
}

export default function CommentSection({ productId, onStatsChange }) {
  const user = getCurrentUser();
  const userId = user?.customer_id ?? user?.customerId;

  const [ratings, setRatings] = useState([]);
  const [comments, setComments] = useState([]);
  const [userMap, setUserMap] = useState({});
  const [ratingValue, setRatingValue] = useState(0);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState("");
  const [canReview, setCanReview] = useState(false);
  const [eligibilityLoaded, setEligibilityLoaded] = useState(false);

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
    async function loadEligibility() {
      if (!productId || !user?.token) {
        setCanReview(false);
        setEligibilityLoaded(Boolean(!user));
        return;
      }

      try {
        const response = await fetch(`/api/products/${productId}/review-eligibility`, {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        });

        const data = await response.json();
        setCanReview(Boolean(response.ok && data.eligible));
      } catch (error) {
        console.error("Could not check review eligibility:", error);
        setCanReview(false);
      } finally {
        setEligibilityLoaded(true);
      }
    }

    loadEligibility();
  }, [productId, user]);

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
    const approvedCommentsByUser = new Map(
      comments.map((comment) => [comment.user_id, comment]),
    );

    const merged = ratings.map((rating) => {
      const approvedComment = approvedCommentsByUser.get(rating.user_id);

      return {
        id: rating.id,
        userId: rating.user_id,
        rating: Number(rating.rating),
        comment: approvedComment?.text || "",
        createdAt: approvedComment?.created_at || rating.created_at,
      };
    });

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
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );
  }, [comments, ratings]);

  const handleSubmit = async () => {
    if (!user?.token || !userId) {
      setSubmitMsg("Log in to submit a rating.");
      return;
    }

    if (!canReview) {
      setSubmitMsg("Only customers who purchased this product can rate or comment.");
      return;
    }

    if (ratingValue <= 0) {
      setSubmitMsg("Select a rating.");
      return;
    }

    setSubmitting(true);
    setSubmitMsg("");

    try {
      const ratingResponse = await fetch(`/api/products/${productId}/rating`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          rating: ratingValue,
        }),
      });

      const ratingData = await ratingResponse.json();

      if (!ratingResponse.ok) {
        throw new Error(ratingData.message || "Could not submit rating.");
      }

      if (commentText.trim()) {
        const commentResponse = await fetch("/api/comments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify({
            productId,
            text: commentText.trim(),
          }),
        });

        const commentData = await commentResponse.json();

        if (!commentResponse.ok) {
          throw new Error(commentData.message || "Could not submit comment.");
        }
      }

      setRatings((current) => [
        {
          id: ratingData.data?.id ?? `temp-${Date.now()}`,
          user_id: userId,
          rating: ratingValue,
          created_at: ratingData.data?.created_at ?? new Date().toISOString(),
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
          : "Your rating was submitted.",
      );
    } catch (error) {
      console.error("Error submitting review:", error);
      setSubmitMsg(error.message || "Error submitting.");
    } finally {
      setSubmitting(false);
    }
  };

  const placeholderText = !user
    ? "Log in to write a comment"
    : canReview
      ? "Write comment..."
      : "Only customers who purchased this product can comment";

  const reviewDisabled = !user || !canReview || submitting;

  return (
    <div className="cs-container">
      <h2 className="cs-title">Ratings & Comments</h2>

      <div className="cs-input-wrap">
        <StarRatingInput
          value={ratingValue}
          onChange={setRatingValue}
          disabled={reviewDisabled}
        />

        <textarea
          className="cs-textarea"
          value={commentText}
          onChange={(event) => setCommentText(event.target.value)}
          placeholder={placeholderText}
          disabled={reviewDisabled}
          rows={4}
        />

        <button
          type="button"
          className="cs-submit-btn"
          onClick={handleSubmit}
          disabled={reviewDisabled || ratingValue <= 0}
        >
          {submitting ? "Submitting..." : "Submit"}
        </button>

        {!user && <p className="cs-msg cs-msg-muted">Log in to rate or comment.</p>}
        {user && eligibilityLoaded && !canReview && (
          <p className="cs-msg cs-msg-muted">
            Only customers who purchased this product can rate or comment.
          </p>
        )}
        {submitMsg && <p className="cs-msg">{submitMsg}</p>}
      </div>

      <div className="cs-list">
        {mergedReviews.length === 0 && <p className="cs-empty">No reviews yet.</p>}

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
