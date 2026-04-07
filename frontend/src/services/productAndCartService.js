import { supabase } from "../lib/supabaseClient";

const mapProduct = (row) => ({
  id:       row.id,
  title:    row.name,
  creator:  row.additional_attributes?.creator ?? "@unknown",
  price:    `$${Number(row.price).toFixed(2)}`,
  category: row.category ?? "uncategorized",
  img:      row.image_url ?? null,
});

export async function fetchProducts({ category = [], min_price = 0, max_price = 10000, sort = "all", search = "", limit = 1000 } = {}) {
  let query = supabase.from("products").select("*").gte("price", min_price).lte("price", max_price).limit(limit);

  if (search)          query = query.ilike("name", `%${search}%`);
  if (category.length) query = query.in("category", category);
  if (sort === "discount") query = query.order("price", { ascending: true });
  else                     query = query.order("created_at", { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  return data.map(mapProduct);
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

export async function updateCartQuantity(cartItemId, quantity) {
  const { error } = await supabase
    .from("cart_items")
    .update({ quantity })
    .eq("id", cartItemId);
  if (error) throw error;
}

export async function removeFromCart(cartItemId) {
  const { error } = await supabase
    .from("cart_items")
    .delete()
    .eq("id", cartItemId);
  if (error) throw error;
}