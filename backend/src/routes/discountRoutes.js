import express from "express";
import { setDiscount, removeDiscount, getDiscountedProducts, setProductPrice } from "../controllers/discountController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { requireSalesManager } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, requireSalesManager, getDiscountedProducts);
router.patch("/:id/price", authMiddleware, requireSalesManager, setProductPrice);
router.patch("/:id/discount", authMiddleware, requireSalesManager, setDiscount);
router.delete("/:id/discount", authMiddleware, requireSalesManager, removeDiscount);

export default router;
