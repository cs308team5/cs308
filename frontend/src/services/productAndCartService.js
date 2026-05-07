import { supabase } from "../lib/supabaseClient";

function notifyCartUpdated() {
  window.dispatchEvent(new Event("cartUpdated"));
}

const escapeSearchValue = (value) =>
  value
    .replaceAll("\\", "\\\\")
    .replaceAll(",", "\\,")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)");

const mapProduct = (row) => {
  const priceValue = Number(row.price ?? 0);
  const stockQuantity = Number(row.stock_quantity ?? 0);

  return {
    id: row.id,
    title: row.name,
    description: row.description ?? "",
    creator: row.additional_attributes?.creator ?? "",
    price: `$${priceValue.toFixed(2)}`,
    priceValue,
    stock_quantity: stockQuantity,
    inStock: stockQuantity > 0,
    category: row.category ?? "uncategorized",
    img: row.image_url ?? null,
    popularityScore: 0,
    ratingCount: 0,
  };
};

export async function fetchProducts({ category = [], min_price = 0, max_price = 10000, sort = "all", search = "", limit = 1000 } = {}) {
  let query = supabase.from("products").select("*").gte("price", min_price).lte("price", max_price).limit(limit);

  if (search) {
    const escapedSearch = escapeSearchValue(search.trim());
    query = query.or(`name.ilike.%${escapedSearch}%,description.ilike.%${escapedSearch}%`);
  }
  if (category.length) query = query.in("category", category);
  if (sort === "discount") query = query.order("price", { ascending: true });
  else                     query = query.order("created_at", { ascending: false });

  const { data, error } = await query;
  if (error) throw error;

  const mappedProducts = data.map(mapProduct);
  const productIds = mappedProducts.map((product) => product.id);

  if (productIds.length === 0) {
    return mappedProducts;
  }

  const { data: ratingsData, error: ratingsError } = await supabase
    .from("ratings")
    .select("product_id, rating")
    .in("product_id", productIds);

  if (!ratingsError && Array.isArray(ratingsData)) {
    const ratingMap = ratingsData.reduce((acc, row) => {
      const productId = row.product_id;
      const numericRating = Number(row.rating);

      if (!productId || !Number.isFinite(numericRating)) {
        return acc;
      }

      if (!acc[productId]) {
        acc[productId] = { total: 0, count: 0 };
      }

      acc[productId].total += numericRating;
      acc[productId].count += 1;
      return acc;
    }, {});

    mappedProducts.forEach((product) => {
      const stats = ratingMap[product.id];
      if (!stats || stats.count === 0) {
        return;
      }

      product.ratingCount = stats.count;
      product.popularityScore = Number((stats.total / stats.count).toFixed(2));
    });
  }

  return mappedProducts;
}


export async function fetchCart(userId) {
  const { data, error } = await supabase
    .from("cart_items")
    .select("*, products(*)")
    .eq("customer_id", userId);

  if (error) throw error;

  return data.map(row => ({
    id:          row.id,
    product_id:  row.product_id,
    quantity:    row.quantity,
    name:        row.products.name,
    description: row.products.description,
    price:       Number(row.products.price),
    image:       row.products.image_url,
    stock_quantity: row.products.stock_quantity,
  }));
}
/*
export async function addToCart(userId, productId) {
  // If item already in cart, increment quantity
  if (userId === undefined || productId === undefined) {
      throw new Error("userId or productId is undefined.");
  }
  
  const [{ data: existing, error: selectError }, { data: product, error: productError }] = await Promise.all([
        supabase.from("cart_items").select("*").eq("customer_id", userId).eq("product_id", productId).maybeSingle(),
        supabase.from("products").select("stock_quantity").eq("id", productId).single(),
    ]);

  if (selectError) throw selectError;
  if (productError) throw productError;

  const currentQuantity = existing?.quantity ?? 0;
  if (currentQuantity >= product.stock_quantity) {
      throw new Error("No more stock available for this item.");
  }

  if (existing) {
    const { error } = await supabase
      .from("cart_items")
      .update({ quantity: existing.quantity + 1 })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("cart_items")
      .insert({ customer_id: userId, product_id: productId, quantity: 1 });
    if (error) throw error;
  }
}
*/
export async function addToCart(userId, productId, quantity = 1) {
  if (userId === undefined || productId === undefined) {
    throw new Error("userId or productId is undefined.");
  }

  const response = await fetch("/api/cart/add", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ userId, productId, quantity }),
  });

  const raw = await response.text();
  const data = raw ? JSON.parse(raw) : {};

  if (!response.ok) {
    throw new Error(data.message || "Failed to add to cart");
  }

  notifyCartUpdated();
  return data;
}

export async function updateCartQuantity(cartItemId, quantity) {
  const { error } = await supabase
    .from("cart_items")
    .update({ quantity })
    .eq("id", cartItemId);
  if (error) throw error;
  notifyCartUpdated();
}

export async function removeFromCart(cartItemId) {
  const { error } = await supabase
    .from("cart_items")
    .delete()
    .eq("id", cartItemId);
  if (error) throw error;
  notifyCartUpdated();
}

export async function mergeGuestCartOnLogin(userId) {
  const guestCart = getGuestCart();
  if (guestCart.length === 0) return;

  for(const item of guestCart) {
    for(let i = 0; i < item.quantity; i++) {
      try 
      {
        await addToCart(userId, item.product_id, 1);
      } 
      catch (error) 
      {
        console.error(`Failed to merge item ${item.product_id} into cart:`, error);
      }
    }
  }

  saveGuestCart([]);
}

// Local cart for quests

export function getGuestCart() {
  return JSON.parse(localStorage.getItem("guest_cart") ?? "[]");
}

export function saveGuestCart(cart) {
  localStorage.setItem("guest_cart", JSON.stringify(cart));
  notifyCartUpdated();
}

export function addToGuestCart(product) {
  const cart = getGuestCart();
  const existing = cart.find(i => i.product_id === product.id);

  if (existing) {

    existing.quantity += 1;
  }
  else {
    cart.push({
      product_id:     product.id,
      quantity:       1,
      name:           product.title,
      description:    product.description ?? "",
      price:          Number(String(product.price).replace("$", "")),
      image:          product.img,
      stock_quantity: product.stock_quantity,
    });
  }

  saveGuestCart(cart);
}
