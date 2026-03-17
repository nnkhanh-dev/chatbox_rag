import "dotenv/config";
import app from "./app.js";
import connectDB from "./config/database.js";
import { initializeVectorStore } from "./ai/vectorstore/chroma.js";
import { initializeAgenda } from "./config/agenda.js";
import { defineIngestJobs } from "./jobs/ingest.job.js";

const PORT = process.env.PORT;

const startServer = async () => {
  try {
    // Connect to MongoDB
    console.log("Connecting to MongoDB...");
    await connectDB();
    
    // Initialize Agenda background jobs (after MongoDB connected)
    console.log("Initializing Agenda...");
    const agenda = await initializeAgenda();
    
    // Define agenda jobs
    console.log("Defining Agenda jobs...");
    defineIngestJobs(agenda);

    // Initialize vector store (after MongoDB connected)
    console.log("Initializing vector store...");
    await initializeVectorStore();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`API: http://localhost:${PORT}/api`);
    });
    
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();