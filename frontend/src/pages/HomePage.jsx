import "./HomePage.css";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faShareNodes } from "@fortawesome/free-solid-svg-icons";
import { getCurrentUser } from "../services/authService.js";
import { fetchProducts, addToCart, addToGuestCart } from "../services/productAndCartService.js";
import SearchBar from "../components/SearchBar.jsx";

import brushStroke from "../assets/homePageAssets/brushStroke.png";

const PennantSvg = ({ className, onClick }) => (
  <svg className={className} onClick={onClick} width="60" height="114" viewBox="0 0 60 114" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M0 0 H60 V110.298 C60 112.343 58.3428 114 56.2984 114 C55.4579 114 54.6424 113.714 53.9861 113.189 L30 94 L6.01391 113.189 C5.35758 113.714 4.54208 114 3.70156 114 C1.65725 114 0 112.343 0 110.298 Z"
      stroke="#f3efe7"
      strokeWidth="15"
      paintOrder="stroke fill"
    />
  </svg>
);


export const PolaroidCard = ({ title, creator, img, price = "$50", customStyle, productId, stock_quantity }) => {
  const navigate = useNavigate();
  const inStock = Number(stock_quantity) > 0;
  const [isPinned, setIsPinned] = useState(false);

  const togglePin = (event) => {
    event.stopPropagation();
    setIsPinned((current) => !current);
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

    } catch (err) {
      console.error("Supabase Add to Cart Error:", err);
      alert(`${err.message}`);
    }
  };

  const handleOpenProduct = () => {
    if (!productId) return;
    navigate(`/products/${productId}`);
  };

  return (
    <div className="polaroid-container" onClick={handleOpenProduct} style={{ cursor: "pointer" }}>
      <div className="polaroid-frame">
        <div className="polaroid-image-container" style={customStyle}>
          {img && <img src={img} alt={title} className="polaroid-img" />}
        </div>

        <PennantSvg className={`polaroid-pennant ${isPinned ? "pinned" : ""}`} onClick={togglePin} />

        <div className="polaroid-content">
          <div className="polaroid-content-text">
            <p className="product-name">{title}</p>
            {creator && <p className="creator-name">{creator}</p>}
            <p className={`card-stock ${inStock ? "in-stock" : "out-of-stock"}`}>
              {inStock ? "In stock" : "Out of stock"}
            </p>
          </div>
          <div className="polaroid-content-utility">
            <FontAwesomeIcon icon={faShareNodes} color="var(--blue)" size="lg" />
          </div>
        </div>

        <div className="polaroid-buy-container">
          <span className="reveal-price">{price}</span>
          <button
            className={`reveal-cart-btn ${!inStock ? "disabled" : ""}`}
            onClick={handleAddToCart}
            disabled={!inStock}
          >
            {inStock ? "Add to Cart" : "Out of Stock"}
          </button>
        </div>
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
        ) : items.length === 0 ? (
          <p className="row-loading">No products match this search yet.</p>
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
        {!loading && items.length > 0 && <CheckMoreCard linkedFilter={linkedFilter} />}
        <div className="grid-end-spacer" />
      </div>
    </section>
  );
};

export default function HomePage() {
  const [displayName, setDisplayName] = useState("Guest");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const navigate = useNavigate();


  const handleSearchSubmit = (query) => {
    const trimmedQuery = query.trim();

    navigate("/discover", {
      state: trimmedQuery ? { search: trimmedQuery } : undefined,
    });
  };

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setDisplayName(user.username || user.name || "User");
    }
  }, []);

  useEffect(() => {
    const trimmedQuery = searchQuery.trim();

    if (!trimmedQuery) {
      setSearchSuggestions([]);
      return;
    }

    fetchProducts({ search: trimmedQuery, limit: 6 })
      .then((items) => {
        const uniqueTitles = [...new Set(items.map((item) => item.title))];
        setSearchSuggestions(uniqueTitles);
      })
      .catch(() => setSearchSuggestions([]));
  }, [searchQuery]);

  return (
    <div className="app-shell">

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
              <SearchBar
                value={searchQuery}
                onSearch={setSearchQuery}
                onSubmit={handleSearchSubmit}
                suggestions={searchSuggestions}
                placeholder="Search by product name or description"
                className="homepage-search"
              />
            </div>
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
