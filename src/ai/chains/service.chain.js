import { RunnableSequence } from "@langchain/core/runnables";
import { RAGLLMWithTools } from "../models/llm.model.js";
import { servicePrompt } from "../prompts/service.prompt.js";
import { getHomeCareInfo } from "../tools/home-care-info.tool.js";
import { getHomeConstructionInfo } from "../tools/home-construction-info.tool.js";
import { getHomeConstructionCategory } from "../tools/home-construction-category.tool.js";
import { getHomeCareCategory } from "../tools/home-care-category.tool.js";

const tools = [getHomeCareInfo, getHomeConstructionInfo, getHomeConstructionCategory, getHomeCareCategory];
const llmWithTools = RAGLLMWithTools(tools);

export const serviceChain = RunnableSequence.from([
  async (input) => ({
    question: input.question,
    chat_history: input.chat_history ?? [],
  }),
  servicePrompt,
  llmWithTools
]);