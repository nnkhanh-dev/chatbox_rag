import { HumanMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import { classifyIntent } from "../routers/intent.router.js";
import { serviceChain } from "../chains/service.chain.js";
import { documentChain } from "../chains/document.chain.js";
import { generalChain } from "../chains/general.chain.js";
import { billingChain } from "../chains/billing.chain.js";
import { getHomeCareInfo } from "../tools/home-care-info.tool.js";
import { getHomeConstructionInfo } from "../tools/home-construction-info.tool.js";
import { getHomeConstructionCategory } from "../tools/home-construction-category.tool.js";
import { getHomeCareCategory } from "../tools/home-care-category.tool.js";
import { getHomeCareBillings } from "../tools/home-care-billings.tool.js";
import { getHomeConstructionBillings } from "../tools/home-construction-billings.tool.js";
import { getHomeConstructionBillingInfo } from "../tools/home-construction-billing-info.tool.js";
import { getHomeCareBillingInfo } from "../tools/home-care-billing-info.tool.js";

class AiService {
    constructor() {
        this.tools = 
        [   
            getHomeCareInfo, 
            getHomeConstructionInfo, 
            getHomeConstructionCategory, 
            getHomeCareCategory,
            getHomeCareBillings,
            getHomeConstructionBillings,
            getHomeConstructionBillingInfo,
            getHomeCareBillingInfo
        ];
    }

    /**
     * Parse action buttons from response text
     * Format: [BUTTON: Label | URL]
     * Note: This is kept for reference. chatService.extractActionsFromAnswer is used instead.
     */
    parseActionsFromResponse(text) {
        if (!text || typeof text !== 'string') return [];

        const actionPattern = /\[BUTTON:\s*([^|]+)\s*\|\s*([^\]]+)\]/g;
        const actions = [];
        let match;

        while ((match = actionPattern.exec(text)) !== null) {
            actions.push({
                type: 'link',
                label: match[1].trim(),
                url: match[2].trim()
            });
        }

        return actions;
    }

    /**
     * Remove button patterns from text (to clean up the displayed answer)
     */
    removeButtonPatterns(text) {
        if (!text || typeof text !== 'string') return text;
        return text.replace(/\[BUTTON:\s*[^|]+\s*\|\s*[^\]]+\]\n?/g, '').trim();
    }

    normalizeAnswer(response) {
        let answer = this.extractTextFromContent(response?.content);

        if (!answer && typeof response?.content === "object") {
            answer = JSON.stringify(response.content);
        }

        if (!answer || typeof answer !== "string" || answer.trim() === "") {
            console.error("Invalid answer from chain:", response);
            throw new Error("Failed to get valid response from AI");
        }

        return answer;
    }

    async streamChainResponse({ chain, input, onToken }) {
        let response = null;
        const stream = await chain.stream(input);

        for await (const chunk of stream) {
            response = response ? response.concat(chunk) : chunk;

            const token = this.extractTextFromContent(chunk?.content);
            if (token && onToken) {
                await onToken(token);
            }
        }

        return response;
    }

    /**
     * Main processing - nhận input, phân loại intent, invoke chain, xử lý tool loop
     */
    async processMessage({ question, chat_history = [], context = "" }) {
        try {
            console.log('\n=== AI Service: Processing Message ===');
            console.log('Question:', question);
            console.log('Chat history length:', chat_history.length);

            const routerHistory = chat_history
            .filter(m => !(m instanceof ToolMessage))
            .slice(-4);

            // 1. Classify intent
            const intent = await classifyIntent({ question, chat_history: routerHistory });
            console.log('Classified intent:', intent);

            // 2. Select chain dựa trên intent
            const chain = this.selectChain(intent);

            const chainHistory = chat_history
            .filter(m => !(m instanceof ToolMessage))
            .slice(-10);

            // 3. Prepare input for chain
            const chainInput = {
                question,
                chat_history: chainHistory,
                context
            };

            // 4. Initial invoke
            let response = await chain.invoke(chainInput);

            console.log('Initial response:', {
                intent,
                hasToolCalls: !!response.tool_calls,
                toolCallsCount: response.tool_calls?.length || 0,
                hasContent: !!response.content
            });

            // 5. Tool execution loop (chỉ cho tool intent)
            if ((intent === 'service' || intent === 'billing') && response.tool_calls && response.tool_calls.length > 0) {
                response = await this.executeToolLoop({
                    question,
                    chat_history,
                    initialResponse: response,
                    chain,
                    context
                });
            }

            // 6. Extract final answer
            let answer = response?.content || '';

            // Ensure answer is a string
            if (typeof answer === 'object') {
                answer = JSON.stringify(answer);
            }

            if (!answer || typeof answer !== 'string' || answer.trim() === '') {
                console.error('Invalid answer from chain:', response);
                throw new Error('Failed to get valid response from AI');
            }

            console.log('Final answer:', answer.substring(0, 100));

            return {
                answer,
                intent
            };

        } catch (error) {
            console.error("Error in AI Service processMessage:", error);
            throw error;
        }
    }

    /**
     * Stream response token-by-token từ LLM
     */
    async processMessageStream({ question, chat_history = [], context = "", onToken }) {
        try {
            console.log("\n=== AI Service: Streaming Message ===");
            console.log("Question:", question);
            console.log("Chat history length:", chat_history.length);

            const routerHistory = chat_history
                .filter((m) => !(m instanceof ToolMessage))
                .slice(-4);

            const intent = await classifyIntent({ question, chat_history: routerHistory });
            console.log("Classified intent:", intent);

            const chain = this.selectChain(intent);

            const chainHistory = chat_history
                .filter((m) => !(m instanceof ToolMessage))
                .slice(-10);

            const chainInput = {
                question,
                chat_history: chainHistory,
                context
            };

            let response;

            if (intent === "service") {
                // Lần đầu invoke để xác định có cần gọi tool hay không.
                const initialResponse = await chain.invoke(chainInput);

                if (initialResponse.tool_calls && initialResponse.tool_calls.length > 0) {
                    response = await this.executeToolLoop({
                        question,
                        chat_history,
                        initialResponse,
                        chain,
                        context,
                        onToken
                    });
                } else {
                    response = await this.streamChainResponse({
                        chain,
                        input: chainInput,
                        onToken
                    });
                }
            } else {
                response = await this.streamChainResponse({
                    chain,
                    input: chainInput,
                    onToken
                });
            }

            const answer = this.normalizeAnswer(response);

            console.log("Final streamed answer:", answer.substring(0, 100));

            return {
                answer,
                intent
            };
        } catch (error) {
            console.error("Error in AI Service processMessageStream:", error);
            throw error;
        }
    }

    /**
     * Select chain dựa trên intent
     */
    selectChain(intent) {
        switch (intent) {
            case 'service':
                return serviceChain;
            case 'document':
                return documentChain;
            case 'billing':
                return billingChain;
            case 'general':
                return generalChain;
            default:
                return generalChain;
        }
    }

    /**
     * Tool execution loop - xử lý tool calls cho toolChain
     */
    async executeToolLoop({ question, chat_history, initialResponse, chain, context = "", onToken = null }) {
        let response = initialResponse;
        let iterations = 0;
        const maxIterations = 3;

        // Build message history
        const allMessages = [...chat_history, new HumanMessage(question)];

        // Track already-called tools to prevent redundant re-calls
        const calledToolKeys = new Set();
        // Cache results keyed by toolName:argsString
        const toolResultCache = new Map();

        while (response.tool_calls && response.tool_calls.length > 0 && iterations < maxIterations) {
            iterations++;
            console.log(`\n=== Tool Execution Loop - Iteration ${iterations} ===`);

            // Add AI response với tool_calls vào message history
            allMessages.push(response);

            // Execute tất cả tools được gọi
            const toolMessages = await Promise.all(
                response.tool_calls.map(async (toolCall) => {
                    const cacheKey = `${toolCall.name}:${JSON.stringify(toolCall.args)}`;

                    // Nếu tool + args đã gọi trước đó, trả lại kết quả cũ kèm thông báo
                    if (calledToolKeys.has(cacheKey)) {
                        const cachedContent = toolResultCache.get(cacheKey) ?? `Tool ${toolCall.name} already called with same args. Use the result above to answer.`;
                        console.log(`Tool ${toolCall.name} already called — returning cached result`);
                        return new ToolMessage({
                            content: cachedContent,
                            tool_call_id: toolCall.id
                        });
                    }

                    calledToolKeys.add(cacheKey);
                    console.log(`Executing tool: ${toolCall.name} with args:`, toolCall.args);

                    // Tìm tool tương ứng
                    const tool = this.tools.find(t => t.name === toolCall.name);

                    if (!tool) {
                        console.error(`Tool not found: ${toolCall.name}`);
                        const errMsg = `Error: Tool ${toolCall.name} not found`;
                        toolResultCache.set(cacheKey, errMsg);
                        return new ToolMessage({
                            content: errMsg,
                            tool_call_id: toolCall.id
                        });
                    }

                    // Execute tool
                    try {
                        const result = await tool.invoke(toolCall.args);
                        const resultString = typeof result === 'string'
                            ? result
                            : JSON.stringify(result);

                        console.log(`Tool ${toolCall.name} result:`, resultString.substring(0, 200));
                        toolResultCache.set(cacheKey, resultString);

                        return new ToolMessage({
                            content: resultString,
                            tool_call_id: toolCall.id
                        });
                    } catch (error) {
                        console.error(`Tool ${toolCall.name} error:`, error.message);
                        const errMsg = `Error executing ${toolCall.name}: ${error.message}`;
                        toolResultCache.set(cacheKey, errMsg);
                        return new ToolMessage({
                            content: errMsg,
                            tool_call_id: toolCall.id
                        });
                    }
                })
            );

            // Add tool messages vào history
            allMessages.push(...toolMessages);

            // Gọi lại CHAIN ĐÃ CHỌN (toolChain) với tool results.
            // Với streaming mode, lần gọi này có thể trả token ngay khi LLM sinh nội dung.
            if (onToken) {
                response = await this.streamChainResponse({
                    chain,
                    input: {
                        question,
                        chat_history: allMessages,
                        context
                    },
                    onToken
                });
            } else {
                response = await chain.invoke({
                    question,
                    chat_history: allMessages,
                    context
                });
            }

            console.log(`After tool execution - iteration ${iterations}:`, {
                hasToolCalls: !!response.tool_calls,
                toolCallsCount: response.tool_calls?.length || 0,
                hasContent: !!response.content
            });
        }

        if (iterations >= maxIterations) {
            console.warn('Max iterations reached in tool execution loop');
        }

        // Nếu response cuối vẫn còn tool_calls (loop hết vòng hoặc tất cả tool đã cache),
        // phải thêm ToolMessage cho mỗi tool_call đó trước khi invoke lần cuối.
        // Không làm điều này sẽ gây INVALID_TOOL_RESULTS vì OpenAI yêu cầu:
        // assistant(tool_calls) → tool_message(s) → assistant(text)
        if (response.tool_calls && response.tool_calls.length > 0) {
            console.log('Finalizing: executing remaining tool_calls before last invoke');
            allMessages.push(response);

            const finalToolMessages = await Promise.all(
                response.tool_calls.map(async (toolCall) => {
                    const cacheKey = `${toolCall.name}:${JSON.stringify(toolCall.args)}`;
                    const cached = toolResultCache.get(cacheKey);
                    const content = cached ?? `Tool ${toolCall.name} already called. Use the data already provided to answer.`;
                    return new ToolMessage({ content, tool_call_id: toolCall.id });
                })
            );

            allMessages.push(...finalToolMessages);

            if (onToken) {
                response = await this.streamChainResponse({
                    chain,
                    input: { question, chat_history: allMessages, context },
                    onToken
                });
            } else {
                response = await chain.invoke({ question, chat_history: allMessages, context });
            }
        }

        console.log(`Tool execution loop completed after ${iterations} iterations`);

        return response;
    }
}

export default new AiService();