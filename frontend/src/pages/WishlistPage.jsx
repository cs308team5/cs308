import "./WishlistPage.css";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../services/authService.js";
import { fetchWishlist, removeFromWishlist } from "../services/wishlistService.js";
import { PolaroidCard } from "./HomePage.jsx";

export default function WishlistPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadWishlist = async () => {
    const user = getCurrentUser();

    if (!user?.customer_id) {
      navigate("/login");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await fetchWishlist(user.customer_id);
      setItems(data);
    } catch (err) {
      setError(err.message || "Wishlist could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWishlist();
  }, []);

  const handleRemove = async (productId) => {
    const user = getCurrentUser();
    if (!user?.customer_id) {
      navigate("/login");
      return;
    }

    const previous = items;
    setItems((current) => current.filter((item) => String(item.product_id) !== String(productId)));

    try {
      await removeFromWishlist(user.customer_id, productId);
    } catch (err) {
      setItems(previous);
      alert(err.message);
    }
  };

  return (
    <div className="app-shell">
      <main className="content-area wishlist-page">
        <div className="wishlist-header">
          <p className="type-eyebrow">Saved pieces</p>
          <h1 className="greeting-text">Wishlist</h1>
          <p className="wishlist-summary">
            {loading ? "Loading..." : `${items.length} products saved`}
          </p>
        </div>

        {loading && <p className="wishlist-feedback">Loading wishlist...</p>}
        {!loading && error && <p className="wishlist-feedback error">{error}</p>}
        {!loading && !error && items.length === 0 && (
          <p className="wishlist-feedback">Your wishlist is empty.</p>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="wishlist-polaroid-grid">
            {items.map((item) => (
              <PolaroidCard
                key={item.product_id}
                title={item.title}
                creator={item.creator}
                img={item.img}
                price={item.price}
                productId={item.product_id}
                stock_quantity={item.stock_quantity}
                isWishlisted
                onToggleWishlist={handleRemove}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
