import { getVectorStore } from "../vectorstore/chroma.js";

export const searchSimilarDocuments = async (query, k = 5) => {
  if (!query) {
    throw new Error("Query is required");
  }

  const vectorStore = await getVectorStore();

  const results = await vectorStore.similaritySearch(query, k);

  return results;
};

export const searchSimilarDocumentsWithScore = async (query, k = 5) => {
  if (!query) {
    throw new Error("Query is required");
  }

  const vectorStore = await getVectorStore();

  const results = await vectorStore.similaritySearchWithScore(query, k);

  return results;
};

export const retrieveDocuments = async ({query, k = 5, scoreThreshold = 0.5}) => {
  if (!query) {
    throw new Error("Query is required");
  }

  const vectorStore = await getVectorStore();

  const results = await vectorStore.similaritySearchWithScore(query, k);

  const documents = results
    .filter(([_, score]) => score >= scoreThreshold)
    .map(([doc]) => doc);

  return documents;
};