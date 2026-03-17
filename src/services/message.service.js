import Message from "../models/message.model.js";

class MessageService {
    async createMessage (data) {
        if (!data.content) {
            throw new Error("content is required");
        }

        if (!data.role) {
            throw new Error("role is required");
        }

        if (!['human', 'assistant'].includes(data.role)) {
            throw new Error("role must be either 'human' or 'assistant'");
        }

        if (!data.conversationId) {
            throw new Error("conversationId is required");
        }

        // phoneNumber is optional - will be included if provided
        return Message.create(data);
    }

    async getMessagesByConversationPhoneNumber (phoneNumber, search, skip = 0, limit = 10) {
        if (skip < 0) skip = 0;
        if (limit < 1) limit = 10;
        
        const query = {
            phoneNumber
        }

        if (search) {
            query.content = {
                $regex: search,
                $options: "i"
            }
        }

        return Message.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
    }

    async getMessagesByConversationId (conversationId, limit = 10) {
        if (limit < 1) limit = 10;
        
        return Message.find({ conversationId })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();
    }
}

export default new MessageService();