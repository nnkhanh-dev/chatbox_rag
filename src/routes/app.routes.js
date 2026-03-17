import express from "express";

import conversationRoutes from "./conversation.routes.js";
import messageRoutes from "./message.routes.js";
import ingestRoutes from "./ingest.routes.js";
import chatRoutes from "./chat.routes.js";

const router = express.Router();

router.use("/conversation", conversationRoutes);
router.use("/message", messageRoutes);
router.use("/ingest", ingestRoutes);
router.use("/chat", chatRoutes);

export default router;