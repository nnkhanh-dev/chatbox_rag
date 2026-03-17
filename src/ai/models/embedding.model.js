import { OpenAIEmbeddings } from "@langchain/openai";

export const createEmbeddingModel = new OpenAIEmbeddings({
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_EMBEDDING_MODEL
});