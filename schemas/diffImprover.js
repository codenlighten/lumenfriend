//provide improvedCode without breaking changes, diff, explanation, suggestions
export const diffImproverResponseSchema = {
    type: "object",
    properties: {
      improvedCode: { 
        type: "string",
        description: "The improved version of the provided code with enhancements and optimizations"
      },
      diff: {
        type: "string",
        description: "A unified diff format string showing changes made to the original code"
      },
      explanation: {
        type: "string",
        description: "A detailed explanation of the improvements made to the code"
      },
      suggestions: {
        type: "array",
        items: { type: "string" },
        description: "List of additional suggestions for further improvements or considerations"
      }
    },
    required: ["improvedCode", "diff", "explanation", "suggestions"],
    additionalProperties: false
};