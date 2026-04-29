import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CommentSection from "../components/CommentSection";
import {
  addToCart,
  fetchCart,
  getGuestCart,
  removeFromCart,
  saveGuestCart,
  updateCartQuantity,
} from "../services/productAndCartService";
import { getCurrentUser } from "../services/authService";
import "./ProductDetailsPage.css";

export default function ProductDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = getCurrentUser();

  const [product, setProduct] = useState(null);
  const [cartItem, setCartItem] = useState(null);
  const [reviewStats, setReviewStats] = useState({
    average: 0,
    count: 0,
  });
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    fetch(`http://localhost:3000/api/products/${id}`)
      .then((res) => res.json())
      .then((data) => setProduct(data.data))
      .catch((err) => console.error(err));
  }, [id]);

  useEffect(() => {
    const syncCartItem = async () => {
      if (!id) return;

      try {
        if (!user) {
          const guestItem =
            getGuestCart().find((item) => String(item.product_id) === String(id)) ??
            null;
          setCartItem(guestItem);
          return;
        }

        const cart = await fetchCart(user.customer_id);
        const existingItem =
          cart.find((item) => String(item.product_id) === String(id)) ?? null;
        setCartItem(existingItem);
      } catch (err) {
        console.error(err);
      }
    };

    syncCartItem();
  }, [id, user]);

  if (!product) return <div className="loading">Loading...</div>;

  const averageLabel =
    reviewStats.count > 0 ? reviewStats.average.toFixed(1) : "No ratings";
  const cartQuantity = cartItem?.quantity ?? 0;
  const stockQuantity = Number(product.stock ?? cartItem?.stock_quantity ?? 0);
  const isOutOfStock = !product.inStock || stockQuantity <= 0;
  const isAtMaxStock = stockQuantity > 0 && cartQuantity >= stockQuantity;

  const addGuestItem = () => {
    const guestCart = getGuestCart();
    const existingItem = guestCart.find(
      (item) => String(item.product_id) === String(id),
    );

    if (existingItem) {
      if (existingItem.quantity >= stockQuantity) return;

      const updatedCart = guestCart.map((item) =>
        String(item.product_id) === String(id)
          ? { ...item, quantity: item.quantity + 1 }
          : item,
      );
      saveGuestCart(updatedCart);
      setCartItem(
        updatedCart.find((item) => String(item.product_id) === String(id)) ?? null,
      );
      return;
    }

    const newItem = {
      product_id: id,
      quantity: 1,
      name: product.name,
      description: product.description ?? "",
      price: Number(product.price),
      image: product.image_url,
      stock_quantity: stockQuantity,
    };

    const updatedCart = [...guestCart, newItem];
    saveGuestCart(updatedCart);
    setCartItem(newItem);
  };

  const handleAddToCart = async () => {
    if (isOutOfStock) return;

    try {
      if (!user) {
        addGuestItem();
        return;
      }

      await addToCart(user.customer_id, id);
      if (cartItem) {
        setCartItem({ ...cartItem, quantity: cartItem.quantity + 1 });
      } else {
        const cart = await fetchCart(user.customer_id);
        const existingItem =
          cart.find((item) => String(item.product_id) === String(id)) ?? null;
        setCartItem(existingItem);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleQuantityChange = async (change) => {
    if (!cartItem) return;

    const nextQuantity = cartItem.quantity + change;

    try {
      if (!user) {
        const guestCart = getGuestCart();

        if (nextQuantity <= 0) {
          const updatedCart = guestCart.filter(
            (item) => String(item.product_id) !== String(id),
          );
          saveGuestCart(updatedCart);
          setCartItem(null);
          return;
        }

        if (nextQuantity > stockQuantity) return;

        const updatedCart = guestCart.map((item) =>
          String(item.product_id) === String(id)
            ? { ...item, quantity: nextQuantity }
            : item,
        );
        saveGuestCart(updatedCart);
        setCartItem(
          updatedCart.find((item) => String(item.product_id) === String(id)) ?? null,
        );
        return;
      }

      if (nextQuantity <= 0) {
        await removeFromCart(cartItem.id);
        setCartItem(null);
        return;
      }

      if (nextQuantity > stockQuantity) return;

      await updateCartQuantity(cartItem.id, nextQuantity);
      setCartItem({ ...cartItem, quantity: nextQuantity });
    } catch (err) {
      console.error(err);
    }
  };

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

          <div className="rating">★ {averageLabel} ({reviewStats.count})</div>

          <div className={isOutOfStock ? "out-of-stock" : "in-stock"}>
            STOCK: {stockQuantity}
          </div>

          {cartQuantity > 0 ? (
            <div className="cart-quantity-control">
              <button
                type="button"
                className="quantity-btn"
                onClick={() => handleQuantityChange(-1)}
              >
                -
              </button>
              <span className="quantity-value">{cartQuantity}</span>
              <button
                type="button"
                className={`quantity-btn ${isAtMaxStock ? "is-disabled" : ""}`}
                onClick={() => handleQuantityChange(1)}
                disabled={isAtMaxStock}
              >
                +
              </button>
            </div>
          ) : (
            <button
              className="add-btn"
              onClick={handleAddToCart}
              disabled={isOutOfStock}
            >
              {isOutOfStock ? "OUT OF STOCK" : "ADD TO CART"}
            </button>
          )}

          <div className="section">
            <div className="section-title">DESCRIPTION</div>
            <p>{product.description || "No description available."}</p>
          </div>

          <div className="section">
            <div
              className="section-title dropdown-header"
              onClick={() => setDetailsOpen(!detailsOpen)}
            >
              DETAILS <span>{detailsOpen ? "▲" : "▼"}</span>
            </div>

            {detailsOpen && (
              <div className="details-content">
                {product.category && (
                  <div className="detail-row">
                    <span className="detail-label">Category</span>
                    <span>{product.category}</span>
                  </div>
                )}
                {product.model && (
                  <div className="detail-row">
                    <span className="detail-label">Model</span>
                    <span>{product.model}</span>
                  </div>
                )}
                {product.serial_number && (
                  <div className="detail-row">
                    <span className="detail-label">Serial No</span>
                    <span>{product.serial_number}</span>
                  </div>
                )}
                {product.warranty_status && (
                  <div className="detail-row">
                    <span className="detail-label">Warranty</span>
                    <span>{product.warranty_status}</span>
                  </div>
                )}
                {product.distributor_information && (
                  <div className="detail-row">
                    <span className="detail-label">Distributor</span>
                    <span>{product.distributor_information}</span>
                  </div>
                )}
                {product.additional_attributes &&
                  Object.entries(product.additional_attributes).map(([key, value]) => (
                    <div className="detail-row" key={key}>
                      <span className="detail-label">
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                      </span>
                      <span>{value}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <CommentSection
            productId={product.id}
            onStatsChange={setReviewStats}
          />
        </div>
      </div>
    </div>
  );
}
