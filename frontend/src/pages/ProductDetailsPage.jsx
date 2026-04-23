import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CommentSection from "../components/CommentSection";
import "./ProductDetailsPage.css";

export default function ProductDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [ratings, setRatings] = useState([]);

  useEffect(() => {
    fetch(`http://localhost:3000/api/products/${id}`)
      .then((res) => res.json())
      .then((data) => setProduct(data.data))
      .catch((err) => console.error(err));

    fetch(`http://localhost:3000/api/products/${id}/ratings`)
      .then((res) => res.json())
      .then((data) => setRatings(data.data || []))
      .catch((err) => console.error(err));
  }, [id]);

  const handleAddToCart = async () => {
    await fetch("http://localhost:3000/api/cart", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        product_id: id,
        quantity: 1,
      }),
    });

    alert("Added to cart");
  };

  if (!product) return <div className="loading">Loading...</div>;

  const avgRating =
    ratings.length > 0
      ? (ratings.reduce((sum, current) => sum + current.rating, 0) / ratings.length).toFixed(1)
      : "No ratings";

  return (
    <div className="page">
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

      <div className="product-page">
        <div className="image-section">
          <img
            src={product.image_url || "https://via.placeholder.com/800"}
            alt={product.name}
            className="product-img"
          />
        </div>

        <div className="info-section">
          <div className="meta">ARCHIVE COLLECTION</div>

          <h1 className="title">{product.name}</h1>

          <div className="price">{product.price} TL</div>

          <div className="rating">★ {avgRating} ({ratings.length})</div>

          {!product.inStock && <div className="out-of-stock">OUT OF STOCK</div>}

          <button
            className="add-btn"
            onClick={handleAddToCart}
            disabled={!product.inStock}
          >
            {product.inStock ? "ADD TO CART" : "UNAVAILABLE"}
          </button>

          <div className="section">
            <div className="section-title">DESCRIPTION</div>
            <p>{product.description || "No description available."}</p>
          </div>

          <CommentSection productId={product.id} />
        </div>
      </div>
    </div>
  );
}
