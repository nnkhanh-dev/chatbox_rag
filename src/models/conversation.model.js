import mongoose  from "mongoose";

const conversationSchema = new mongoose.Schema(
    {
        phoneNumber: {
        type: String,
        required: true,
        index: true,
        unique: true
    }
    },
    {
        timestamps: true
    }
);

export default mongoose.model("Conversation", conversationSchema);