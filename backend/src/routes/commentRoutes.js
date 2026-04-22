import express from "express";
import { submitComment, getPendingComments, updateCommentStatus } from "../controllers/commentController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, submitComment);
router.get("/pending", authMiddleware, getPendingComments);
router.patch("/:id/status", authMiddleware, updateCommentStatus);

export default router;