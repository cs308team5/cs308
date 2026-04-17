import "./DiscoverPage.css"; // We'll create this next
import { useState, useEffect } from "react";
import {useLocation, useNavigate} from "react-router-dom";
import { fetchProducts } from "../services/productAndCartService.js";

import { PolaroidCard, CartButton } from "./HomePage";

// Note: In a real project, move buttonData to a separate constants file
const buttonData = [
    { id: "home",      label: "Home",       path: "/home"},
    { id: "profile",   label: "Profile",    path: "/home"},
    { id: "discover",  label: "Discover",   path:"/discover"},
    { id: "favorites", label: "Favorites",  path: "/home"}
];

import brushStroke from "../assets/homePageAssets/brushStroke.png";


const SideBarButton = ({ label, isActive, onClick}) => {
    return (
        <div className={`sidebar-btn-container ${isActive ? "active" : ""}`} onClick={onClick}>
            {isActive && <img src={brushStroke} className="btn-brush-stroke" alt="" />}
            <button className="sidebar-btn" />
            <span className="btn-text">{label}</span>
        </div>
    );
};

export default function DiscoverPage() {

    // Checking if came from a checkMore card
    const location = useLocation();
    const navigate = useNavigate();

    const [filters, setFilters] = useState({
        search: "",
        category: [],
        min_price: 0,
        max_price: 500,
        sort: location.state?.feed || "all"
    });

    const [products, setProducts] = useState([]);
const [loading, setLoading]   = useState(true);
const [error, setError]       = useState(null);

useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetchProducts({
        category:  filters.category,
        min_price: Number(filters.minPrice) || 0,
        max_price: Number(filters.maxPrice) || 10000,
        search:    filters.search,
        sort:      filters.sort,
    })
        .then((data) => { if (!cancelled) setProducts(data); })
        .catch((err) => { if (!cancelled) setError(err.message); })
        .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
    }, [filters]);


    const handleCategoryChange = (cat) => {
        setFilters(prev => ({
            ...prev,
            category: prev.category.includes(cat)
                ? prev.category.filter(c => c !== cat)
                : [...prev.category, cat]
        }));
    };

    const [activeTab, _] = useState("discover");

    const handleNavigation = (id, path) => {
        if (id !== activeTab) {
            navigate(path);
        }
    };

    const sortedProducts = [...products].sort((a, b) => {
        if (filters.sort === "a-z")        return a.title.localeCompare(b.title);
        if (filters.sort === "z-a")        return b.title.localeCompare(a.title);
        if (filters.sort === "price_asc")  return parseFloat(a.price.replace("$", "")) - parseFloat(b.price.replace("$", ""));
        if (filters.sort === "price_desc") return parseFloat(b.price.replace("$", "")) - parseFloat(a.price.replace("$", ""));
        return 0;
    });

  

    return (
        <div className="container">
            <div className="sidebar">
                <div className="logo-area">
                    <h2 className="logo-text">Dare</h2>
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

                    <h2 className="filter-header">Filters</h2>

                    <div className="filter-group">
                        <p className="filter-label">Sort By</p>
                        <select
                            className="sort-select"
                            value={filters.sort}
                            onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
                        >
                            <option value="all">Default</option>
                            <option value="a-z">A → Z</option>
                            <option value="z-a">Z → A</option>
                            <option value="price_asc">Price: Low → High</option>
                            <option value="price_desc">Price: High → Low</option>
                        </select>
                    </div>

                    <div className="filter-group">
                        <p className="filter-label">Price Range</p>
                        <div className="price-input-container">
                            <input
                                type="number"
                                placeholder="Min"
                                value={filters.minPrice}
                                onChange={(e) => setFilters({...filters, minPrice: e.target.value})}
                                className="price-input"
                            />
                            <span className="price-to">to</span>
                            <input
                                type="number"
                                placeholder="Max"
                                value={filters.maxPrice}
                                onChange={(e) => setFilters({...filters, maxPrice: e.target.value})}
                                className="price-input"
                            />
                        </div>
                    </div>


                    <div className="filter-group">
                        <p className="filter-label">Category</p>
                        {["Footwear", "Jackets", "Accessories"].map(cat => (
                            <label key={cat} className="check-row">
                                <input
                                    type="checkbox"
                                    checked={filters.category.includes(cat)}
                                    onChange={() => handleCategoryChange(cat)}
                                /> {cat}
                            </label>
                        ))}
                    </div>
                </aside>

                <main className="results-grid">
                <div className="header-actions" style={{ paddingRight: "40px" }}>
                    <h1 className="greeting-text">
                    Explore
                    </h1>
                    <CartButton onClick={() => navigate("/cart")} />
                </div>
                <div className="product-grid-container">
                    {loading && <p>Loading products…</p>}
                    {error   && <p>Error: {error}</p>}
                    {!loading && !error && sortedProducts.map((product) => (
                        <div key={product.id} className="grid-item">
                            <PolaroidCard title={product.title} creator={product.creator} price={product.price} img={product.img} productId={product.id}/>
                        </div>
                    ))}
                </div>
            </main>
            </div>
        </div>
    );
}