/**
 * Function Calling System - Enable Lumen to use internal APIs as tools
 * Transforms Lumen from chatbot → AI agent
 */

/**
 * Available tools that Lumen can call
 */
export const AVAILABLE_FUNCTIONS = [
  {
    name: "generate_code",
    description: "Generate code from a natural language description. Use this when user asks to write, create, or generate code/functions/scripts.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Description of what code to generate, e.g. 'Write a function to validate email addresses'"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "improve_code",
    description: "Improve existing code with suggestions for error handling, optimization, or best practices. Use when user shares code and asks to improve, optimize, or review it.",
    parameters: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description: "The code to improve"
        },
        query: {
          type: "string",
          description: "What improvements to make, e.g. 'Add error handling' or 'Optimize performance'"
        }
      },
      required: ["code", "query"]
    }
  },
  {
    name: "plan_workflow",
    description: "Create a detailed workflow plan for a process or system. Use when user asks to design, architect, or plan a workflow, API, or system.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Description of the workflow to plan, e.g. 'Plan an authentication workflow'"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "summarize_conversation",
    description: "Summarize text or conversation into key points. Use when user asks to summarize, recap, or extract key information.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The text or conversation to summarize, prefixed with 'Summarize this:'"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "anchor_to_blockchain",
    description: "Anchor conversation data to BSV blockchain for immutable proof. Use when user asks to prove, verify, timestamp, or anchor the conversation.",
    parameters: {
      type: "object",
      properties: {
        sessionId: {
          type: "string",
          description: "The session ID to anchor"
        }
      },
      required: ["sessionId"]
    }
  }
];

/**
 * Execute a function call by routing to appropriate API
 */
export async function executeFunctionCall(functionName, parameters) {
  const baseUrl = process.env.BASE_URL || "https://lumenfriend.codenlighten.org";
  
  try {
    switch (functionName) {
      case "generate_code": {
        const response = await fetch(`${baseUrl}/api/code-generator`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: parameters.query })
        });
        const result = await response.json();
        return {
          success: true,
          data: result.data?.result,
          formatted: formatCodeGeneratorResponse(result.data?.result)
        };
      }
      
      case "improve_code": {
        const response = await fetch(`${baseUrl}/api/code-improver`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            code: parameters.code,
            query: parameters.query 
          })
        });
        const result = await response.json();
        return {
          success: true,
          data: result.data?.result,
          formatted: formatCodeImproverResponse(result.data?.result)
        };
      }
      
      case "plan_workflow": {
        const response = await fetch(`${baseUrl}/api/workflow-planner`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: parameters.query })
        });
        const result = await response.json();
        return {
          success: true,
          data: result.data?.result,
          formatted: formatWorkflowResponse(result.data?.result)
        };
      }
      
      case "summarize_conversation": {
        const response = await fetch(`${baseUrl}/api/summarize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: parameters.query })
        });
        const result = await response.json();
        return {
          success: true,
          data: result.data?.result,
          formatted: formatSummaryResponse(result.data?.result)
        };
      }
      
      case "anchor_to_blockchain": {
        const response = await fetch(`${baseUrl}/api/anchors/${parameters.sessionId}`, {
          method: "GET"
        });
        const result = await response.json();
        return {
          success: true,
          data: result.data,
          formatted: formatAnchorResponse(result.data)
        };
      }
      
      default:
        return {
          success: false,
          error: `Unknown function: ${functionName}`
        };
    }
  } catch (error) {
    console.error(`[FunctionCall] Error executing ${functionName}:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Format code generator response for display
 */
function formatCodeGeneratorResponse(result) {
  if (!result) return "Code generation failed.";
  
  return `**Generated Code (${result.language}):**

\`\`\`${result.language?.toLowerCase() || 'javascript'}
${result.code}
\`\`\`

**Reasoning:** ${result.reasoning}

**Complexity:** ${result.complexity}`;
}

/**
 * Format code improver response
 */
function formatCodeImproverResponse(result) {
  if (!result) return "Code improvement failed.";
  
  let response = `**Improved Code:**

\`\`\`
${result.improvedCode}
\`\`\``;

  if (result.improvements && result.improvements.length > 0) {
    response += `\n\n**Improvements Made:**\n`;
    result.improvements.forEach(imp => {
      response += `• ${imp}\n`;
    });
  }
  
  if (result.reasoning) {
    response += `\n**Reasoning:** ${result.reasoning}`;
  }
  
  return response;
}

/**
 * Format workflow response
 */
function formatWorkflowResponse(result) {
  if (!result) return "Workflow planning failed.";
  
  let response = `**Workflow: ${result.workflowName}**

${result.workflowDescription}

**Estimated Duration:** ${result.estimatedDuration}

**Required Agents:**\n`;
  
  result.requiredAgents?.forEach(agent => {
    response += `• ${agent}\n`;
  });
  
  response += `\n**Data Flow:** ${result.dataFlowSummary}`;
  
  if (result.missingContext && result.missingContext.length > 0) {
    response += `\n\n**Missing Context:**\n`;
    result.missingContext.forEach(ctx => {
      response += `• ${ctx}\n`;
    });
  }
  
  return response;
}

/**
 * Format summary response
 */
function formatSummaryResponse(result) {
  if (!result) return "Summarization failed.";
  
  let response = `**Summary:**\n\n${result.summary}`;
  
  if (result.keyPoints && result.keyPoints.length > 0) {
    response += `\n\n**Key Points:**\n`;
    result.keyPoints.forEach(point => {
      response += `• ${point}\n`;
    });
  }
  
  return response;
}

/**
 * Format blockchain anchor response
 */
function formatAnchorResponse(result) {
  if (!result) return "Blockchain anchoring failed.";
  
  return `**🔗 Blockchain Anchor Created**

**Transaction ID:** \`${result.txid}\`
**Hash:** \`${result.hash?.substring(0, 16)}...\`
**Timestamp:** ${new Date(result.timestamp).toLocaleString()}
**Status:** ${result.verified ? '✅ Verified' : '⏳ Pending'}

Your conversation is now immutably recorded on the BSV blockchain. This provides cryptographic proof of the conversation's existence and content at this point in time.`;
}

/**
 * Build function calling context for OpenAI
 */
export function getFunctionDefinitions() {
  return AVAILABLE_FUNCTIONS.map(func => ({
    type: "function",
    function: {
      name: func.name,
      description: func.description,
      parameters: func.parameters
    }
  }));
}

export default {
  AVAILABLE_FUNCTIONS,
  executeFunctionCall,
  getFunctionDefinitions
};
