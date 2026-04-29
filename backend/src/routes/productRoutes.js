import express from "express";
import { getProducts, getProductById, createProduct, updateProduct, deleteProduct, getReviewEligibility } from "../controllers/productController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";
import { submitRating } from "../controllers/productController.js";
import pool from "../config/db.js";

const router = express.Router();

router.get("/", getProducts);

router.get("/search", async (req, res) => {
  const query = req.query.q;

  if (!query) {
    return res.json([]);
  }

  try {
    const result = await pool.query(
      `
      SELECT * FROM products
      WHERE name ILIKE $1 OR description ILIKE $1
      LIMIT 10
      `,
      [`%${query}%`]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

router.get("/:id", getProductById);
router.get("/:id/review-eligibility", authMiddleware, getReviewEligibility);
router.post("/:id/rating", authMiddleware, submitRating);

// Admin routes (auth korumalı)
router.post("/", authMiddleware, adminMiddleware, createProduct);
router.put("/:id", authMiddleware, adminMiddleware, updateProduct);
router.delete("/:id", authMiddleware, adminMiddleware, deleteProduct);

export default router;
