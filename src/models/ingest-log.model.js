import { _HashedDocument } from "@langchain/core/indexing";
import mongoose from "mongoose";

const ingestLogSchema = new mongoose.Schema({
    documentType: {
        type: String,
        enum: ["pdf", "docx", "txt", "url", "text", "xlsx"],
        required: true
    },
    status: {
        type: String,
        enum: ["pending", "processing", "completed", "failed"],
        default: "pending",
        required: true,
        index: true
    },
    ingestedBy: {
        type: String,
        required: true
    },
    ingestedAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    detailsMessage: {
        type: String
    },
    totalChunks: {
        type: Number,
        default: 0
    },
    successChunks: {
        type: Number,
        default: 0
    },
    failedChunks: {
        type: Number,
        default: 0
    },
    documentPath: {
        type: String
    },
    content:{
        type: String
    },
    hashDocument: {
        type: String,
        required: true,
        index: true 
    }
});

export default mongoose.model("IngestLog", ingestLogSchema);