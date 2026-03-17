import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
    {
        conversationId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Conversation",
                required: true,
                index: true
        },
        phoneNumber: {
            type: String,
            index: true
        },
        content: {
            type: String,
            required: true
        },
        role: {
            type: String,
            enum: ["human", "assistant"],
            required: true
        },
        actions: {
            type: [
                {
                    type: {
                        type: String,
                        enum: ["link"],
                        required: true
                    },
                    label: {
                        type: String,
                        required: true
                    },
                    url: {
                        type: String,
                        required: true
                    }
                }
            ],
            default: []
        }
    },
    {
        timestamps: true
    }
)

export default mongoose.model("Message", messageSchema);