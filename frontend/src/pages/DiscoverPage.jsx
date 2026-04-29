import "./DiscoverPage.css";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { fetchProducts } from "../services/productAndCartService.js";
import { getCurrentUser, logout } from "../services/authService.js";
import SearchBar from "../components/SearchBar.jsx";
import { CartButton } from "./HomePage";
import brushStroke from "../assets/homePageAssets/brushStroke.png";

const buttonData = [
  { id: "home", label: "Home", path: "/home" },
  { id: "profile", label: "Profile", path: "/home" },
  { id: "discover", label: "Discover", path: "/discover" },
  { id: "favorites", label: "Favorites", path: "/home" },
];

const fallbackCategories = ["Footwear", "Jackets", "Accessories"];

const normalizeSort = (value) => {
  if (["a-z", "z-a", "price_asc", "price_desc"].includes(value)) {
    return value;
  }

  if (value === "discount") {
    return "price_asc";
  }

  return "featured";
};

const getStockStatus = (stockQuantity) => {
  if (stockQuantity <= 0) {
    return { label: "Out of stock", tone: "out" };
  }

  return { label: "In stock", tone: "in" };
};

const SideBarButton = ({ label, isActive, onClick }) => (
  <div className={`sidebar-btn-container ${isActive ? "active" : ""}`} onClick={onClick}>
    {isActive && <img src={brushStroke} className="btn-brush-stroke" alt="" />}
    <button className="sidebar-btn" />
    <span className="btn-text">{label}</span>
  </div>
);

const ProductGridCard = ({ product, onOpen }) => {
  const stock = getStockStatus(product.stock_quantity);

  return (
    <article className="listing-card">
      <div className="listing-image-shell" onClick={onOpen} role="button" tabIndex={0} onKeyDown={(event) => event.key === "Enter" && onOpen()}>
        {product.img ? (
          <img src={product.img} alt={product.title} className="listing-image" />
        ) : (
          <div className="listing-image listing-image-placeholder">No image</div>
        )}
      </div>

      <div className="listing-card-body">
        <div className="listing-card-topline">
          <span className="listing-category">{product.category}</span>
          <span className={`stock-badge ${stock.tone}`}>{stock.label}</span>
        </div>

        <h3 className="listing-title">{product.title}</h3>
        {product.creator && <p className="listing-meta">{product.creator}</p>}
        <p className="listing-description">{product.description || "No description available for this product yet."}</p>

        <div className="listing-card-footer">
          <span className="listing-price">{product.price}</span>
          <button className="listing-action" onClick={onOpen}>
            View details
          </button>
        </div>
      </div>
    </article>
  );
};

const ProductListRow = ({ product, onOpen }) => {
  const stock = getStockStatus(product.stock_quantity);

  return (
    <article className="listing-row">
      {product.img ? (
        <img src={product.img} alt={product.title} className="listing-row-image" />
      ) : (
        <div className="listing-row-image listing-image-placeholder">No image</div>
      )}

      <div className="listing-row-content">
        <div className="listing-row-header">
          <div>
            <div className="listing-row-meta">
              <span className="listing-category">{product.category}</span>
              {product.creator && (
                <>
                  <span className="listing-meta-separator">/</span>
                  <span className="listing-meta">{product.creator}</span>
                </>
              )}
            </div>
            <h3 className="listing-title">{product.title}</h3>
          </div>

          <span className={`stock-badge ${stock.tone}`}>{stock.label}</span>
        </div>

        <p className="listing-description">
          {product.description || "No description available for this product yet."}
        </p>

        <div className="listing-row-footer">
          <span className="listing-price">{product.price}</span>
          <button className="listing-action" onClick={onOpen}>
            View details
          </button>
        </div>
      </div>
    </article>
  );
};

export default function DiscoverPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [filters, setFilters] = useState({
    categories: [],
    minPrice: "",
    maxPrice: "",
    search: location.state?.search ?? "",
    sort: normalizeSort(location.state?.feed),
  });
  const [viewMode, setViewMode] = useState("grid");
  const [products, setProducts] = useState([]);
  const [categorySource, setCategorySource] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  useEffect(() => {
    const user = getCurrentUser();
    setIsLoggedIn(Boolean(user?.token));
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetchProducts()
      .then((data) => {
        if (!cancelled) {
          setCategorySource(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCategorySource([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (location.state?.search !== undefined || location.state?.feed !== undefined) {
      setFilters((current) => ({
        ...current,
        ...(location.state?.search !== undefined ? { search: location.state.search } : {}),
        ...(location.state?.feed !== undefined ? { sort: normalizeSort(location.state.feed) } : {}),
      }));
    }
  }, [location.state]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    const minPrice = filters.minPrice === "" ? 0 : Number(filters.minPrice);
    const maxPrice = filters.maxPrice === "" ? 10000 : Number(filters.maxPrice);

    fetchProducts({
      category: filters.categories,
      min_price: Math.min(minPrice, maxPrice),
      max_price: Math.max(minPrice, maxPrice),
      search: filters.search.trim(),
    })
      .then((data) => {
        if (!cancelled) {
          setProducts(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || "Products could not be loaded.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [filters.categories, filters.maxPrice, filters.minPrice, filters.search]);

  const availableCategories = useMemo(() => {
    const categories = categorySource
      .map((product) => product.category)
      .filter(Boolean);

    if (categories.length === 0) {
      return fallbackCategories;
    }

    return [...new Set(categories)].sort((left, right) => left.localeCompare(right));
  }, [categorySource]);

  const categoryCounts = useMemo(
    () =>
      categorySource.reduce((counts, product) => {
        const category = product.category || "uncategorized";
        counts[category] = (counts[category] || 0) + 1;
        return counts;
      }, {}),
    [categorySource]
  );

  const sortedProducts = useMemo(() => {
    const nextProducts = [...products];

    if (filters.sort === "a-z") {
      return nextProducts.sort((left, right) => left.title.localeCompare(right.title));
    }

    if (filters.sort === "z-a") {
      return nextProducts.sort((left, right) => right.title.localeCompare(left.title));
    }

    if (filters.sort === "price_asc") {
      return nextProducts.sort((left, right) => left.priceValue - right.priceValue);
    }

    if (filters.sort === "price_desc") {
      return nextProducts.sort((left, right) => right.priceValue - left.priceValue);
    }

    return nextProducts;
  }, [filters.sort, products]);

  const activeTab = "discover";
  const activeFilterCount =
    filters.categories.length +
    (filters.minPrice !== "" ? 1 : 0) +
    (filters.maxPrice !== "" ? 1 : 0) +
    (filters.search.trim() !== "" ? 1 : 0) +
    (filters.sort !== "featured" ? 1 : 0);
  const priceSummary =
    filters.minPrice !== "" || filters.maxPrice !== ""
      ? `$${filters.minPrice || 0} - $${filters.maxPrice || "Any"}`
      : "Any price";
  const activeFilterTags = [
    ...(filters.search.trim() !== "" ? [{ key: "search", label: `Search: ${filters.search.trim()}` }] : []),
    ...(filters.sort !== "featured" ? [{ key: "sort", label: `Sort: ${filters.sort.replace("_", " ")}` }] : []),
    ...(filters.minPrice !== "" || filters.maxPrice !== "" ? [{ key: "price", label: priceSummary }] : []),
    ...filters.categories.map((category) => ({ key: category, label: category })),
  ];

  const handleNavigation = (id, path) => {
    if (id !== activeTab) {
      navigate(path);
    }
  };

  const handleCategoryChange = (category) => {
    setFilters((current) => ({
      ...current,
      categories: current.categories.includes(category)
        ? current.categories.filter((item) => item !== category)
        : [...current.categories, category],
    }));
  };

  const clearFilters = () => {
    setFilters((current) => ({
      ...current,
      categories: [],
      minPrice: "",
      maxPrice: "",
      search: "",
      sort: "featured",
    }));
  };

  return (
    <div className="app-shell">
      <div className="sidebar">
        <div className="logo-area">
          <p className="type-eyebrow shell-kicker">dare to wear</p>
          <h2 className="logo-text">THE DARE</h2>
        </div>

        <div className="button-column">
          {buttonData.map((btn) => (
            <SideBarButton
              key={btn.id}
              label={btn.label}
              isActive={activeTab === btn.id}
              onClick={() => handleNavigation(btn.id, btn.path)}
            />
          ))}
        </div>
      </div>

      <div className="content-area discover-split">
        <aside className="filter-panel">
          <div className="filter-panel-header">
            <div className="filter-title-group">
              <h2 className="filter-header">Filters</h2>
              <span className="filter-count-pill">{activeFilterCount}</span>
            </div>
            <button className="clear-filters-btn" onClick={clearFilters}>
              Clear
            </button>
          </div>

          <p className="filter-subtitle">
            {loading ? "Loading..." : `${sortedProducts.length} products visible`}
          </p>

          {activeFilterTags.length > 0 && (
            <div className="active-filter-strip">
              {activeFilterTags.map((tag) => (
                <span key={tag.key} className="active-filter-tag">
                  {tag.label}
                </span>
              ))}
            </div>
          )}

          <div className="filter-group">
            <p className="filter-label">Sort By</p>
            <select
              className="sort-select"
              value={filters.sort}
              onChange={(event) =>
                setFilters((current) => ({ ...current, sort: event.target.value }))
              }
            >
              <option value="featured">Featured</option>
              <option value="a-z">Name: A to Z</option>
              <option value="z-a">Name: Z to A</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>

          <div className="filter-group">
            <p className="filter-label">Price Range</p>
            <div className="price-input-container">
              <label className="price-field">
                <span className="price-field-label">Min</span>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={filters.minPrice}
                  onChange={(event) =>
                    setFilters((current) => ({ ...current, minPrice: event.target.value }))
                  }
                  className="price-input"
                />
              </label>
              <span className="price-to">to</span>
              <label className="price-field">
                <span className="price-field-label">Max</span>
                <input
                  type="number"
                  min="0"
                  placeholder="Any"
                  value={filters.maxPrice}
                  onChange={(event) =>
                    setFilters((current) => ({ ...current, maxPrice: event.target.value }))
                  }
                  className="price-input"
                />
              </label>
            </div>
          </div>

          <div className="filter-group">
            <p className="filter-label">Category</p>
            <div className="category-list">
              {availableCategories.map((category) => (
                <label
                  key={category}
                  className={`check-row ${filters.categories.includes(category) ? "selected" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={filters.categories.includes(category)}
                    onChange={() => handleCategoryChange(category)}
                  />
                  <span className="category-name">{category}</span>
                  <span className="category-count">{categoryCounts[category] || 0}</span>
                </label>
              ))}
            </div>
          </div>
        </aside>

        <main className="results-grid">
          <div className="listing-toolbar">
            <div className="toolbar-copy">
              <p className="type-eyebrow discover-eyebrow">Discover more</p>
              <h1 className="greeting-text">Explore</h1>
              <p className="results-summary">
                {loading ? "Loading products..." : `${sortedProducts.length} products found`}
              </p>
              <SearchBar
                value={filters.search}
                onSearch={(value) =>
                  setFilters((current) => ({ ...current, search: value }))
                }
                placeholder="Search by product name or description"
                className="discover-search"
              />
            </div>

            <div className="toolbar-actions">
              <div className="view-toggle" aria-label="Choose layout">
                <button
                  className={`view-toggle-btn ${viewMode === "grid" ? "active" : ""}`}
                  onClick={() => setViewMode("grid")}
                >
                  Grid
                </button>
                <button
                  className={`view-toggle-btn ${viewMode === "list" ? "active" : ""}`}
                  onClick={() => setViewMode("list")}
                >
                  List
                </button>
              </div>

              <CartButton onClick={() => navigate("/cart")} />
              {isLoggedIn ? (
                <button className="listing-action" onClick={handleLogout}>
                  Logout
                </button>
              ) : (
                <button className="listing-action" onClick={() => navigate("/login")}>
                  Login
                </button>
              )}
            </div>
          </div>

          {loading && <p className="listing-feedback">Loading products...</p>}
          {!loading && error && <p className="listing-feedback error">{error}</p>}
          {!loading && !error && sortedProducts.length === 0 && (
            <p className="listing-feedback">No products match the selected filters.</p>
          )}

          {!loading && !error && sortedProducts.length > 0 && (
            <div className={viewMode === "grid" ? "product-grid-container" : "product-list-container"}>
              {sortedProducts.map((product) =>
                viewMode === "grid" ? (
                  <ProductGridCard
                    key={product.id}
                    product={product}
                    onOpen={() => navigate(`/products/${product.id}`)}
                  />
                ) : (
                  <ProductListRow
                    key={product.id}
                    product={product}
                    onOpen={() => navigate(`/products/${product.id}`)}
                  />
                )
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
