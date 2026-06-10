import express from "express";
import { signup, login, updateProfile } from "../controllers/authController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.patch("/profile", authMiddleware, updateProfile);

export default router;
