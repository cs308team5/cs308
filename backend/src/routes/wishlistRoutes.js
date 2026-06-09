import express from "express";
import {
  addToWishlist,
  listWishlist,
  removeFromWishlist,
} from "../controllers/wishlistController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, listWishlist);
router.get("/:userId", authMiddleware, listWishlist);
router.post("/add", authMiddleware, addToWishlist);
router.delete("/remove", authMiddleware, removeFromWishlist);

export default router;
