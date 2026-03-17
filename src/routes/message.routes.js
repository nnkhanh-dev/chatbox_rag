import express from "express";
import messageController from "../controllers/message.controller.js";

const router = express.Router();

// Tạo message
router.post("/", messageController.createMessage);

export default router;