import express from "express";
import { getMyOrders } from "../controllers/myOrdersController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/my-orders", authMiddleware, getMyOrders);

export default router;
