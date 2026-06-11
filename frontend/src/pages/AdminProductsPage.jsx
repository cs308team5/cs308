import { useEffect, useMemo, useState } from "react";
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
    const isProductManager = user?.role === "product_manager";

    const [products, setProducts] = useState([]);
    const [productsLoading, setProductsLoading] = useState(true);
    const [categoryOptions, setCategoryOptions] = useState([]);
    const [categoryName, setCategoryName] = useState("");
    const [categoryActionName, setCategoryActionName] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [stockFilter, setStockFilter] = useState("all");
    const [msg, setMsg] = useState("");
    const [msgType, setMsgType] = useState("success");

    const categories = useMemo(() => {
        const productCategories = products.map((product) => product.category).filter(Boolean);
        const managedCategories = categoryOptions.map((category) => category.name).filter(Boolean);

        return [...new Set([...managedCategories, ...productCategories])]
            .sort((left, right) => left.localeCompare(right));
    }, [categoryOptions, products]);

    const categoryCounts = useMemo(() => {
        return products.reduce((counts, product) => {
            const category = product.category;

            if (!category) {
                return counts;
            }

            counts[category] = (counts[category] ?? 0) + 1;
            return counts;
        }, {});
    }, [products]);

    const filteredProducts = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();

        return products.filter((product) => {
            const matchesSearch =
                !query ||
                [product.name, product.category, product.model, product.serial_number]
                    .some((value) => String(value ?? "").toLowerCase().includes(query));
            const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;
            const stock = Number(product.stock ?? product.stock_quantity ?? 0);
            const matchesStock =
                stockFilter === "all" ||
                (stockFilter === "in-stock" && stock > 0) ||
                (stockFilter === "out-of-stock" && stock <= 0);

            return matchesSearch && matchesCategory && matchesStock;
        });
    }, [categoryFilter, products, searchTerm, stockFilter]);

    const showMsg = (text, type = "success") => {
        setMsg(text);
        setMsgType(type);
        setTimeout(() => setMsg(""), 3000);
    };

    useEffect(() => {
        fetchProducts();
        fetchCategories();
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

    const fetchCategories = async () => {
        try {
            const res = await fetch("/api/products/categories");
            const data = await res.json();

            if (data.success) {
                setCategoryOptions(data.data ?? []);
            }
        } catch {
            setCategoryOptions([]);
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
        setShowForm(false);
    };

    const closeForm = () => {
        setShowForm(false);
        setEditingId(null);
        setForm(EMPTY_FORM);
    };

    const handleAddCategory = async () => {
        const cleanName = categoryName.trim();

        if (!cleanName) {
            showMsg("Category name is required.", "error");
            return;
        }

        if (!token) {
            showMsg("Please log in again as a product manager.", "error");
            return;
        }

        setCategoryActionName(cleanName);

        try {
            const res = await fetch("/api/products/categories", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ name: cleanName }),
            });
            const data = await res.json();

            if (!res.ok) {
                showMsg(data.message || "Could not add category.", "error");
                return;
            }

            setCategoryName("");
            showMsg("Category added.");
            fetchCategories();
        } catch {
            showMsg("Could not add category.", "error");
        } finally {
            setCategoryActionName(null);
        }
    };

    const handleDeleteCategory = async (name) => {
        if (!token) {
            showMsg("Please log in again as a product manager.", "error");
            return;
        }

        setCategoryActionName(name);

        try {
            const res = await fetch(`/api/products/categories/${encodeURIComponent(name)}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();

            if (!res.ok) {
                showMsg(data.message || "Could not remove category.", "error");
                return;
            }

            showMsg("Category removed.");
            fetchCategories();
        } catch {
            showMsg("Could not remove category.", "error");
        } finally {
            setCategoryActionName(null);
        }
    };

    const handleSubmitProduct = async () => {
        if (!form.name || !form.category || (!editingId && !form.price)) {
            showMsg(editingId ? "Name and category are required." : "Name, price and category are required.", "error");
            return;
        }
        if (!token) {
            showMsg("Please log in again as a product manager.", "error");
            return;
        }

        const method = editingId ? "PUT" : "POST";
        const url = editingId ? `/api/products/${editingId}` : "/api/products";
        const payload = {
            ...form,
            stock_quantity: Number(form.stock_quantity),
        };

        if (editingId) {
            delete payload.price;
        } else {
            payload.price = Number(form.price);
        }

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
                closeForm();
                fetchProducts();
            } else {
                showMsg(data.message || "Failed.", "error");
            }
        } catch {
            showMsg("Server error.", "error");
        }
    };

    const renderProductForm = (title) => (
        <div className="admin-card product-form">
            <h3 className="form-title brand">{title}</h3>
            <div className="form-grid">
                {[
                    { name: "name", placeholder: "Product Name *" },
                    ...(!editingId ? [{ name: "price", placeholder: "Price *", type: "number" }] : []),
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
                <select
                    className="form-input"
                    name="category"
                    value={form.category}
                    onChange={handleFormChange}
                >
                    <option value="">Select Category *</option>
                    {categories.map((category) => (
                        <option value={category} key={category}>{category}</option>
                    ))}
                </select>
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
                <button className="admin-btn reject" onClick={closeForm}>Cancel</button>
            </div>
        </div>
    );

    const handleDeleteProduct = async (id, name) => {
        if (!window.confirm(`Delete "${name}"?`)) return;
        if (!token) {
            showMsg("Please log in again as a product manager.", "error");
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

    if (!token || !isProductManager) {
        return (
            <main className="admin-content">
                <div className="admin-guard-card">
                    <h2 className="brand">Product manager access required</h2>
                    <p className="admin-empty">Please log in with a product manager account to manage products.</p>
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
                        <div className="admin-product-filters">
                            <input
                                className="form-input product-search-input"
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                placeholder="Search products by name, category, model, serial..."
                            />
                            <select
                                className="form-input product-filter-select"
                                value={categoryFilter}
                                onChange={(event) => setCategoryFilter(event.target.value)}
                            >
                                <option value="all">All categories</option>
                                {categories.map((category) => (
                                    <option value={category} key={category}>{category}</option>
                                ))}
                            </select>
                            <select
                                className="form-input product-filter-select"
                                value={stockFilter}
                                onChange={(event) => setStockFilter(event.target.value)}
                            >
                                <option value="all">All stock</option>
                                <option value="in-stock">In stock</option>
                                <option value="out-of-stock">Out of stock</option>
                            </select>
                        </div>
                        <button className="admin-btn add-product" onClick={openAddForm}>+ Add Product</button>
                    </div>

                    <div className="admin-card category-manager-card">
                        <div className="category-manager-top">
                            <div>
                                <h3 className="form-title brand">Categories</h3>
                                <p className="category-manager-subtitle">Add and remove product categories.</p>
                            </div>
                            <div className="category-add-row">
                                <input
                                    className="form-input"
                                    value={categoryName}
                                    onChange={(event) => setCategoryName(event.target.value)}
                                    placeholder="New category name"
                                />
                                <button
                                    className="admin-btn add-product"
                                    onClick={handleAddCategory}
                                    disabled={Boolean(categoryActionName)}
                                >
                                    Add
                                </button>
                            </div>
                        </div>

                        <div className="category-chip-list">
                            {categories.length === 0 ? (
                                <span className="category-empty-text">No categories yet.</span>
                            ) : (
                                categories.map((category) => {
                                    const usageCount = categoryCounts[category] ?? 0;
                                    const isBusy = categoryActionName === category;

                                    return (
                                        <span className="category-chip" key={category}>
                                            <span>{category}</span>
                                            <small>{usageCount} product{usageCount !== 1 ? "s" : ""}</small>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteCategory(category)}
                                                disabled={isBusy || usageCount > 0}
                                                title={usageCount > 0 ? "Remove products from this category first" : "Remove category"}
                                            >
                                                x
                                            </button>
                                        </span>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {showForm && renderProductForm("Add New Product")}

                    {productsLoading && <p className="admin-empty">Loading...</p>}
                    {!productsLoading && products.length === 0 && (
                        <p className="admin-empty">No products found.</p>
                    )}
                    {!productsLoading && products.length > 0 && filteredProducts.length === 0 && (
                        <p className="admin-empty">No products match your filters.</p>
                    )}
                    {filteredProducts.map((product) => (
                        <div className="product-management-row" key={product.id}>
                            <div className="admin-card product-card">
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
                            {editingId === product.id && renderProductForm(`Edit ${product.name}`)}
                        </div>
                    ))}
                </div>
            </div>
        </main>
    );
}
