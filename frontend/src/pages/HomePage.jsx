import "./HomePage.css";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeart as faHeartRegular } from "@fortawesome/free-regular-svg-icons";
import { faCartShopping, faHeart as faHeartSolid, faShareNodes } from "@fortawesome/free-solid-svg-icons";
import { getCurrentUser, logout } from "../services/authService.js";
import { addToCart, addToGuestCart, fetchProducts } from "../services/productAndCartService.js";
import SearchBar from "../components/SearchBar.jsx";

import brushStroke from "../assets/homePageAssets/brushStroke.png";

const PennantSvg = ({ className, onClick }) => (
  <svg className={className} onClick={onClick} width="60" height="114" viewBox="0 0 60 114" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M0 0 H60 V110.298 C60 112.343 58.3428 114 56.2984 114 C55.4579 114 54.6424 113.714 53.9861 113.189 L30 94 L6.01391 113.189 C5.35758 113.714 4.54208 114 3.70156 114 C1.65725 114 0 112.343 0 110.298 Z"
      stroke="#f0eee7"
      strokeWidth="15"
      paintOrder="stroke fill"
    />
  </svg>
);

const buttonData = [
  { id: "home", label: "Home", path: "/home" },
  { id: "profile", label: "Profile", path: "/home" },
  { id: "discover", label: "Discover", path: "/discover" },
  { id: "favorites", label: "Favorites", path: "/home" },
];

const SideBarButton = ({ label, isActive, onClick }) => (
  <div className={`sidebar-btn-container ${isActive ? "active" : ""}`} onClick={onClick}>
    {isActive && <img src={brushStroke} className="btn-brush-stroke" alt="" />}
    <button className="sidebar-btn" />
    <span className="btn-text">{label}</span>
  </div>
);

export const CartButton = ({ onClick }) => {
  const [count, setCount] = useState(0);

  const loadCartCount = () => {
    const user = getCurrentUser();
    if (!user?.customer_id) {
      const guestCart = JSON.parse(localStorage.getItem("guest_cart") ?? "[]");
      setCount(guestCart.reduce((sum, item) => sum + item.quantity, 0));
      return;
    }

    import("../services/productAndCartService.js").then(({ fetchCart }) => {
      fetchCart(user.customer_id)
        .then((items) => setCount(items.reduce((sum, item) => sum + item.quantity, 0)))
        .catch(console.error);
    });
  };

  useEffect(() => {
    loadCartCount();
    window.addEventListener("cartUpdated", loadCartCount);
    return () => window.removeEventListener("cartUpdated", loadCartCount);
  }, []);

  return (
    <button className="cart-btn" onClick={onClick}>
      <FontAwesomeIcon icon={faCartShopping} />
      Cart
      {count > 0 && <span className="cart-count">{count > 99 ? "99+" : count}</span>}
    </button>
  );
};

export const PolaroidCard = ({ title, creator, img, price = "$50", customStyle, productId, stock_quantity }) => {
  const navigate = useNavigate();
  const inStock = Number(stock_quantity) > 0;
  const [isLiked, setIsLiked] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

  const togglePin = (event) => {
    event.stopPropagation();
    setIsPinned((current) => !current);
  };

  const toggleLike = (event) => {
    event.stopPropagation();
    setIsLiked((current) => !current);
  };

  const handleAddToCart = async (event) => {
    event.stopPropagation();
    if (!inStock) return;

    const user = getCurrentUser();

    try {
      if (!user) {
        addToGuestCart({
          id: productId,
          title,
          img,
          price,
          stock_quantity,
          description: "",
        });
      } else {
        await addToCart(user.customer_id, productId);
      }

      window.dispatchEvent(new Event("cartUpdated"));
    } catch (err) {
      console.error("Supabase Add to Cart Error:", err);
      alert(`${err.message}`);
    }
  };

  return (
    <div className="polaroid-container" onClick={() => navigate(`/products/${productId}`)} style={{ cursor: "pointer" }}>
      <div className="polaroid-frame">
        <div className="polaroid-image-container" style={customStyle}>
          {img && <img src={img} alt={title} className="polaroid-img" />}
        </div>

        <PennantSvg className={`polaroid-pennant ${isPinned ? "pinned" : ""}`} onClick={togglePin} />

        <div className="polaroid-content">
          <div className="polaroid-content-text">
            <p className="product-name">{title}</p>
            <p className="creator-name">{creator}</p>
            <p className={`card-stock ${inStock ? "in-stock" : "out-of-stock"}`}>
              {inStock ? `${stock_quantity} in stock` : "Out of stock"}
            </p>
          </div>

          <div className="polaroid-content-utility">
            <FontAwesomeIcon icon={faShareNodes} color="var(--blue)" size="lg" />
            <div className="like-container">
              <p className="like-count">123</p>
              <FontAwesomeIcon
                className={isLiked ? "heart-pop" : ""}
                onClick={toggleLike}
                style={{ cursor: "pointer" }}
                icon={isLiked ? faHeartSolid : faHeartRegular}
                color={isLiked ? "var(--pink)" : "var(--blue)"}
                size="lg"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="polaroid-buy-container">
        <span className="reveal-price">{price}</span>
        <button className={`reveal-cart-btn ${!inStock ? "disabled" : ""}`} onClick={handleAddToCart} disabled={!inStock}>
          {inStock ? "Add to Cart" : "Out of Stock"}
        </button>
      </div>
    </div>
  );
};

const CheckMoreCard = ({ linkedFilter }) => {
  const navigate = useNavigate();

  return (
    <div className="polaroid-container" onClick={() => navigate("/discover", { state: { feed: linkedFilter } })}>
      <div className="polaroid-frame check-more-frame">
        <p className="check-more-text">Check More</p>
        <div className="check-more-arrow">→</div>
      </div>
    </div>
  );
};

const PolaroidRow = ({ title, sort, linkedFilter, searchQuery }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    fetchProducts({ sort, limit: 5, search: searchQuery })
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [searchQuery, sort]);

  return (
    <section className="polaroid-row-container">
      <div className="row-heading">
        <p className="type-eyebrow row-eyebrow">Curated selection</p>
        <h2 className="row-title">{title}</h2>
      </div>

      <div className="polaroid-grid" ref={scrollRef}>
        {loading ? (
          <p className="row-loading">Loading...</p>
        ) : (
          items.map((item) => (
            <PolaroidCard
              key={item.id}
              title={item.title}
              creator={item.creator}
              img={item.img}
              price={item.price}
              productId={item.id}
              stock_quantity={item.stock_quantity}
            />
          ))
        )}
        {!loading && <CheckMoreCard linkedFilter={linkedFilter} />}
        <div className="grid-end-spacer" />
      </div>
    </section>
  );
};

export default function HomePage() {
  const [displayName, setDisplayName] = useState("Guest");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const activeTab = "home";

  const handleNavigation = (id, path) => {
    if (id !== activeTab) {
      navigate(path);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  useEffect(() => {
    const user = getCurrentUser();
    if (user?.username) {
      setIsLoggedIn(true);
      setDisplayName(user.username);
    }
  }, []);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="logo-area">
          <p className="type-eyebrow shell-kicker">Editorial retail</p>
          <h2 className="logo-text">THE DARE</h2>
        </div>

        <div className="button-column">
          {buttonData.map((btn) => (
            <SideBarButton key={btn.id} label={btn.label} isActive={activeTab === btn.id} onClick={() => handleNavigation(btn.id, btn.path)} />
          ))}
        </div>
      </aside>

      <main className="content-area home-content">
        <div className="home-hero">
          <div className="home-hero-copy">
            <p className="type-eyebrow home-eyebrow">Recommended for today</p>
            <h1 className="greeting-text">
              Hi <span className="username-highlight">{displayName}</span>
            </h1>
            <p className="home-subtitle">
              A refined edit of pieces worth opening, saving, and actually buying.
            </p>
            <div className="home-search-wrap">
              <SearchBar onSearch={setSearchQuery} value={searchQuery} placeholder="Search the current edit..." />
            </div>
          </div>

          <div className="header-actions">
            <CartButton onClick={() => navigate("/cart")} />
            {isLoggedIn && (
              <button className="logout-btn" onClick={handleLogout}>
                Logout
              </button>
            )}
          </div>
        </div>

        <div className="feed-column">
          <PolaroidRow title="For Your Recent Tastes" sort="recent_taste" linkedFilter="recent_taste" searchQuery={searchQuery} />
          <PolaroidRow title="Some Recommendations From Us" sort="recommended" linkedFilter="recommended" searchQuery={searchQuery} />
          <PolaroidRow title="Everyone's New Favorites" sort="top_rated" linkedFilter="top_rated" searchQuery={searchQuery} />
          <PolaroidRow title="From Who You Follow" sort="followed" linkedFilter="followed" searchQuery={searchQuery} />
          <PolaroidRow title="Cheaper Than Ever" sort="discount" linkedFilter="discount" searchQuery={searchQuery} />
        </div>
      </main>
    </div>
  );
}
