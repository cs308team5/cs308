import express from "express";
import {
  updateDeliveryStatus,
  getAllDeliveries,
  getMyDeliveries,
} from "../controllers/deliveryController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

const router = express.Router();

router.get("/admin", authMiddleware, adminMiddleware, getAllDeliveries);
router.patch("/:deliveryId/status", authMiddleware, adminMiddleware, updateDeliveryStatus);
router.get("/my/:customerId", getMyDeliveries);
export default router;
