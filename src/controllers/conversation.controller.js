import conversationService from "../services/conversation.service.js";

class ConversationController {
    async createConversation (req, res) {
        try {
            const {phoneNumber} = req.body;

            if (!phoneNumber) {
                return res.status(400).json({ message: "Số điện thoại là bắt buộc" });
            }

            const conversation = await conversationService.createConversation({ phoneNumber });

            return res.status(201).json({
                message: "Cuộc trò chuyện mới đã được tạo",
                data: conversation
            });
        }
        catch (error) {
            return res.status(500).json({ message: error.message });
        }
    }

    async getConversations (req, res) {
        try {
            let { skip, limit, phoneNumber } = req.query;

            skip = parseInt(skip) || 0;
            limit = parseInt(limit) || 10;

                const conversations = await conversationService.getConversations(skip, limit, phoneNumber);
                const total = await conversationService.countConversations(phoneNumber);

                return res.status(200).json({
                    message: "Danh sách cuộc trò chuyện",
                    data: conversations,
                    pagination: {
                        skip,
                        limit,
                        total
                    }   
                });
        }
        catch (error) {
            return res.status(500).json({ message: error.message });
        }
    }

    async getConversationByPhoneNumber (req, res) {
        try {
            const { phoneNumber } = req.params;

            if (!phoneNumber) {
                return res.status(400).json({ message: "Số điện thoại là bắt buộc" });
            }

            const conversation = await conversationService.getConversationByPhoneNumber(phoneNumber);

            if (!conversation) {
                return res.status(404).json({ message: "Không tìm thấy cuộc trò chuyện với số điện thoại này" });
            }

            return res.status(200).json({
                message: "Lấy thông tin cuộc trò chuyện thành công",
                data: conversation
            });
        }
        catch (error) {
            return res.status(500).json({ message: error.message });
        }
    }

    async deleteConversation (req, res) {
        try {
            const { conversationId } = req.params;
            if (!conversationId) {
                return res.status(400).json({ message: "ID cuộc trò chuyện là bắt buộc" });
            }

            const deletedConversation = await conversationService.deleteConversation(conversationId);
            if (!deletedConversation) {
                return res.status(404).json({ message: "Không tìm thấy cuộc trò chuyện với ID này" });
            }

            return res.status(200).json({
                message: "Xóa cuộc trò chuyện thành công",
            });
        }
        catch (error) {
            return res.status(500).json({ message: error.message });
        }
    }
}

export default new ConversationController();