import express from "express";
import { submitComment, getPendingComments, updateCommentStatus } from "../controllers/commentController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, submitComment);
router.get("/pending", authMiddleware, adminMiddleware, getPendingComments);
router.patch("/:id/status", authMiddleware, adminMiddleware, updateCommentStatus);

export default router;