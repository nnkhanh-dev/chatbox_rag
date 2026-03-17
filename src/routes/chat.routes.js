import express from "express";
import chatController from "../controllers/chat.controller.js";

const router = express.Router();

// Initialize chat - get or create conversation with recent messages
router.post("/initial", chatController.initial);

// Start new conversation with first question
router.post("/start", chatController.startConversation);
router.post("/start/stream", chatController.startConversationStream);

// Continue existing conversation
router.post("/continue", chatController.continueConversation);
router.post("/continue/stream", chatController.continueConversationStream);

export default router;
