import { HumanMessage, AIMessage } from "@langchain/core/messages";
import aiService from "../ai/services/ai.service.js";
import messageService from "./message.service.js";
import conversationService from "./conversation.service.js";

class ChatService {
    extractActionsFromAnswer(answer = "") {
        if (typeof answer !== "string" || !answer.trim()) {
            return {
                cleanAnswer: "",
                actions: []
            };
        }

        const buttonRegex = /\[BUTTON:\s*(.*?)\s*\|\s*(.*?)\]/gi;
        const actions = [];
        let match;

        while ((match = buttonRegex.exec(answer)) !== null) {
            const label = (match[1] || "").trim();
            const url = (match[2] || "").trim();

            if (!label || !url) {
                continue;
            }

            actions.push({
                type: "link",
                label,
                url
            });
        }

        let cleanAnswer = answer
            .replace(buttonRegex, "")
            .replace(/\n{3,}/g, "\n\n")
            .trim();

        if (!cleanAnswer && actions.length > 0) {
            cleanAnswer = "Bạn có thể sử dụng nút bên dưới:";
        }

        return {
            cleanAnswer,
            actions
        };
    }

    /**
     * Format message history cho LangChain
     */
    formatChatHistory(messages) {
        if (!messages || messages.length === 0) {
            return [];
        }

        return messages.map(msg => {
            if (msg.role === "human") {
                return new HumanMessage(msg.content);
            } else {
                return new AIMessage(msg.content);
            }
        });
    }

    /**
     * Get conversation history
     */
    async getConversationHistory(conversationId, limit = 10) {
        try {
            const messages = await messageService.getMessagesByConversationId(
                conversationId,
                limit
            );

            // Reverse để đúng thứ tự thời gian
            return messages.reverse();
        } catch (error) {
            console.error("Error getting conversation history:", error);
            return [];
        }
    }

    /**
     * Main chat function - orchestrator với intent routing và tool execution
     */
    async chat({ question, conversationId, phoneNumber }) {
        try {
            // Validate input
            if (!question) {
                throw new Error("question is required");
            }

            if (!conversationId) {
                throw new Error("conversationId is required");
            }

            if (!phoneNumber) {
                throw new Error("phoneNumber is required");
            }

            // 1. Save user message
            await messageService.createMessage({
                conversationId,
                phoneNumber,
                content: question,
                role: "human"
            });

            // 2. Get conversation history
            const history = await this.getConversationHistory(conversationId, 5);
            const chatHistory = this.formatChatHistory(history);

            // 3. Process message với AI Service (intent routing + chain invoke + tool loop)
            const result = await aiService.processMessage({
                question,
                chat_history: chatHistory,
                context: ""
            });

            const answer = result.answer;
            const intent = result.intent;
            const { cleanAnswer, actions } = this.extractActionsFromAnswer(answer);

            console.log('AI Service result:', {
                intent,
                answerLength: cleanAnswer.length,
                answerPreview: cleanAnswer.substring(0, 100),
                actionsCount: actions.length
            });

            // 4. Save AI response
            await messageService.createMessage({
                conversationId,
                phoneNumber,
                content: cleanAnswer,
                role: "assistant",
                actions
            });

            return {
                question,
                answer: cleanAnswer,
                actions,
                conversationId,
                intent
            };

        } catch (error) {
            console.error("Error in chat:", error);
            throw error;
        }
    }

    /**
     * Chat with real-time token streaming while preserving message persistence
     */
    async chatStream({ question, conversationId, phoneNumber, onToken = null }) {
        try {
            if (!question) {
                throw new Error("question is required");
            }

            if (!conversationId) {
                throw new Error("conversationId is required");
            }

            if (!phoneNumber) {
                throw new Error("phoneNumber is required");
            }

            await messageService.createMessage({
                conversationId,
                phoneNumber,
                content: question,
                role: "human"
            });

            const history = await this.getConversationHistory(conversationId, 5);
            const chatHistory = this.formatChatHistory(history);

            const result = await aiService.processMessageStream({
                question,
                chat_history: chatHistory,
                context: "",
                onToken
            });

            const answer = result.answer;
            const intent = result.intent;
            const { cleanAnswer, actions } = this.extractActionsFromAnswer(answer);

            await messageService.createMessage({
                conversationId,
                phoneNumber,
                content: cleanAnswer,
                role: "assistant",
                actions
            });

            return {
                question,
                answer: cleanAnswer,
                actions,
                conversationId,
                intent
            };
        } catch (error) {
            console.error("Error in chatStream:", error);
            throw error;
        }
    }

    /**
     * Start new conversation và chat
     */
    async startConversation({ question, phoneNumber }) {
        try {
            // Validate input
            if (!question) {
                throw new Error("question is required");
            }

            if (!phoneNumber) {
                throw new Error("phoneNumber is required");
            }

            // 1. Get or create conversation
            let conversation = await conversationService.getConversationByPhoneNumber(phoneNumber);

            if (!conversation) {
                conversation = await conversationService.createConversation({ phoneNumber });
            }

            // 2. Chat
            const result = await this.chat({
                question,
                conversationId: conversation._id,
                phoneNumber
            });

            return {
                ...result,
                conversation
            };

        } catch (error) {
            console.error("Error in startConversation:", error);
            throw error;
        }
    }

    /**
     * Start new conversation and stream assistant tokens
     */
    async startConversationStream({ question, phoneNumber, onStart = null, onToken = null }) {
        try {
            if (!question) {
                throw new Error("question is required");
            }

            if (!phoneNumber) {
                throw new Error("phoneNumber is required");
            }

            let conversation = await conversationService.getConversationByPhoneNumber(phoneNumber);

            if (!conversation) {
                conversation = await conversationService.createConversation({ phoneNumber });
            }

            const conversationId = conversation._id.toString();

            if (onStart) {
                await onStart({ conversationId, phoneNumber });
            }

            const result = await this.chatStream({
                question,
                conversationId,
                phoneNumber,
                onToken
            });

            return {
                ...result,
                conversation
            };
        } catch (error) {
            console.error("Error in startConversationStream:", error);
            throw error;
        }
    }

    /**
     * Continue existing conversation
     */
    async continueConversation({ question, conversationId }) {
        try {
            // Validate input
            if (!question) {
                throw new Error("question is required");
            }

            if (!conversationId) {
                throw new Error("conversationId is required");
            }

            // Get conversation
            const conversation = await conversationService.getConversationById(conversationId);

            if (!conversation) {
                throw new Error("Conversation not found");
            }

            // Chat
            return await this.chat({
                question,
                conversationId,
                phoneNumber: conversation.phoneNumber
            });

        } catch (error) {
            console.error("Error in continueConversation:", error);
            throw error;
        }
    }

    /**
     * Continue conversation and stream assistant tokens
     */
    async continueConversationStream({ question, conversationId, onStart = null, onToken = null }) {
        try {
            if (!question) {
                throw new Error("question is required");
            }

            if (!conversationId) {
                throw new Error("conversationId is required");
            }

            const conversation = await conversationService.getConversationById(conversationId);

            if (!conversation) {
                throw new Error("Conversation not found");
            }

            if (onStart) {
                await onStart({ conversationId: conversation._id.toString(), phoneNumber: conversation.phoneNumber });
            }

            return await this.chatStream({
                question,
                conversationId,
                phoneNumber: conversation.phoneNumber,
                onToken
            });
        } catch (error) {
            console.error("Error in continueConversationStream:", error);
            throw error;
        }
    }
}

export default new ChatService();
