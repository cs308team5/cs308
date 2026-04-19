import React, { useEffect, useState } from "react";
import "./ProductDetailsPage.css";
import { useParams, useNavigate } from "react-router-dom";

export default function ProductDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [ratings, setRatings] = useState([]);

  useEffect(() => {
    // GET PRODUCT
    fetch(`http://localhost:3000/api/products/${id}`)
      .then(res => res.json())
      .then(data => setProduct(data.data))
      .catch(err => console.error(err));

    // GET RATINGS
    fetch(`http://localhost:3000/api/products/${id}/ratings`)
      .then(res => res.json())
      .then(data => setRatings(data.data || []))
      .catch(err => console.error(err));
  }, [id]);

  // ADD TO CART
  const handleAddToCart = async () => {
    await fetch("http://localhost:3000/api/cart", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        product_id: id,
        quantity: 1
      })
    });

    alert("Added to cart");
  };

  // SUBMIT RATING
  const handleSubmitRating = async () => {
    await fetch(`http://localhost:3000/api/products/${id}/rating`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        user_id: 6, // temporary
        rating,
        comment
      })
    });

    alert("Review submitted");

    // refresh ratings
    const res = await fetch(`http://localhost:3000/api/products/${id}/ratings`);
    const data = await res.json();
    setRatings(data.data || []);
  };

  if (!product) return <div className="loading">Loading...</div>;

  const avgRating =
    ratings.length > 0
      ? (ratings.reduce((a, b) => a + b.rating, 0) / ratings.length).toFixed(1)
      : "No ratings";

  return (
    <div className="page">

      {/* NAVBAR */}
      <div className="navbar">
        <div className="nav-left" onClick={() => navigate("/home")}>
          HOME
        </div>

        <div className="nav-center">THE DARE</div>

        <div className="nav-right">
          <span onClick={() => navigate("/profile")}>PROFILE</span>
          <span onClick={() => navigate("/cart")}>CART</span>
        </div>
      </div>

      {/* MAIN */}
      <div className="product-page">

        {/* IMAGE */}
        <div className="image-section">
          <img
            src={product.image_url || "https://via.placeholder.com/800"}
            alt={product.name}
            className="product-img"
          />
        </div>

        {/* INFO */}
        <div className="info-section">

          <div className="meta">ARCHIVE COLLECTION</div>

          <h1 className="title">{product.name}</h1>

          <div className="price">{product.price} TL</div>

          <div className="rating">
            ⭐ {avgRating} ({ratings.length})
          </div>

          {/* STOCK */}
          {!product.inStock && (
            <div className="out-of-stock">OUT OF STOCK</div>
          )}

          {/* ADD TO CART */}
          <button
            className="add-btn"
            onClick={handleAddToCart}
            disabled={!product.inStock}
          >
            {product.inStock ? "ADD TO CART" : "UNAVAILABLE"}
          </button>

          {/* DESCRIPTION */}
          <div className="section">
            <div className="section-title">DESCRIPTION</div>
            <p>{product.description || "No description available."}</p>
          </div>

          {/* ADD REVIEW */}
          <div className="section">
            <div className="section-title">ADD REVIEW</div>

            <div className="review-form">
              <select
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
              >
                {[1,2,3,4,5].map(n => (
                  <option key={n} value={n}>{n} ★</option>
                ))}
              </select>

              <textarea
                placeholder="Write your comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />

              <button onClick={handleSubmitRating}>
                Submit Review
              </button>
            </div>
          </div>

          {/* REVIEWS */}
          <div className="section">
            <div className="section-title">REVIEWS</div>

            {ratings.length === 0 ? (
              <p className="no-reviews">No reviews yet.</p>
            ) : (
              ratings.map(r => (
                <div key={r.id} className="review-card">
                  <div className="review-header">
                    <span>⭐ {r.rating}</span>
                    <span className="date">
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p>{r.comment}</p>
                </div>
              ))
            )}
          </div>

        </div>
      </div>
    </div>
  );
}