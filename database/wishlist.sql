CREATE TABLE IF NOT EXISTS wishlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id integer NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wishlist_items_customer_product_unique UNIQUE (customer_id, product_id)
);

CREATE INDEX IF NOT EXISTS wishlist_items_customer_id_idx
  ON wishlist_items (customer_id);

CREATE INDEX IF NOT EXISTS wishlist_items_product_id_idx
  ON wishlist_items (product_id);
