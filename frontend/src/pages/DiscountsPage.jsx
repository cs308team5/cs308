import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../services/authService.js";
import "./AdminPage.css";

export default function DiscountsPage() {
    const navigate = useNavigate();
    const user = getCurrentUser();
    const token = user?.token ?? null;
    const isSalesManager = user?.role === "sales_manager";

    const [products, setProducts] = useState([]);
    const [search, setSearch] = useState("");
    const [showActiveOnly, setShowActiveOnly] = useState(false);
    const [loading, setLoading] = useState(true);
    const [rates, setRates] = useState({});
    const [prices, setPrices] = useState({});
    const [actionId, setActionId] = useState(null);
    const [msg, setMsg] = useState("");
    const [msgType, setMsgType] = useState("success");

    const showMsg = (text, type = "success") => {
        setMsg(text);
        setMsgType(type);
        setTimeout(() => setMsg(""), 3000);
    };

    const handleSetPrice = async (productId) => {
        const price = Number(prices[productId]);
        if (!Number.isFinite(price) || price <= 0) {
            showMsg("Enter a valid positive price.", "error");
            return;
        }

        setActionId(productId);
        try {
            const res = await fetch(`/api/discounts/${productId}/price`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ price }),
            });
            const data = await res.json();
            if (data.success) {
                setProducts(prev =>
                    prev.map(p => p.id === productId ? { ...p, ...data.product } : p)
                );
                setPrices(prev => ({ ...prev, [productId]: "" }));
                showMsg("Price updated.");
            } else {
                showMsg(data.message || "Failed to update price.", "error");
            }
        } catch {
            showMsg("Failed to update price.", "error");
        } finally {
            setActionId(null);
        }
    };

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "auto" });
        if (!token || !isSalesManager) return;
        fetchProducts();
    }, [token]);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/discounts", {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) setProducts(data.products);
            else showMsg(data.message || "Could not load products.", "error");
        } catch {
            showMsg("Could not load products.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleSet = async (productId) => {
        const rate = parseFloat(rates[productId]);
        if (isNaN(rate) || rate <= 0 || rate >= 100) {
            showMsg("Enter a discount between 1 and 99.", "error");
            return;
        }
        setActionId(productId);
        try {
            const res = await fetch(`/api/discounts/${productId}/discount`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ discount_rate: rate / 100 }),
            });
            const data = await res.json();
            if (data.success) {
                setProducts(prev =>
                    prev.map(p => p.id === productId ? { ...p, ...data.product } : p)
                );
                showMsg("Discount applied.");
            } else {
                showMsg(data.message || "Failed to apply discount.", "error");
            }
        } catch {
            showMsg("Failed to apply discount.", "error");
        } finally {
            setActionId(null);
        }
    };

    const handleRemove = async (productId) => {
        setActionId(productId);
        try {
            const res = await fetch(`/api/discounts/${productId}/discount`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                setProducts(prev =>
                    prev.map(p => p.id === productId ? { ...p, discount_rate: null, discounted_price: null } : p)
                );
                setRates(prev => ({ ...prev, [productId]: "" }));
                showMsg("Discount removed.");
            } else {
                showMsg(data.message || "Failed to remove discount.", "error");
            }
        } catch {
            showMsg("Failed to remove discount.", "error");
        } finally {
            setActionId(null);
        }
    };

    if (!token || !isSalesManager) {
        return (
            <main className="admin-content">
                <div className="admin-guard-card">
                    <h2 className="brand">Sales manager access required</h2>
                    <button className="admin-btn add-product" onClick={() => navigate("/login")}>Go to Login</button>
                </div>
            </main>
        );
    }

    const discountedCount = products.filter(p => p.discount_rate).length;
    const visibleProducts = products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) &&
        (!showActiveOnly || p.discount_rate)
    );

    return (
        <main className="admin-content">
            <div className="admin-panel">
                <div className="admin-header">
                    <div>
                        <p className="admin-kicker">Pricing</p>
                        <h1 className="admin-title">
                            Pricing & Discounts
                            {discountedCount > 0 && (
                                <span className="admin-pending-badge">{discountedCount} active</span>
                            )}
                        </h1>
                    </div>
                    {msg && <p className={`admin-msg ${msgType}`}>{msg}</p>}
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 20, justifyContent: "space-between" }}>
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{
                            width: "100%", maxWidth: 360, padding: "8px 14px",
                            borderRadius: 8, border: "1px solid #d1d5db",
                            fontSize: 14, boxSizing: "border-box",
                        }}
                    />
                    <button
                        onClick={() => setShowActiveOnly(v => !v)}
                        style={{
                            padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 600,
                            border: "1px solid #d1d5db", cursor: "pointer", whiteSpace: "nowrap",
                            background: showActiveOnly ? "var(--black, #111)" : "transparent",
                            color: showActiveOnly ? "#fff" : "inherit",
                            transition: "background 0.15s, color 0.15s",
                        }}
                    >
                        Active discounts
                    </button>
                </div>

                <div className="admin-list">
                    {loading && <p className="admin-empty">Loading...</p>}
                    {!loading && products.length === 0 && (
                        <p className="admin-empty">No products found.</p>
                    )}
                    {!loading && products.length > 0 && visibleProducts.length === 0 && (
                        <p className="admin-empty">No products match your search.</p>
                    )}
                    {visibleProducts.map(p => (
                        <div className="admin-card" key={p.id}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                                {p.image_url && (
                                    <img
                                        src={p.image_url}
                                        alt={p.name}
                                        style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 6, flexShrink: 0 }}
                                    />
                                )}
                                <span className="admin-product-name brand" style={{ flex: 1 }}>{p.name}</span>
                                {p.discount_rate ? (
                                    <span style={{
                                        color: "#15803d", background: "#f0fdf4",
                                        padding: "4px 12px", borderRadius: "999px",
                                        fontSize: "12px", fontWeight: 600,
                                    }}>
                                        {Math.round(p.discount_rate * 100)}% off
                                    </span>
                                ) : (
                                    <span style={{
                                        color: "#6b7280", background: "#f3f4f6",
                                        padding: "4px 12px", borderRadius: "999px",
                                        fontSize: "12px", fontWeight: 600,
                                    }}>
                                        No discount
                                    </span>
                                )}
                            </div>
                            <p className="admin-comment-author">
                                Price: ${Number(p.price).toFixed(2)}
                                {p.discounted_price && (
                                    <> -&gt; <strong>${Number(p.discounted_price).toFixed(2)}</strong></>
                                )}
                                {p.category && <> - {p.category}</>}
                            </p>
                            <div className="admin-actions" style={{ alignItems: "center", gap: 8 }}>
                                <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    placeholder="New price"
                                    value={prices[p.id] ?? ""}
                                    onChange={e => setPrices(prev => ({ ...prev, [p.id]: e.target.value }))}
                                    style={{
                                        width: 120, padding: "6px 10px", borderRadius: 6,
                                        border: "1px solid #d1d5db", fontSize: 14,
                                    }}
                                />
                                <button
                                    className="admin-btn add-product"
                                    disabled={actionId === p.id}
                                    onClick={() => handleSetPrice(p.id)}
                                >
                                    Set Price
                                </button>
                                <input
                                    type="number"
                                    min="1"
                                    max="99"
                                    placeholder="Discount %"
                                    value={rates[p.id] ?? (p.discount_rate ? Math.round(p.discount_rate * 100) : "")}
                                    onChange={e => {
                                        const v = e.target.value;
                                        if (v === "" || (/^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 99)) {
                                            setRates(prev => ({ ...prev, [p.id]: v }));
                                        }
                                    }}
                                    style={{
                                        width: 110, padding: "6px 10px", borderRadius: 6,
                                        border: "1px solid #d1d5db", fontSize: 14,
                                    }}
                                />
                                <button
                                    className="admin-btn approve"
                                    disabled={actionId === p.id}
                                    onClick={() => handleSet(p.id)}
                                >
                                    {actionId === p.id ? "Saving..." : "Apply"}
                                </button>
                                {p.discount_rate && (
                                    <button
                                        className="admin-btn reject"
                                        disabled={actionId === p.id}
                                        onClick={() => handleRemove(p.id)}
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    );
}
