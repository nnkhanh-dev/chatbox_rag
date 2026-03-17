import { intentClassifierLLM } from "../models/llm.model.js";
import { intentRoutingPrompt } from "../prompts/intent-routing.prompt.js";

export async function classifyIntent(input) {

  const messages = await intentRoutingPrompt.formatMessages({
    question: input.question,
    chat_history: input.chat_history || []
  });

  const response = await intentClassifierLLM.invoke(messages);

  const intent = response.content
    .toLowerCase()
    .match(/service|document|general|billing/)?.[0] || "general";

  return intent;
}