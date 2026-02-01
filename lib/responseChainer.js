/**
 * Response chaining logic for handling multi-turn continuations
 * Automatically follows up when model indicates continue: true
 * Max 10 iterations per request
 */

const MAX_CONTINUATIONS = 10;

export async function chainResponses(
  initialResponse,
  context,
  queryOpenAIFn
) {
  const responses = [];
  let currentResponse = initialResponse;
  let iterations = 1;
  let continuationHitLimit = false;

  // Add initial response
  responses.push({
    ...currentResponse,
    order: iterations
  });

  // Chain continuations if needed
  while (currentResponse.continue && iterations < MAX_CONTINUATIONS) {
    iterations++;

    // Prepare context for continuation
    // Include full response history so model understands the conversation flow
    const continuationContext = {
      ...context,
      priorResponses: responses.map(r => ({
        order: r.order,
        response: r.response,
        includesCode: r.includesCode
      })),
      continuationMessage: "Please continue your previous response."
    };

    // Query model again with continuation context
    const continuedResponse = await queryOpenAIFn(continuationContext);

    // Add to chain
    responses.push({
      ...continuedResponse,
      order: iterations
    });

    currentResponse = continuedResponse;
  }

  // Check if we hit the limit while still needing to continue
  if (currentResponse.continue && iterations >= MAX_CONTINUATIONS) {
    continuationHitLimit = true;
  }

  return {
    responses,
    continuationHitLimit,
    totalIterations: iterations
  };
}
