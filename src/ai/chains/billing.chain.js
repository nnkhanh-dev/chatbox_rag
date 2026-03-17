import { RunnableSequence } from "@langchain/core/runnables";
import { RAGLLMWithTools } from "../models/llm.model.js";
import { billingPrompt } from "../prompts/billing.prompt.js";
import { getHomeCareBillings } from "../tools/home-care-billings.tool.js";
import { getHomeConstructionBillings } from "../tools/home-construction-billings.tool.js";
import { getHomeConstructionBillingInfo } from "../tools/home-construction-billing-info.tool.js";
import { getHomeCareBillingInfo } from "../tools/home-care-billing-info.tool.js";


const tools = [getHomeCareBillings, getHomeConstructionBillings, getHomeConstructionBillingInfo, getHomeCareBillingInfo];
const llmWithTools = RAGLLMWithTools(tools);

export const billingChain = RunnableSequence.from([
  async (input) => ({
    question: input.question,
    chat_history: input.chat_history ?? [],
  }),
  billingPrompt,
  llmWithTools
]);