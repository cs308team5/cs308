import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { requireSalesManager } from "../middleware/roleMiddleware.js";
import {
  requestRefund,
  getMyRefunds,
  getAllRefunds,
  reviewRefund,
} from "../controllers/refundController.js";

const router = express.Router();

router.post("/", authMiddleware, requestRefund);
router.get("/my-refunds", authMiddleware, getMyRefunds);
router.get("/", authMiddleware, requireSalesManager, getAllRefunds);
router.patch("/:refundId", authMiddleware, requireSalesManager, reviewRefund);

export default router;
