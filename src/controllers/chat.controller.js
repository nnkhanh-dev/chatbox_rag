import conversationService from "../services/conversation.service.js";
import messageService from "../services/message.service.js";
import chatService from "../services/chat.service.js";

class ChatController {
    constructor() {
        this.initial = this.initial.bind(this);
        this.startConversation = this.startConversation.bind(this);
        this.startConversationStream = this.startConversationStream.bind(this);
        this.continueConversation = this.continueConversation.bind(this);
        this.continueConversationStream = this.continueConversationStream.bind(this);
    }

    async streamJsonLines(res, payload) {
        res.write(`${JSON.stringify(payload)}\n`);
    }

    prepareStreamingResponse(res) {
        res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("X-Accel-Buffering", "no");

        if (typeof res.flushHeaders === "function") {
            res.flushHeaders();
        }
    }

    /**
     * Initialize chat - Get or create conversation with recent messages
     * POST /chat/initial
     * Body: { phoneNumber }
     * Response: { conversation, messages }
     */
    async initial(req, res) {
        try {
            const { phoneNumber } = req.body;

            // Validation
            if (!phoneNumber) {
                return res.status(400).json({
                    success: false,
                    message: "Số điện thoại là bắt buộc"
                });
            }

            // Check if conversation exists
            let conversation = await conversationService.getConversationByPhoneNumber(phoneNumber);

            let messages = [];

            // If conversation exists, get recent messages
            if (conversation) {
                const recentMessages = await messageService.getMessagesByConversationId(
                    conversation._id.toString(),
                    10
                );
                
                // Reverse to get oldest first (chronological order)
                messages = recentMessages.reverse();
            } else {
                // Create new conversation if doesn't exist
                conversation = await conversationService.createConversation({ phoneNumber });
            }

            return res.status(200).json({
                success: true,
                message: messages.length > 0 ? "Đã tải cuộc trò chuyện" : "Đã tạo cuộc trò chuyện mới",
                data: {
                    conversation,
                    messages
                }
            });

        } catch (error) {
            console.error("Error in initial controller:", error);
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Start a new conversation with first question
     * POST /chat/start
     * Body: { question, phoneNumber }
     */
    async startConversation(req, res) {
        try {
            const { question, phoneNumber } = req.body;

            // Validation
            if (!question) {
                return res.status(400).json({
                    success: false,
                    message: "Câu hỏi là bắt buộc"
                });
            }

            if (!phoneNumber) {
                return res.status(400).json({
                    success: false,
                    message: "Số điện thoại là bắt buộc"
                });
            }

            // Process chat
            const result = await chatService.startConversation({
                question,
                phoneNumber
            });

            return res.status(200).json({
                success: true,
                message: "Cuộc trò chuyện mới đã được tạo",
                data: result
            });

        } catch (error) {
            console.error("Error in startConversation controller:", error);
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Start conversation with streaming response
     * POST /chat/start/stream
     * Body: { question, phoneNumber }
     */
    async startConversationStream(req, res) {
        try {
            const { question, phoneNumber } = req.body;

            if (!question) {
                return res.status(400).json({
                    success: false,
                    message: "Câu hỏi là bắt buộc"
                });
            }

            if (!phoneNumber) {
                return res.status(400).json({
                    success: false,
                    message: "Số điện thoại là bắt buộc"
                });
            }

            this.prepareStreamingResponse(res);

            const result = await chatService.startConversationStream({
                question,
                phoneNumber,
                onStart: async ({ conversationId, phoneNumber: currentPhone }) => {
                    await this.streamJsonLines(res, {
                        type: "start",
                        conversationId,
                        phoneNumber: currentPhone
                    });
                },
                onToken: async (token) => {
                    await this.streamJsonLines(res, {
                        type: "chunk",
                        chunk: token
                    });
                }
            });

            await this.streamJsonLines(res, {
                type: "done",
                data: result
            });

            res.end();
        } catch (error) {
            console.error("Error in startConversationStream controller:", error);

            if (!res.headersSent) {
                return res.status(500).json({
                    success: false,
                    message: error.message
                });
            }

            await this.streamJsonLines(res, {
                type: "error",
                message: error.message
            });
            res.end();
        }
    }

    /**
     * Continue an existing conversation
     * POST /chat/continue
     * Body: { question, conversationId }
     */
    async continueConversation(req, res) {
        try {
            const { question, conversationId } = req.body;

            // Validation
            if (!question) {
                return res.status(400).json({
                    success: false,
                    message: "Câu hỏi là bắt buộc"
                });
            }

            if (!conversationId) {
                return res.status(400).json({
                    success: false,
                    message: "ID cuộc trò chuyện là bắt buộc"
                });
            }

            // Process chat
            const result = await chatService.continueConversation({
                question,
                conversationId
            });

            return res.status(200).json({
                success: true,
                message: "Phản hồi thành công",
                data: result
            });

        } catch (error) {
            console.error("Error in continueConversation controller:", error);
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Continue conversation with streaming response
     * POST /chat/continue/stream
     * Body: { question, conversationId }
     */
    async continueConversationStream(req, res) {
        try {
            const { question, conversationId } = req.body;

            if (!question) {
                return res.status(400).json({
                    success: false,
                    message: "Câu hỏi là bắt buộc"
                });
            }

            if (!conversationId) {
                return res.status(400).json({
                    success: false,
                    message: "ID cuộc trò chuyện là bắt buộc"
                });
            }

            this.prepareStreamingResponse(res);

            const result = await chatService.continueConversationStream({
                question,
                conversationId,
                onStart: async ({ conversationId: activeConversationId }) => {
                    await this.streamJsonLines(res, {
                        type: "start",
                        conversationId: activeConversationId
                    });
                },
                onToken: async (token) => {
                    await this.streamJsonLines(res, {
                        type: "chunk",
                        chunk: token
                    });
                }
            });

            await this.streamJsonLines(res, {
                type: "done",
                data: result
            });

            res.end();
        } catch (error) {
            console.error("Error in continueConversationStream controller:", error);

            if (!res.headersSent) {
                return res.status(500).json({
                    success: false,
                    message: error.message
                });
            }

            await this.streamJsonLines(res, {
                type: "error",
                message: error.message
            });
            res.end();
        }
    }
}

export default new ChatController();