import path from "path";
import fs from "fs";
import crypto from "crypto";

import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";

import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

import { getVectorStore } from "../ai/vectorstore/chroma.js";
import IngestLog from "../models/ingest-log.model.js";

class IngestService {
    constructor() {
        this.uploadDir = path.join(process.cwd(), "uploads", "documents");
        this.textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200
        });
        
        // Max file size for each type (in bytes)
        this.maxFileSizes = {
            ".pdf": 50 * 1024 * 1024,    // 50MB
            ".docx": 30 * 1024 * 1024,   // 30MB
            ".txt": 10 * 1024 * 1024,    // 10MB
            ".xlsx": 40 * 1024 * 1024,   // 40MB
            ".url": 1 * 1024 * 1024      // 1MB
        };
        
        this.allowedTypes = Object.keys(this.maxFileSizes);
        
        // Ensure upload directory exists
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
    }

    async uploadDocument(file) {
        try {
            // Validate file exists
            if (!file) {
                throw new Error("File is required");
            }

            // Validate file type
            const fileExtension = path.extname(file.originalname).toLowerCase();
            if (!this.allowedTypes.includes(fileExtension)) {
                throw new Error(`Invalid file type. Allowed types: ${this.allowedTypes.join(", ")}`);
            }

            // Validate file size
            const fileSize = file.size || file.buffer?.length || 0;
            const maxSize = this.maxFileSizes[fileExtension];
            
            if (fileSize > maxSize) {
                throw new Error(`File size exceeds limit for ${fileExtension}. Maximum: ${maxSize / (1024 * 1024)}MB`);
            }

            if (fileSize === 0) {
                throw new Error("File is empty");
            }

            // Generate unique filename
            const timestamp = Date.now();
            const randomString = crypto.randomBytes(8).toString("hex");
            const filename = `${timestamp}-${randomString}${fileExtension}`;
            const filePath = path.join(this.uploadDir, filename);

            // Save file
            if (file.path) {
                // File already saved by multer to temp location
                fs.renameSync(file.path, filePath);
            } else if (file.buffer) {
                // File in memory
                fs.writeFileSync(filePath, file.buffer);
            } else {
                throw new Error("Invalid file object");
            }

            return {
                success: true,
                message: "File uploaded successfully",
                file: {
                    filename,
                    originalname: file.originalname,
                    path: filePath,
                    size: fileSize,
                    type: fileExtension.substring(1)
                }
            };

        } catch (error) {
            throw error;
        }
    }

    async loadDocument(filePath, fileType) {
        try {

            if (!filePath) {
                throw new Error("filePath is required");
            }

            if (!fileType) {
                throw new Error("fileType is required");
            }

            if (!fs.existsSync(filePath)) {
                throw new Error(`File not found: ${filePath}`);
            }

            let loader;
            let docs;

            switch (fileType.toLowerCase()) {

                case "pdf":
                    loader = new PDFLoader(filePath);
                    docs = await loader.load();
                    break;

                case "docx":
                    loader = new DocxLoader(filePath);
                    docs = await loader.load();
                    break;

                case "txt":
                    return fs.readFileSync(filePath, "utf-8");

                case "csv":
                    loader = new CSVLoader(filePath);
                    docs = await loader.load();
                    break;

                case "xlsx": {
                    const xlsx = await import("xlsx");
                    const workbook = xlsx.readFile(filePath);

                    let content = "";

                    workbook.SheetNames.forEach(sheetName => {
                        const sheet = workbook.Sheets[sheetName];
                        const json = xlsx.utils.sheet_to_json(sheet, { header: 1 });

                        json.forEach(row => {
                            content += row.join(" ") + "\n";
                        });
                    });

                    return content;
                }

                case "url": {
                    const urlContent = fs.readFileSync(filePath, "utf-8");
                    const url = urlContent.trim();

                    const response = await fetch(url);

                    if (!response.ok) {
                        throw new Error(`Failed to fetch URL: ${response.statusText}`);
                    }

                    return await response.text();
                }

                default:
                    throw new Error(`Unsupported file type: ${fileType}`);
            }

            // convert docs -> text
            const extractedText = docs
                .map(doc => doc.pageContent)
                .join("\n\n");

            return extractedText;

        } catch (error) {
            console.error("Error in loadDocument:", error);
            throw error;
        }
    }
    async indexingDocument(content, ingestLogId) {
        let ingestLog = null;

        try {
            // Validate input
            if (!content) {
                throw new Error("content is required");
            }

            // Create hash from content
            const hashDocument = crypto.createHash("sha256").update(content).digest("hex");

            // Get ingest log if provided
            if (ingestLogId) {
                ingestLog = await IngestLog.findById(ingestLogId);
                if (!ingestLog) {
                    throw new Error("IngestLog not found");
                }
            }

            // Check if document with same hash already exists (completed status)
            const existingLog = await IngestLog.findOne({
                hashDocument,
                status: "completed",
                _id: { $ne: ingestLogId } // Exclude current log if exists
            });

            if (existingLog) {
                // Document already indexed - update current log
                if (ingestLog) {
                    ingestLog.status = "failed";
                    ingestLog.hashDocument = hashDocument;
                    ingestLog.detailsMessage = `Duplicate content. Already indexed at ${existingLog.ingestedAt.toISOString()}`;
                    await ingestLog.save();
                }
                
                throw new Error("Document with same content already indexed");
            }

            // Update log status to processing
            if (ingestLog) {
                ingestLog.status = "processing";
                ingestLog.hashDocument = hashDocument;
                ingestLog.content = content.substring(0, 500);
                await ingestLog.save();
            }

            // Split content into chunks
            const chunks = await this.textSplitter.createDocuments([content]);

            // Update total chunks count
            if (ingestLog) {
                ingestLog.totalChunks = chunks.length;
                await ingestLog.save();
            }

            // Get vector store
            const vectorStore = await getVectorStore();

            // Add chunks to vector database with embeddings
            await vectorStore.addDocuments(chunks);

            // Update log to completed
            if (ingestLog) {
                ingestLog.status = "completed";
                ingestLog.successChunks = chunks.length;
                ingestLog.failedChunks = 0;
                ingestLog.detailsMessage = `Successfully indexed ${chunks.length} chunks into vector database`;
                await ingestLog.save();
            }

            return {
                success: true,
                message: "Document indexed successfully",
                hashDocument,
                chunks: chunks.length,
                ingestLogId: ingestLog?._id
            };

        } catch (error) {
            // Update log to failed on error
            if (ingestLog) {
                ingestLog.status = "failed";
                ingestLog.detailsMessage = error.message;
                await ingestLog.save();
            }

            console.error("Error in indexingDocument:", error);
            throw error;
        }
    }

    async getIngestLog(skip = 0, limit = 10, type) {
        try {
            // Validate and normalize pagination params
            skip = parseInt(skip) || 0;
            limit = parseInt(limit) || 10;

            if (skip < 0) skip = 0;
            if (limit < 1) limit = 10;
            if (limit > 100) limit = 100; // Max limit

            // Build query
            const query = {};

            if (type) {
                query.documentType = type;
            }

            // Get logs with pagination
            const logs = await IngestLog.find(query)
                .sort({ ingestedAt: -1 }) // Sort by newest first
                .skip(skip)
                .limit(limit)
                .lean();

            // Get total count for pagination
            const total = await IngestLog.countDocuments(query);

            return {
                success: true,
                data: logs,
                pagination: {
                    skip,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                    currentPage: Math.floor(skip / limit) + 1
                }
            };

        } catch (error) {
            console.error("Error in getIngestLog:", error);
            throw error;
        }
    }

    async createIngestLog(data) {
        try {
            // Validate required fields
            if (!data.documentType) {
                throw new Error("documentType is required");
            }

            if (!data.ingestedBy) {
                throw new Error("ingestedBy is required");
            }

            if (!data.hashDocument) {
                throw new Error("hashDocument is required");
            }

            // Validate documentType enum
            const validTypes = ["pdf", "docx", "txt", "url", "text", "xlsx"];
            if (!validTypes.includes(data.documentType)) {
                throw new Error(`Invalid documentType. Must be one of: ${validTypes.join(", ")}`);
            }

            // Create ingest log
            const ingestLog = await IngestLog.create({
                documentType: data.documentType,
                status: data.status ,
                ingestedBy: data.ingestedBy,
                hashDocument: data.hashDocument,
                documentPath: data.documentPath || null,
                content: data.content || null,
                detailsMessage: data.detailsMessage || null,
                totalChunks: data.totalChunks || 0,
                successChunks: data.successChunks || 0,
                failedChunks: data.failedChunks || 0
            });

            return {
                success: true,
                message: "IngestLog created successfully",
                data: ingestLog
            };

        } catch (error) {
            console.error("Error in createIngestLog:", error);
            throw error;
        }
    }

}

export default new IngestService();
