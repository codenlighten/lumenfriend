/**
 * Standardized Error Response
 * 
 * Universal error schema following the missingContext + reasoning pattern.
 * Allows agents and orchestrators to handle errors programmatically.
 * 
 * Errors are first-class responses that can be:
 * - Logged and tracked
 * - Used for automatic retry logic
 * - Escalated with context to users
 * - Analyzed for system improvements
 */
export const errorResponseSchema = {
  type: "object",
  properties: {
    errorCode: {
      type: "string",
      description: "Machine-readable error code (e.g., 'INVALID_INPUT', 'SCHEMA_VALIDATION_FAILED', 'TOOL_UNAVAILABLE', 'RATE_LIMIT_EXCEEDED')"
    },
    errorMessage: {
      type: "string",
      description: "Human-readable explanation of what went wrong"
    },
    errorDetails: {
      type: "string",
      description: "Additional technical details about the error (stack trace, validation errors, etc.)"
    },
    recoverable: {
      type: "boolean",
      description: "Whether this error can potentially be recovered from with different input or context"
    },
    suggestedAction: {
      type: "string",
      description: "Recommended action to resolve the error (e.g., 'Provide more context', 'Retry after 60 seconds', 'Contact support')"
    },
    affectedAgent: {
      type: "string",
      description: "Name of the agent that encountered the error (if in a multi-agent workflow)"
    },
    missingContext: {
      type: "array",
      items: { type: "string" },
      description: "Specific information that would help prevent or resolve this error"
    },
    reasoning: {
      type: "string",
      description: "Explanation of why this error occurred and what conditions led to it"
    }
  },
  required: [
    "errorCode",
    "errorMessage",
    "recoverable",
    "missingContext",
    "reasoning"
  ],
  additionalProperties: false
};

export default errorResponseSchema;

/**
 * Common Error Codes:
 * 
 * Input/Validation:
 * - INVALID_INPUT - Malformed or invalid request data
 * - SCHEMA_VALIDATION_FAILED - Response failed JSON schema validation
 * - MISSING_REQUIRED_FIELD - Required field not provided
 * 
 * Resource/Rate Limiting:
 * - RATE_LIMIT_EXCEEDED - Too many requests
 * - QUOTA_EXCEEDED - Usage quota reached
 * - INSUFFICIENT_CREDITS - Not enough API credits
 * 
 * Agent/Tool Errors:
 * - AGENT_UNAVAILABLE - Requested agent not found
 * - TOOL_FAILURE - Tool/agent execution failed
 * - TIMEOUT - Request exceeded time limit
 * 
 * Authentication/Authorization:
 * - INVALID_API_KEY - API key invalid or missing
 * - UNAUTHORIZED - Not authorized for this endpoint
 * - FORBIDDEN - Insufficient permissions
 * 
 * System/Infrastructure:
 * - INTERNAL_ERROR - Unexpected server error
 * - SERVICE_UNAVAILABLE - Temporary service outage
 * - DEPENDENCY_FAILURE - External service failed
 */

/**
 * Example usage:
 * 
 * try {
 *   const result = await queryOpenAI(query, { schema: codeGeneratorSchema });
 *   return wrapInEnvelope({ agentName: 'code-generator', data: result });
 * } catch (error) {
 *   const errorResponse = {
 *     errorCode: 'SCHEMA_VALIDATION_FAILED',
 *     errorMessage: 'Agent output did not match expected schema',
 *     errorDetails: error.message,
 *     recoverable: true,
 *     suggestedAction: 'Simplify query or provide more specific requirements',
 *     affectedAgent: 'code-generator',
 *     missingContext: ['Specific programming language', 'Target framework version'],
 *     reasoning: 'The query was too ambiguous for strict schema validation'
 *   };
 *   
 *   return wrapInEnvelope({
 *     agentName: 'code-generator',
 *     data: errorResponse,
 *     isError: true
 *   });
 * }
 */
