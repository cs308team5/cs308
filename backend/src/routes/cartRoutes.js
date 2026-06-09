import express from "express";
import {
  addToCart,
  getCart,
  removeFromCart,
  updateCartQuantity,
} from "../controllers/cartController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, getCart);
router.post("/add", authMiddleware, addToCart);
router.patch("/:cartItemId", authMiddleware, updateCartQuantity);
router.delete("/:cartItemId", authMiddleware, removeFromCart);

export default router;
