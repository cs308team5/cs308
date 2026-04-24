import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../services/authService.js";
import brushStroke from "../assets/homePageAssets/brushStroke.png";
import "./AdminPage.css";

const buttonData = [
    { id: "home", label: "Home", path: "/home" },
    { id: "discover", label: "Discover", path: "/discover" },
    { id: "admin", label: "Admin", path: "/admin" },
];

const SideBarButton = ({ label, isActive, onClick }) => (
    <div className={`sidebar-btn-container ${isActive ? "active" : ""}`} onClick={onClick}>
        {isActive && <img src={brushStroke} className="btn-brush-stroke" alt="" />}
        <button className="sidebar-btn" />
        <span className="btn-text">{label}</span>
    </div>
);

const EMPTY_FORM = {
    name: "", description: "", price: "", category: "",
    image_url: "", stock_quantity: "", model: "",
    serial_number: "", warranty_status: "", distributor_information: ""
};

export default function AdminPage() {
    const navigate = useNavigate();
    const user = getCurrentUser();
    const token = user?.token ?? null;
    const isAdmin = Boolean(user?.isAdmin ?? user?.is_admin);

    const [activeTab, setActiveTab] = useState("comments");

    // ── Comments state ──
    const [comments, setComments] = useState([]);
    const [commentsLoading, setCommentsLoading] = useState(true);
    const [commentActionId, setCommentActionId] = useState(null);

    // ── Products state ──
    const [products, setProducts] = useState([]);
    const [productsLoading, setProductsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);

    const [msg, setMsg] = useState("");
    const [msgType, setMsgType] = useState("success");

    const showMsg = (text, type = "success") => {
        setMsg(text); setMsgType(type);
        setTimeout(() => setMsg(""), 3000);
    };

    // ── Fetch comments ──
    useEffect(() => { fetchPending(); }, [token]);

    const fetchPending = async () => {
        if (!token) {
            setComments([]);
            setCommentsLoading(false);
            return;
        }

        setCommentsLoading(true);
        try {
            const res = await fetch("/api/comments/pending", { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (!res.ok) {
                showMsg(data.message || "Could not load comments.", "error");
                setComments([]);
                return;
            }
            if (data.success) setComments(data.data);
        } catch { showMsg("Could not load comments.", "error"); }
        finally { setCommentsLoading(false); }
    };

    const handleDecision = async (id, status) => {
        setCommentActionId(id);
        try {
            const res = await fetch(`/api/comments/${id}/status`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ status }),
            });
            const data = await res.json();
            if (!res.ok) {
                showMsg(data.message || "Action failed.", "error");
                return;
            }
            if (data.success) {
                setComments(prev => prev.filter(c => c.id !== id));
                showMsg(`Comment ${status} successfully.`);
            }
        } catch { showMsg("Action failed.", "error"); }
        finally { setCommentActionId(null); }
    };

    // ── Fetch products ──
    useEffect(() => { fetchProducts(); }, []);

    const fetchProducts = async () => {
        setProductsLoading(true);
        try {
            const res = await fetch("/api/products");
            const data = await res.json();
            if (data.success) setProducts(data.data);
        } catch { showMsg("Could not load products.", "error"); }
        finally { setProductsLoading(false); }
    };

    const handleFormChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const openAddForm = () => {
        setForm(EMPTY_FORM);
        setEditingId(null);
        setShowForm(true);
    };

    const openEditForm = (p) => {
        setForm({
            name: p.name ?? "", description: p.description ?? "",
            price: p.price ?? "", category: p.category ?? "",
            image_url: p.image_url ?? "", stock_quantity: p.stock ?? "",
            model: p.model ?? "", serial_number: p.serial_number ?? "",
            warranty_status: p.warranty_status ?? "",
            distributor_information: p.distributor_information ?? ""
        });
        setEditingId(p.id);
        setShowForm(true);
    };

    const handleSubmitProduct = async () => {
        if (!form.name || !form.price || !form.category) {
            showMsg("Name, price and category are required.", "error");
            return;
        }
        if (!token) {
            showMsg("Please log in again as an admin.", "error");
            return;
        }
        const method = editingId ? "PUT" : "POST";
        const url = editingId ? `/api/products/${editingId}` : "/api/products";
        const payload = { ...form, price: Number(form.price), stock_quantity: Number(form.stock_quantity) };

        try {
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (data.success) {
                showMsg(editingId ? "Product updated." : "Product added.");
                setShowForm(false);
                fetchProducts();
            } else {
                showMsg(data.message || "Failed.", "error");
            }
        } catch { showMsg("Server error.", "error"); }
    };

    const handleDeleteProduct = async (id, name) => {
        if (!window.confirm(`Delete "${name}"?`)) return;
        if (!token) {
            showMsg("Please log in again as an admin.", "error");
            return;
        }
        try {
            const res = await fetch(`/api/products/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                showMsg("Product deleted.");
                fetchProducts();
            }
        } catch { showMsg("Delete failed.", "error"); }
    };

    if (!token || !isAdmin) {
        return (
            <div className="container">
                <div className="content-area">
                    <div className="admin-guard-card">
                        <h2 className="brand">Admin access required</h2>
                        <p className="admin-empty">Please log in with an admin account to manage comments and products.</p>
                        <button className="admin-btn add-product" onClick={() => navigate("/login")}>Go to Login</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container">
            {/* SIDEBAR */}
            <div className="sidebar">
                <div className="logo-area">
                    <h2 className="logo-text brand">Dare</h2>
                </div>
                <div className="button-column">
                    {buttonData.map((btn) => (
                        <SideBarButton
                            key={btn.id}
                            label={btn.label}
                            isActive={btn.id === "admin"}
                            onClick={() => navigate(btn.path)}
                        />
                    ))}
                </div>
            </div>

            {/* CONTENT */}
            <div className="content-area">
                <div className="admin-header">
                    <div className="admin-tabs">
                        <button
                            className={`admin-tab ${activeTab === "comments" ? "active" : ""}`}
                            onClick={() => setActiveTab("comments")}
                        >
                            Pending Comments ({comments.length})
                        </button>
                        <button
                            className={`admin-tab ${activeTab === "products" ? "active" : ""}`}
                            onClick={() => setActiveTab("products")}
                        >
                            Product Management
                        </button>
                    </div>
                    {msg && <p className={`admin-msg ${msgType}`}>{msg}</p>}
                </div>

                {/* COMMENTS TAB */}
                {activeTab === "comments" && (
                    <div className="admin-list">
                        {commentsLoading && <p className="admin-empty">Loading...</p>}
                        {!commentsLoading && comments.length === 0 && (
                            <p className="admin-empty">No pending comments ✓</p>
                        )}
                        {comments.map(c => (
                            <div className="admin-card" key={c.id}>
                                <div className="admin-card-meta">
                                    <span className="admin-product-name brand">{c.product_name}</span>
                                    <span className="admin-date">
                                        {new Date(c.created_at).toLocaleDateString("en-US", {
                                            year: "numeric", month: "short", day: "numeric"
                                        })}
                                    </span>
                                </div>
                                <p className="admin-comment-author">By {c.author_name || `User #${c.user_id}`}</p>
                                <p className="admin-card-text">{c.text}</p>
                                <div className="admin-actions">
                                    <button
                                        className="admin-btn approve"
                                        disabled={commentActionId === c.id}
                                        onClick={() => handleDecision(c.id, "approved")}
                                    >
                                        {commentActionId === c.id ? "Saving..." : "Approve"}
                                    </button>
                                    <button
                                        className="admin-btn reject"
                                        disabled={commentActionId === c.id}
                                        onClick={() => handleDecision(c.id, "rejected")}
                                    >
                                        {commentActionId === c.id ? "Saving..." : "Reject"}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* PRODUCTS TAB */}
                {activeTab === "products" && (
                    <div className="admin-list">
                        <div className="admin-products-header">
                            <button className="admin-btn add-product" onClick={openAddForm}>+ Add Product</button>
                        </div>

                        {/* ADD / EDIT FORM */}
                        {showForm && (
                            <div className="admin-card product-form">
                                <h3 className="form-title brand">{editingId ? "Edit Product" : "Add New Product"}</h3>
                                <div className="form-grid">
                                    {[
                                        { name: "name", placeholder: "Product Name *" },
                                        { name: "category", placeholder: "Category *" },
                                        { name: "price", placeholder: "Price *", type: "number" },
                                        { name: "stock_quantity", placeholder: "Stock Quantity", type: "number" },
                                        { name: "image_url", placeholder: "Image URL" },
                                        { name: "model", placeholder: "Model" },
                                        { name: "serial_number", placeholder: "Serial Number" },
                                        { name: "warranty_status", placeholder: "Warranty Status" },
                                        { name: "distributor_information", placeholder: "Distributor Info" },
                                    ].map(f => (
                                        <input
                                            key={f.name}
                                            className="form-input"
                                            name={f.name}
                                            type={f.type ?? "text"}
                                            placeholder={f.placeholder}
                                            value={form[f.name]}
                                            onChange={handleFormChange}
                                        />
                                    ))}
                                    <textarea
                                        className="form-input form-textarea"
                                        name="description"
                                        placeholder="Description"
                                        value={form.description}
                                        onChange={handleFormChange}
                                    />
                                </div>
                                <div className="admin-actions">
                                    <button className="admin-btn approve" onClick={handleSubmitProduct}>
                                        {editingId ? "Update" : "Add"}
                                    </button>
                                    <button className="admin-btn reject" onClick={() => setShowForm(false)}>Cancel</button>
                                </div>
                            </div>
                        )}

                        {/* PRODUCT LIST */}
                        {productsLoading && <p className="admin-empty">Loading...</p>}
                        {!productsLoading && products.length === 0 && (
                            <p className="admin-empty">No products found.</p>
                        )}
                        {products.map(p => (
                            <div className="admin-card product-card" key={p.id}>
                                <div className="product-card-left">
                                    {p.image_url && (
                                        <img src={p.image_url} alt={p.name} className="product-thumb" />
                                    )}
                                    <div className="product-card-info">
                                        <span className="admin-product-name brand">{p.name}</span>
                                        <span className="product-category">{p.category}</span>
                                        <span className="product-price">${Number(p.price).toFixed(2)}</span>
                                        <span className={`product-stock ${p.stock <= 0 ? "out" : ""}`}>
                                            Stock: {p.stock}
                                        </span>
                                    </div>
                                </div>
                                <div className="admin-actions">
                                    <button className="admin-btn approve" onClick={() => openEditForm(p)}>Edit</button>
                                    <button className="admin-btn reject" onClick={() => handleDeleteProduct(p.id, p.name)}>Delete</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}