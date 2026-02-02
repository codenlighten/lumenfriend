export const baseAgentResponseSchema = {
    type: "object",
    properties: {
      response: { type: "string" },
      includesCode: { type: "boolean" },
      code: { type: "string" },
      terminalCommand: {
        type: "string",
        description: "Terminal command to execute (leave empty if not applicable)"
      },
      continue: { 
        type: "boolean", 
        description: "Whether this agent has more work to do and should be called again automatically" 
      },
      questionsForUser: { 
        type: "boolean", 
        description: "Whether this agent has a follow-up question for the user" 
      },
      questions: { 
        type: "array", 
        description: "The follow-up question(s) for the user (only if questionsForUser is true)",
        items: { type: "string" }
      },
      missingContext: {
        type: "array",
        description: "List of strings indicating what information is missing for an ideal response",
        items: { type: "string" }
      }
    },
    required: ["response", "includesCode", "code", "terminalCommand", "continue", "questionsForUser", "questions", "missingContext"],
    additionalProperties: false
  };