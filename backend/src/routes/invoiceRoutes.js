import express from "express";
import {
  generateInvoice,
  generateManagerInvoice,
  listInvoices,
  sendInvoiceEmail,
  sendInvoicePreviewEmail,
} from "../controllers/invoiceController.js";

import authMiddleware from "../middleware/authMiddleware.js";
import { requireSalesManager } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.post("/send-preview", sendInvoicePreviewEmail);
router.get("/manager", authMiddleware, requireSalesManager, listInvoices);
router.get("/manager/:orderId/pdf", authMiddleware, requireSalesManager, generateManagerInvoice);
router.get("/:orderId", authMiddleware, generateInvoice);
router.post("/send/:orderId", authMiddleware, sendInvoiceEmail);

export default router;