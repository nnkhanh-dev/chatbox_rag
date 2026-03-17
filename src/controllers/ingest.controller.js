import ingestService from "../services/ingest.service.js";
import { initializeAgenda } from "../config/agenda.js";

class IngestController {
    async uploadFile(req, res) {
        try {
            // Validate file
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: "File is required"
                });
            }

            // Get ingestedBy from request body or default
            const ingestedBy = "admin";

            // Step 1: Upload file to disk
            const uploadResult = await ingestService.uploadDocument(req.file);

            if (!uploadResult.success) {
                return res.status(400).json(uploadResult);
            }

            // Step 2: Create ingest log with pending status
            const logResult = await ingestService.createIngestLog({
                documentType: uploadResult.file.type,
                status: "pending",
                ingestedBy,
                hashDocument: "temp-" + Date.now(), // Temporary hash, will be updated after loading
                documentPath: uploadResult.file.path
            });

            // Step 3: Return response immediately
            res.status(202).json({
                success: true,
                message: "File uploaded successfully. Processing in background.",
                data: {
                    file: uploadResult.file,
                    ingestLogId: logResult.data._id,
                    status: "pending"
                }
            });

            // Step 4: Fire and forget - Schedule agenda job (non-blocking)
            setImmediate(async () => {
                try {
                    const agenda = await initializeAgenda();
                    await agenda.now("process-document", {
                        filePath: uploadResult.file.path,
                        fileType: uploadResult.file.type,
                        ingestLogId: logResult.data._id.toString()
                    });
                } catch (error) {
                    console.error("Failed to schedule document processing job:", error);
                }
            });

        } catch (error) {
            console.error("Error in upload controller:", error);
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Ingest text content directly without file upload
     */
    async ingestText(req, res) {
        try {
            const { content, ingestedBy } = req.body;

            // Validate content
            if (!content) {
                return res.status(400).json({
                    success: false,
                    message: "content is required"
                });
            }

            if (typeof content !== "string") {
                return res.status(400).json({
                    success: false,
                    message: "content must be a string"
                });
            }

            const ingestedByValue = "admin";

            // Create hash for the content
            const crypto = await import("crypto");
            const hashDocument = crypto.createHash("sha256").update(content).digest("hex");

            // Create ingest log
            const logResult = await ingestService.createIngestLog({
                documentType: "text",
                status: "pending",
                ingestedBy: ingestedByValue,
                hashDocument,
                content: content.substring(0, 500)
            });

            // Return response immediately
            res.status(202).json({
                success: true,
                message: "Text received. Processing in background.",
                data: {
                    ingestLogId: logResult.data._id,
                    status: "pending",
                    contentLength: content.length
                }
            });

            // Fire and forget - Schedule agenda job (non-blocking)
            setImmediate(async () => {
                try {
                    const agenda = await initializeAgenda();
                    await agenda.now("process-text", {
                        content,
                        ingestLogId: logResult.data._id.toString()
                    });
                } catch (error) {
                    console.error("Failed to schedule text processing job:", error);
                }
            });

        } catch (error) {
            console.error("Error in ingestText controller:", error);
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async getIngestLogs(req, res) {
        try {
            const { skip, limit, type } = req.query;

            const result = await ingestService.getIngestLog(
                parseInt(skip) || 0,
                parseInt(limit) || 10,
                type
            );

            return res.status(200).json(result);

        } catch (error) {
            console.error("Error in getIngestLogs controller:", error);
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
}

export default new IngestController();