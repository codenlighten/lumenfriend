/**
 * Random Agent Schema Generator
 * 
 * Purpose: Given a query and optional context, generate a new, relevant agent specification.
 * This is a meta-agent that creates other agent schemas dynamically based on user needs.
 * 
 * Use Cases:
 * - Discover new agent capabilities based on user queries
 * - Prototype specialized agents for specific domains
 * - Extend the platform with AI-suggested agent designs
 * - Generate context-aware agent specifications on-demand
 * 
 * Input: Query describing need/domain, optional context with requirements
 * Output: Complete agent specification with schema as JSON string
 */
export const randomAgentSchema = {
  type: "object",
  properties: {
    agentName: {
      type: "string",
      description: "The name of the newly suggested agent (e.g., 'ResearchAgent', 'RefactorAgent')"
    },
    agentDescription: {
      type: "string",
      description: "A concise description of what this new agent does and when it should be used, tailored to the input query and context"
    },
    agentSchemaAsString: {
      type: "string",
      description: "The JSON schema for this new agent's response payload, serialized as a JSON string. This should be a valid JSON Schema object when parsed"
    },
    missingContext: {
      type: "array",
      items: { type: "string" },
      description: "List of missing information that would improve or refine the generated agent schema. Empty array if the design is confident"
    },
    reasoning: {
      type: "string",
      description: "Explanation of how and why this particular agent schema was generated, including relevance to the query/context and any trade-offs"
    }
  },
  required: [
    "agentName",
    "agentDescription",
    "agentSchemaAsString",
    "missingContext",
    "reasoning"
  ],
  additionalProperties: false
};

export default randomAgentSchema;
