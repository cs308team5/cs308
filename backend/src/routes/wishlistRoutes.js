import express from "express";
import {
  addToWishlist,
  listWishlist,
  removeFromWishlist,
} from "../controllers/wishlistController.js";

const router = express.Router();

router.get("/:userId", listWishlist);
router.post("/add", addToWishlist);
router.delete("/remove", removeFromWishlist);

export default router;
