import {Chroma} from "@langchain/community/vectorstores/chroma";
import {createEmbeddingModel} from "../models/embedding.model.js";

let vectorStore = null;

//function to initialize vector store (lazy fallback)
export const getVectorStore = async () => {
    if (vectorStore) {
        return vectorStore;
    }

    try{
        vectorStore = await Chroma.fromExistingCollection(createEmbeddingModel, {
            collectionName: process.env.CHROMA_COLLECTION_NAME,
            url: process.env.CHROMA_URL
        });

        console.log("✅ Vector store initialized successfully");
        
        return vectorStore;
    }
    catch (error) {
        console.error("❌ Error initializing vector store:", error);

        try {
            vectorStore = await Chroma.fromDocuments([], createEmbeddingModel, {
                collectionName: process.env.CHROMA_COLLECTION_NAME,
                url: process.env.CHROMA_URL
            });

            console.log("✅ Vector store created successfully");
            return vectorStore;
        }
        catch (error) {
            console.error("❌ Error creating vector store:", error);
            throw new Error("Vector store initialization failed"); 
        }
    }
}

//function to initialize vector store at server startup (startup initialization)
export const initializeVectorStore = async () => {
    try {
        await getVectorStore();
        console.log("✅ Vector store is ready to use");
    }   
    catch (error) {
        console.error("❌ Failed to initialize vector store:", error);
    }         
}

