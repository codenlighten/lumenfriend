/**
 * Standardized Response Envelope
 * 
 * Universal wrapper for all Schema.icu agent responses.
 * Provides versioning, agent identification, cryptographic verification,
 * and consistent structure across the entire platform.
 * 
 * Every endpoint should return this envelope with agent-specific data inside.
 */
export const responseEnvelopeSchema = {
  type: "object",
  properties: {
    version: {
      type: "string",
      enum: ["schema-icu-v1"],
      description: "Envelope format version for backward compatibility"
    },
    agentName: {
      type: "string",
      description: "Name of the agent that produced this response (e.g., 'base', 'code-generator', 'summarize')"
    },
    agentVersion: {
      type: "string",
      description: "Semantic version of the agent (e.g., '1.0.0', '2.1.3')"
    },
    requestId: {
      type: "string",
      description: "Unique identifier for this request (for tracking and correlation)"
    },
    timestamp: {
      type: "string",
      description: "ISO 8601 timestamp when the response was generated"
    },
    data: {
      type: "object",
      description: "Agent-specific response payload following that agent's schema (e.g., summarizeAgent, codeGenerator, etc.)",
      additionalProperties: true  // This is the one place we allow it - different agents have different schemas
    },
    signature: {
      type: "string",
      description: "Cryptographic signature of the response (BSV ECDSA or ML-DSA-87)"
    },
    publicKey: {
      type: "string",
      description: "Public key corresponding to the signature for verification"
    },
    signatureAlgorithm: {
      type: "string",
      enum: ["BSV-ECDSA", "ML-DSA-87"],
      description: "Algorithm used for signature (for multi-algorithm support)"
    },
    meta: {
      type: "object",
      properties: {
        model: {
          type: "string",
          description: "AI model used (e.g., 'gpt-5-nano', 'gpt-4o-mini')"
        },
        tokensUsed: {
          type: "integer",
          description: "Total tokens consumed by this request"
        },
        latencyMs: {
          type: "integer",
          description: "Total response time in milliseconds"
        },
        cost: {
          type: "number",
          description: "Estimated cost in USD for this request"
        }
      },
      additionalProperties: false,
      description: "Optional metadata for observability and optimization"
    }
  },
  required: [
    "version",
    "agentName",
    "agentVersion",
    "requestId",
    "timestamp",
    "data",
    "signature",
    "publicKey",
    "signatureAlgorithm"
  ],
  additionalProperties: false
};

export default responseEnvelopeSchema;

/**
 * Example usage in server.js:
 * 
 * import { wrapInEnvelope } from './lib/envelopeWrapper.js';
 * 
 * const agentResponse = await queryOpenAI(query, { schema: summarizeAgentSchema });
 * 
 * const envelope = wrapInEnvelope({
 *   agentName: 'summarize',
 *   agentVersion: '1.0.0',
 *   data: agentResponse,
 *   meta: {
 *     model: 'gpt-5-nano',
 *     tokensUsed: 1234,
 *     latencyMs: 567
 *   }
 * });
 * 
 * res.json(envelope);
 */
