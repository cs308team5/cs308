import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { generateInvoice } from "../controllers/invoiceController.js";

const router = express.Router();

router.get("/:orderId", authMiddleware, generateInvoice);

export default router;