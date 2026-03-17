import messageService from '../services/message.service.js';

class MessageController {
    async createMessage(req, res) {
        try {
            const { phoneNumber, content, role, conversationId } = req.body;

            // validation request
            if (!content) {
                return res.status(400).json({
                    success: false,
                    message: "Nội dung tin nhắn là bắt buộc"
                });
            }

            if (!role) {
                return res.status(400).json({
                    success: false,
                    message: "Role là bắt buộc"
                });
            }

            if (!conversationId) {
                return res.status(400).json({
                    success: false,
                    message: "conversationId là bắt buộc"
                });
            }

            const message = await messageService.createMessage({
                phoneNumber,
                content,
                role,
                conversationId
            });

            return res.status(201).json({
                success: true,
                message: "Tin nhắn đã được tạo",
                data: message
            });

        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
}

export default new MessageController();