import OpenAI from 'openai';
import dotenv from 'dotenv';
import { baseAgentResponseSchema } from '../schemas/baseAgent.js';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Wrapper for OpenAI Chat Completions with JSON schema response format
 * @param {string} query - The user query/prompt
 * @param {object} options - Optional configuration
 * @param {object} options.context - Additional context object to include in the prompt
 * @param {object} options.schema - JSON schema for structured output (defaults to baseAgentResponseSchema)
 * @param {string} options.model - Model to use (defaults to OPENAI_DEFAULT_MODEL from .env)
 * @param {number} options.temperature - Temperature setting (defaults to OPENAI_DEFAULT_TEMPERATURE from .env)
 * @returns {Promise<object>} Parsed JSON response matching the schema
 */
export async function queryOpenAI(query, options = {}) {
  const {
    context = null,
    schema = baseAgentResponseSchema,
    model = process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o-mini',
    temperature = parseFloat(process.env.OPENAI_DEFAULT_TEMPERATURE) || 1.0,
  } = options;

  // Build the prompt with optional context
  let promptContent = query;
  if (context) {
    promptContent = `Context: ${JSON.stringify(context, null, 2)}\n\nQuery: ${query}`;
  }

  try {
    const completion = await openai.chat.completions.create({
      model,
      temperature,
      messages: [
        {
          role: "user",
          content: promptContent
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "agent_response",
          strict: true,
          schema
        }
      }
    });

    // Parse and return the JSON response
    const responseContent = completion.choices[0].message.content;
    return JSON.parse(responseContent);
  } catch (error) {
    console.error('OpenAI API Error:', error.message);
    throw error;
  }
}

/**
 * Simple wrapper for OpenAI with json_object mode (no strict schema)
 * @param {string} query - The user query/prompt (should mention JSON in the prompt)
 * @param {object} options - Optional configuration
 * @param {object} options.context - Additional context object to include in the prompt
 * @param {string} options.model - Model to use (defaults to OPENAI_DEFAULT_MODEL from .env)
 * @param {number} options.temperature - Temperature setting (defaults to OPENAI_DEFAULT_TEMPERATURE from .env)
 * @returns {Promise<object>} Parsed JSON response
 */
export async function queryOpenAIJsonMode(query, options = {}) {
  const {
    context = null,
    model = process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o-mini',
    temperature = parseFloat(process.env.OPENAI_DEFAULT_TEMPERATURE) || 1.0,
  } = options;

  // Build the prompt with optional context
  let promptContent = query;
  if (context) {
    promptContent = `Context: ${JSON.stringify(context, null, 2)}\n\nQuery: ${query}`;
  }

  try {
    const completion = await openai.chat.completions.create({
      model,
      temperature,
      messages: [
        {
          role: "user",
          content: promptContent
        }
      ],
      response_format: { type: "json_object" }
    });

    // Parse and return the JSON response
    const responseContent = completion.choices[0].message.content;
    return JSON.parse(responseContent);
  } catch (error) {
    console.error('OpenAI API Error:', error.message);
    throw error;
  }
}

/**
 * Query OpenAI with function calling support
 * Enables AI to use tools/functions
 * @param {Array} messages - Array of message objects with role and content
 * @param {Array} functions - Array of function definitions
 * @param {object} options - Optional configuration
 * @returns {Promise<object>} Response with potential function calls
 */
export async function queryOpenAIWithFunctions(messages, functions = [], options = {}) {
  const {
    model = process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o-mini',
    temperature = parseFloat(process.env.OPENAI_DEFAULT_TEMPERATURE) || 0.7,
  } = options;

  try {
    const requestParams = {
      model,
      temperature,
      messages
    };

    // Add tools (functions) if provided
    if (functions && functions.length > 0) {
      requestParams.tools = functions;
      requestParams.tool_choice = "auto"; // Let model decide when to use functions
    }

    const completion = await openai.chat.completions.create(requestParams);

    const choice = completion.choices[0];
    const message = choice.message;

    // Check if model wants to call a function
    if (message.tool_calls && message.tool_calls.length > 0) {
      return {
        type: "function_call",
        functionCalls: message.tool_calls.map(tc => ({
          id: tc.id,
          name: tc.function.name,
          arguments: JSON.parse(tc.function.arguments)
        })),
        message: message
      };
    }

    // Regular text response
    return {
      type: "text",
      content: message.content,
      message: message
    };
  } catch (error) {
    console.error('[OpenAI] Function calling error:', error.message);
    throw error;
  }
}

export default { queryOpenAI, queryOpenAIJsonMode, queryOpenAIWithFunctions };