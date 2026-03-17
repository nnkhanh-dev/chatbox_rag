import { ChatOpenAI } from "@langchain/openai";

export const generalLLM = new ChatOpenAI({
  model: process.env.OPENAI_LLM_MODEL,
  temperature: 0.4,
  maxTokens: 1000,
  timeout: 60000,
  streaming: true
});

export const intentClassifierLLM = new ChatOpenAI({
  model: process.env.OPENAI_CLASSIFIER_MODEL || process.env.OPENAI_LLM_MODEL,
  temperature: 0,
  maxTokens: 20,
  timeout: 20000
});

export const RAGLLM = new ChatOpenAI({
  model: process.env.OPENAI_LLM_MODEL,
  temperature: 0.2,
  maxTokens: 1000,
  timeout: 60000,
  streaming: true
});

export const RAGLLMWithTools = (tools = []) => {
  return RAGLLM.bindTools(tools);
};