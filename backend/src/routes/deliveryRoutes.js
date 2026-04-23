import express from "express";
import { updateDeliveryStatus } from "../controllers/deliveryController.js";

const router = express.Router();

router.patch("/:deliveryId/status", updateDeliveryStatus);

export default router;
