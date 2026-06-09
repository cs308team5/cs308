import { getCurrentUser } from "./authService.js";

const parseResponse = async (response) => {
  const raw = await response.text();
  const data = raw ? JSON.parse(raw) : {};

  if (!response.ok) {
    throw new Error(data.message || "Wishlist request failed");
  }

  return data;
};

const authHeaders = () => {
  const user = getCurrentUser();
  return user?.token ? { Authorization: `Bearer ${user.token}` } : {};
};

const normalizeWishlistItem = (item) => {
  const product = item.product ?? item.products ?? item;
  const priceValue = Number(product.price ?? 0);
  const stockQuantity = Number(product.stock_quantity ?? product.stock ?? 0);

  return {
    wishlist_id: item.id ?? item.wishlist_id,
    id: product.id ?? item.product_id,
    product_id: product.id ?? item.product_id,
    title: product.name ?? product.title ?? "Untitled product",
    name: product.name ?? product.title ?? "Untitled product",
    description: product.description ?? "",
    creator: product.additional_attributes?.creator ?? "",
    price: `$${priceValue.toFixed(2)}`,
    priceValue,
    stock_quantity: stockQuantity,
    inStock: stockQuantity > 0,
    category: product.category ?? "uncategorized",
    img: product.image_url ?? product.img ?? null,
    image_url: product.image_url ?? product.img ?? null,
  };
};

export async function fetchWishlist(userId) {
  if (!userId) {
    return [];
  }

  const data = await parseResponse(await fetch("/api/wishlist", {
    headers: authHeaders(),
  }));
  return (data.data ?? data.items ?? []).map(normalizeWishlistItem);
}

export async function addToWishlist(userId, productId) {
  if (!userId || !productId) {
    throw new Error("Please log in to wishlist products.");
  }

  const data = await parseResponse(await fetch("/api/wishlist/add", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ productId }),
  }));

  window.dispatchEvent(new Event("wishlistUpdated"));
  return data;
}

export async function removeFromWishlist(userId, productId) {
  if (!userId || !productId) {
    throw new Error("Please log in to update your wishlist.");
  }

  const data = await parseResponse(await fetch("/api/wishlist/remove", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ productId }),
  }));

  window.dispatchEvent(new Event("wishlistUpdated"));
  return data;
}
