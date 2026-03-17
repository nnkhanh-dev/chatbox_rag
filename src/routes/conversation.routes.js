import express from "express";
import conversationController from "../controllers/conversation.controller.js";

const router = express.Router();

// Tạo conversation mới
router.post("/", conversationController.createConversation);

// Lấy chi tiết conversation
router.get("/:conversationId", conversationController.getConversations);

// Xóa conversation
router.delete("/:conversationId", conversationController.deleteConversation);

export default router;