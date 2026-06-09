import express from "express";
import { cancelMyOrder, getMyOrders } from "../controllers/myOrdersController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/my-orders", authMiddleware, getMyOrders);
router.patch("/:orderId/cancel", authMiddleware, cancelMyOrder);

export default router;
