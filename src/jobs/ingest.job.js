import ingestService from "../services/ingest.service.js";

/**
 * Define agenda jobs for document ingestion
 */
export const defineIngestJobs = (agenda) => {
    
    // Job: Process uploaded document (load + index)
    agenda.define("process-document", async (job) => {
        const { filePath, fileType, ingestLogId } = job.attrs.data;

        console.log(`📄 Processing document: ${ingestLogId}`);

        try {
            // Load document
            const content = await ingestService.loadDocument(filePath, fileType);

            // Index document
            await ingestService.indexingDocument(content, ingestLogId);

            console.log(`✅ Document processed successfully: ${ingestLogId}`);

        } catch (error) {
            console.error(`❌ Error processing document ${ingestLogId}:`, error);
            throw error; // Agenda will handle retry
        }
    });

    // Job: Process text content (index directly)
    agenda.define("process-text", async (job) => {
        const { content, ingestLogId } = job.attrs.data;

        console.log(`📝 Processing text: ${ingestLogId}`);

        try {
            // Index text content directly
            await ingestService.indexingDocument(content, ingestLogId);

            console.log(`✅ Text indexed successfully: ${ingestLogId}`);

        } catch (error) {
            console.error(`❌ Error indexing text ${ingestLogId}:`, error);
            throw error; // Agenda will handle retry
        }
    });

    console.log("✅ Ingest jobs defined");
};
