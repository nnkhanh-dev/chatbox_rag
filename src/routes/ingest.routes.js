import express from "express";
import multer from "multer";
import ingestController from "../controllers/ingest.controller.js";

const router = express.Router();

// Configure multer for file upload
const upload = multer({
    dest: "uploads/temp", // Temporary directory
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB max (will be validated by service per type)
    }
});

// Upload document and trigger indexing
router.post("/upload", upload.single("file"), ingestController.uploadFile);

// Ingest text content directly (no file upload)
router.post("/text", ingestController.ingestText);

// Get ingest logs
router.get("/logs", ingestController.getIngestLogs);

export default router;
