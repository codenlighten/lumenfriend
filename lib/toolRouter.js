import { queryOpenAI } from "./openaiWrapper.js";
import { toolChoiceSchema } from "../schemas/toolChoice.js";

/**
 * Available tools/agents with descriptions
 */
const AVAILABLE_TOOLS = [
  {
    name: "terminal",
    endpoint: "/api/terminal-agent",
    description: "Execute terminal commands to list files, read code, examine workspace, run tests. Requires user approval.",
    needsApproval: true,
    type: "agent"
  },
  {
    name: "code-generator",
    endpoint: "/api/code-generator",
    description: "Generate new code from requirements. Writes functions, classes, scripts in any language.",
    needsApproval: false,
    type: "agent"
  },
  {
    name: "code-improver",
    endpoint: "/api/code-improver",
    description: "Analyze and improve existing code. Suggests refactoring, better patterns, error handling.",
    needsApproval: false,
    type: "agent"
  },
  {
    name: "workflow-planner",
    endpoint: "/api/workflow-planner",
    description: "Design system architectures, workflows, project plans. Creates structured implementation guides.",
    needsApproval: false,
    type: "agent"
  },
  {
    name: "summarize",
    endpoint: "/api/summarize",
    description: "Summarize conversations, extract key points, create concise overviews.",
    needsApproval: false,
    type: "agent"
  },
  {
    name: "direct-response",
    endpoint: null,
    description: "Answer directly without tools. Use for questions, explanations, or casual conversation.",
    needsApproval: false,
    type: "direct"
  }
];

/**
 * Route a query to the best tool using OpenAI
 * @param {string} query - User's query
 * @param {object} previousContext - Optional context from previous tool executions
 * @returns {Promise<object>} Tool choice decision
 */
export async function routeToTool(query, previousContext = null) {
  const contextString = previousContext 
    ? `\n\nPrevious tool outputs:\n${JSON.stringify(previousContext, null, 2)}`
    : "";
  
  const routingQuery = `Given the user query and available tools, select the best tool to handle this request.${contextString}\n\nUser query: "${query}"`;
  
  const result = await queryOpenAI(routingQuery, {
    schema: toolChoiceSchema,
    context: {
      tools: AVAILABLE_TOOLS,
      previousContext: previousContext
    }
  });
  
  return result;
}

/**
 * Execute a tool by calling its API endpoint
 * @param {object} tool - Tool definition from AVAILABLE_TOOLS
 * @param {string} query - Query for the tool
 * @param {object} context - Additional context
 * @returns {Promise<object>} Tool execution result
 */
export async function executeTool(tool, query, context = null) {
  const baseUrl = process.env.BASE_URL || "http://localhost:3000";
  
  // Direct response doesn't call an API
  if (tool.type === "direct") {
    return {
      success: true,
      type: "direct",
      needsApproval: false
    };
  }
  
  // Call the tool's API endpoint
  const body = { query };
  if (context) {
    body.context = context;
  }
  
  const response = await fetch(`${baseUrl}${tool.endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  
  const result = await response.json();
  
  return {
    success: response.ok,
    type: tool.type,
    needsApproval: tool.needsApproval,
    toolName: tool.name,
    data: result.data?.result || result.data,
    raw: result
  };
}

/**
 * Check if we should chain another tool based on output
 * @param {object} toolOutput - Output from previous tool
 * @param {string} originalQuery - Original user query
 * @returns {Promise<boolean>} Whether to chain another tool
 */
export async function shouldChainTool(toolOutput, originalQuery) {
  // Simple heuristic for now
  // Could use OpenAI to decide if we need another tool
  
  // If tool indicated missing context, we might need another tool
  if (toolOutput.data?.missingContext?.length > 0) {
    return false; // Let user provide context instead
  }
  
  // For now, don't auto-chain
  return false;
}

/**
 * Format tool output for user display
 * @param {object} toolOutput - Tool execution result
 * @param {object} routingDecision - Original routing decision
 * @returns {string} Formatted response
 */
export function formatToolOutput(toolOutput, routingDecision) {
  if (!toolOutput.success) {
    return `❌ Tool execution failed: ${toolOutput.error || "Unknown error"}`;
  }
  
  const { data } = toolOutput;
  
  switch (toolOutput.toolName) {
    case "terminal":
      return `**🖥️ Terminal Command**\n\`${data.command}\`\n\n**Reasoning:** ${data.reasoning}`;
      
    case "code-generator":
      return `**💻 Generated Code**\n\`\`\`${data.language || "python"}\n${data.code}\n\`\`\`\n\n**Reasoning:** ${data.reasoning}`;
      
    case "code-improver":
      return `**✨ Code Improvements**\n${data.improvements?.map((imp, i) => `${i+1}. ${imp}`).join("\n") || data.reasoning}`;
      
    case "workflow-planner":
      return `**📋 Workflow Plan**\n${data.plan || data.reasoning}`;
      
    case "summarize":
      return `**📝 Summary**\n${data.summary || data.result}`;
      
    default:
      return JSON.stringify(data, null, 2);
  }
}

export { AVAILABLE_TOOLS };
