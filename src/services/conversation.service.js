import Conversation from "../models/conversation.model.js";

class ConversationService {
    async createConversation (data) {
        return Conversation.create(data);
    }

    async getConversations (skip = 0, limit = 10, phoneNumber) {
        if (skip < 0) skip = 0;
        if (limit < 1) limit = 10;
        const query = phoneNumber ? { phoneNumber } : {};
        return Conversation.find(query).sort({ createdAt: -1 }) .skip(skip).limit(limit).lean();
    }

    async countConversations(phoneNumber) {
        const query = phoneNumber ? { phoneNumber } : {};
        return Conversation.countDocuments(query);
    }

    async getConversationByPhoneNumber (phoneNumber) {
        return Conversation.findOne({ phoneNumber }).lean();
    }

    async getConversationById (conversationId) {
        return Conversation.findById(conversationId).lean();
    }

    async deleteConversation (conversationId) {
        return Conversation.findByIdAndDelete(conversationId);
    }
}

export default new ConversationService();