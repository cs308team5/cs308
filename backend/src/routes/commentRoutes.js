import express from "express";
import { submitComment, getPendingComments, updateCommentStatus } from "../controllers/commentController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { requireProductManager } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, submitComment);
router.get("/pending", authMiddleware, requireProductManager, getPendingComments);
router.patch("/:id/status", authMiddleware, requireProductManager, updateCommentStatus);

export default router;
