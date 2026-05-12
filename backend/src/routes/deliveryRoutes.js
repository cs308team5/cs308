import express from "express";
import {
  updateDeliveryStatus,
  getAllDeliveries,
  getMyDeliveries,
} from "../controllers/deliveryController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { requireProductManager } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get("/manager", authMiddleware, requireProductManager, getAllDeliveries);
router.get("/admin", authMiddleware, requireProductManager, getAllDeliveries);
router.patch("/:deliveryId/status", authMiddleware, requireProductManager, updateDeliveryStatus);
router.get("/my/:customerId", authMiddleware, getMyDeliveries);
export default router;
