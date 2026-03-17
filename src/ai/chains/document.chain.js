import { RunnableSequence } from "@langchain/core/runnables";
import { retrieveDocuments } from "../retrievers/document.retriever.js";
import { RAGLLM } from "../models/llm.model.js";
import { documentPrompt } from "../prompts/document.prompt.js";

const formatDocuments = (docs) => {
  if (!docs || docs.length === 0) {
    return "Không tìm thấy thông tin liên quan trong tài liệu.";
  }

  return docs
    .map((doc, i) => `Document ${i + 1}:\n${doc.pageContent}`)
    .join("\n\n");
};

export const documentChain = RunnableSequence.from([
  async (input) => {

    const docs = await retrieveDocuments({
      query: input.question,
      k: 5
    });

    const context = formatDocuments(docs);

    return {
      question: input.question,
      chat_history: input.chat_history ?? [],
      context
    };
  },
  documentPrompt,
  RAGLLM
]);