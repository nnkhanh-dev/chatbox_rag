import { RunnableSequence } from "@langchain/core/runnables";
import { RAGLLM } from "../models/llm.model.js";
import { generalPrompt } from "../prompts/general.prompt.js";

export const generalChain = RunnableSequence.from([
  async (input) => {
    return {
      question: input.question,
      chat_history: input.chat_history ?? []
    };
  },
  generalPrompt,
  RAGLLM
]);