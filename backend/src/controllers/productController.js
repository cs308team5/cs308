import pool from "../config/db.js";

/**
 * GET /api/products
 *
 * Supports:
 * - Search by name (?q=...)
 * - Filter by category (?category=...)
 * - Filter by attributes (?attributes=color:red,size:m)
 *
 * Returns:
 * - Structured product list with stock info
 */
export const getProducts = async (req, res) => {
  // Extract query parameters
  const { q, attributes, category } = req.query;

  try {
    // 1. Base query (always valid)
    let sqlQuery = "SELECT * FROM products WHERE 1=1";
    const params = [];

    // 2. Name search (q)
    if (q && q.trim() !== "") {
      if (q.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: "Search query must be at least 2 characters"
        });
      }

      params.push(`%${q.trim()}%`);
      sqlQuery += ` AND name ILIKE $${params.length}`;
    }

    // 3. Category filter (REQUIRED for your task)
    if (category) {
      params.push(category);
      sqlQuery += ` AND category = $${params.length}`;
    }

    // 4. Attribute filters (JSONB field)
    if (attributes) {
      const attributeArray = attributes.split(",");

      attributeArray.forEach((attr) => {
        const [key, value] = attr.split(":");

        if (key && value) {
          params.push(`%${value.trim()}%`);
          sqlQuery += ` AND additional_attributes->>'${key.trim()}' ILIKE $${params.length}`;
        }
      });
    }

    // 5. Consistent ordering (newest first)
    sqlQuery += " ORDER BY created_at DESC";

    // 6. Execute query
    const result = await pool.query(sqlQuery, params);

    // 7. Format response (IMPORTANT)
    const products = result.rows.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      category: p.category,
      stock: p.stock_quantity,        // normalized field name
      image_url: p.image_url,
      inStock: p.stock_quantity > 0   // derived field
    }));

    // 8. Send structured response
    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });

  } catch (error) {
    console.error("Error fetching products:", error);

    res.status(500).json({
      success: false,
      message: "Server error while fetching products"
    });
  }
};

/**
 * Returns a single product by ID
 */
export const getProductById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "SELECT * FROM products WHERE id = $1",
      [id]
    );

    // If product not found
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    const p = result.rows[0];

    // Format response
    const product = {
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      category: p.category,
      stock: p.stock_quantity,
      image_url: p.image_url,
      additional_attributes: p.additional_attributes,
      inStock: p.stock_quantity > 0
    };

    res.status(200).json({
      success: true,
      data: product
    });

  } catch (error) {
    console.error("Error fetching product by ID:", error);

    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};