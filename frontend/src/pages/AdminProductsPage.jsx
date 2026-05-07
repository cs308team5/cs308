import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../services/authService.js";
import "./AdminPage.css";

const EMPTY_FORM = {
    name: "",
    description: "",
    price: "",
    category: "",
    image_url: "",
    stock_quantity: "",
    model: "",
    serial_number: "",
    warranty_status: "",
    distributor_information: "",
};

export default function AdminProductsPage() {
    const navigate = useNavigate();
    const user = getCurrentUser();
    const token = user?.token ?? null;
    const isAdmin = Boolean(user?.isAdmin ?? user?.is_admin);

    const [products, setProducts] = useState([]);
    const [productsLoading, setProductsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [msg, setMsg] = useState("");
    const [msgType, setMsgType] = useState("success");

    const showMsg = (text, type = "success") => {
        setMsg(text);
        setMsgType(type);
        setTimeout(() => setMsg(""), 3000);
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        setProductsLoading(true);
        try {
            const res = await fetch("/api/products");
            const data = await res.json();
            if (data.success) setProducts(data.data);
        } catch {
            showMsg("Could not load products.", "error");
        } finally {
            setProductsLoading(false);
        }
    };

    const handleFormChange = (event) => {
        setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
    };

    const openAddForm = () => {
        setForm(EMPTY_FORM);
        setEditingId(null);
        setShowForm(true);
    };

    const openEditForm = (product) => {
        setForm({
            name: product.name ?? "",
            description: product.description ?? "",
            price: product.price ?? "",
            category: product.category ?? "",
            image_url: product.image_url ?? "",
            stock_quantity: product.stock ?? "",
            model: product.model ?? "",
            serial_number: product.serial_number ?? "",
            warranty_status: product.warranty_status ?? "",
            distributor_information: product.distributor_information ?? "",
        });
        setEditingId(product.id);
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
        const payload = {
            ...form,
            price: Number(form.price),
            stock_quantity: Number(form.stock_quantity),
        };

        try {
            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
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
        } catch {
            showMsg("Server error.", "error");
        }
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
        } catch {
            showMsg("Delete failed.", "error");
        }
    };

    if (!token || !isAdmin) {
        return (
            <main className="admin-content">
                <div className="admin-guard-card">
                    <h2 className="brand">Admin access required</h2>
                    <p className="admin-empty">Please log in with an admin account to manage products.</p>
                    <button className="admin-btn add-product" onClick={() => navigate("/login")}>Go to Login</button>
                </div>
            </main>
        );
    }

    return (
        <main className="admin-content">
            <div className="admin-panel">
                <div className="admin-header">
                    <div>
                        <p className="admin-kicker">Products</p>
                        <h1 className="admin-title">Product Management</h1>
                    </div>
                    {msg && <p className={`admin-msg ${msgType}`}>{msg}</p>}
                </div>

                <div className="admin-list">
                    <div className="admin-products-header">
                        <button className="admin-btn add-product" onClick={openAddForm}>+ Add Product</button>
                    </div>

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
                                ].map((field) => (
                                    <input
                                        key={field.name}
                                        className="form-input"
                                        name={field.name}
                                        type={field.type ?? "text"}
                                        placeholder={field.placeholder}
                                        value={form[field.name]}
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

                    {productsLoading && <p className="admin-empty">Loading...</p>}
                    {!productsLoading && products.length === 0 && (
                        <p className="admin-empty">No products found.</p>
                    )}
                    {products.map((product) => (
                        <div className="admin-card product-card" key={product.id}>
                            <div className="product-card-left">
                                {product.image_url && (
                                    <img src={product.image_url} alt={product.name} className="product-thumb" />
                                )}
                                <div className="product-card-info">
                                    <span className="admin-product-name brand">{product.name}</span>
                                    <span className="product-category">{product.category}</span>
                                    <span className="product-price">${Number(product.price).toFixed(2)}</span>
                                    <span className={`product-stock ${product.stock <= 0 ? "out" : ""}`}>
                                        Stock: {product.stock}
                                    </span>
                                </div>
                            </div>
                            <div className="admin-actions">
                                <button className="admin-btn approve" onClick={() => openEditForm(product)}>Edit</button>
                                <button className="admin-btn reject" onClick={() => handleDeleteProduct(product.id, product.name)}>Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    );
}
