import express from "express";
import {
  generateInvoice,
  sendInvoiceEmail,
} from "../controllers/invoiceController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/:orderId", authMiddleware, generateInvoice);
router.post("/send/:orderId", authMiddleware, sendInvoiceEmail);

export default router;