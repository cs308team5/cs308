import express from "express";
import {
  calculateRevenue,
  generateInvoice,
  generateManagerInvoice,
  listInvoices,
  sendInvoiceEmail,
  sendInvoicePreviewEmail,
} from "../controllers/invoiceController.js";

import authMiddleware from "../middleware/authMiddleware.js";
import { requireProductManager, requireSalesManager } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.post("/send-preview", authMiddleware, sendInvoicePreviewEmail);
router.get("/manager", authMiddleware, requireSalesManager, listInvoices);
router.get("/manager/revenue", authMiddleware, requireSalesManager, calculateRevenue);
router.get("/manager/:orderId/pdf", authMiddleware, requireSalesManager, generateManagerInvoice);
router.get("/product-manager", authMiddleware, requireProductManager, listInvoices);
router.get("/product-manager/:orderId/pdf", authMiddleware, requireProductManager, generateManagerInvoice);
router.get("/:orderId", authMiddleware, generateInvoice);
router.post("/send/:orderId", authMiddleware, sendInvoiceEmail);

export default router;
