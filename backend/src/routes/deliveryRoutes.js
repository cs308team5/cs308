import express from "express";
import { updateDeliveryStatus, getMyDeliveries } from "../controllers/deliveryController.js";

const router = express.Router();

router.patch("/:deliveryId/status", updateDeliveryStatus);
router.get("/my/:customerId", getMyDeliveries);
export default router;
