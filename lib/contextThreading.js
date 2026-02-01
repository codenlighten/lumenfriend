/**
 * Context Threading - Smart conversation continuity detection
 * Detects when users want to continue previous topics and injects context
 */

/**
 * Continuity keywords that indicate user wants to continue previous topic
 */
const CONTINUITY_PATTERNS = {
  // Direct continuation
  continuation: [
    /tell me more/i,
    /go on/i,
    /continue/i,
    /keep going/i,
    /what else/i,
    /and\?$/i  // "and?" at end of message
  ],
  
  // Depth requests
  deeper: [
    /go deeper/i,
    /more detail/i,
    /elaborate/i,
    /explain that/i,
    /explain more/i,
    /dive deeper/i,
    /dig into/i
  ],
  
  // Clarification
  clarification: [
    /what do you mean/i,
    /clarify/i,
    /explain$/i,  // Just "explain"
    /how so/i,
    /what's that/i,
    /can you explain/i
  ],
  
  // Follow-up questions
  followup: [
    /^what about/i,
    /^how about/i,
    /^why/i,
    /^when/i,
    /^where/i,
    /^how/i
  ],
  
  // Examples/specifics
  examples: [
    /give.*example/i,
    /show.*example/i,
    /for example/i,
    /like what/i,
    /such as/i
  ]
};

/**
 * Detect if message indicates continuation of previous context
 * Returns the type of continuation or null
 */
export function detectContinuity(message) {
  if (!message || message.length < 2) {
    return null;
  }

  // Check each pattern category
  for (const [type, patterns] of Object.entries(CONTINUITY_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(message)) {
        return {
          type,
          confidence: calculateConfidence(message, pattern),
          message
        };
      }
    }
  }

  return null;
}

/**
 * Calculate confidence score (0-1) for continuity detection
 */
function calculateConfidence(message, pattern) {
  const messageLength = message.trim().length;
  
  // Very short messages with continuity keywords are highly confident
  if (messageLength < 20) {
    return 0.95;
  }
  
  // Short messages (< 50 chars) with keywords are confident
  if (messageLength < 50) {
    return 0.85;
  }
  
  // Longer messages are less confident (might be tangential)
  return 0.70;
}

/**
 * Extract relevant previous context for injection
 * Returns last N interactions that should inform the response
 */
export function extractPreviousContext(interactions, limit = 3) {
  if (!interactions || interactions.length === 0) {
    return null;
  }

  // Get last N interactions (excluding current)
  const recentInteractions = interactions.slice(-limit);
  
  return {
    previousMessages: recentInteractions.map(int => ({
      role: int.role,
      text: int.text.substring(0, 500), // Limit to 500 chars per message
      timestamp: int.timestamp
    })),
    contextLength: recentInteractions.length
  };
}

/**
 * Build context injection prompt for OpenAI
 * Combines previous conversation with teaching history
 */
export function buildContextPrompt(continuityDetection, previousContext, teachingContext = null) {
  if (!continuityDetection || !previousContext) {
    return null;
  }

  let prompt = `\n\n[Context: User is continuing the previous topic`;
  
  // Add continuity type
  const typeDescriptions = {
    continuation: "wants you to continue",
    deeper: "wants more depth/detail",
    clarification: "needs clarification",
    followup: "asking follow-up question",
    examples: "wants examples"
  };
  
  if (typeDescriptions[continuityDetection.type]) {
    prompt += ` - ${typeDescriptions[continuityDetection.type]}`;
  }
  
  prompt += `]\n\n[Recent conversation:]\n`;
  
  // Add previous messages
  for (const msg of previousContext.previousMessages) {
    const roleLabel = msg.role === "user" ? "User" : "You";
    prompt += `${roleLabel}: ${msg.text}\n`;
  }
  
  // Add teaching context if available
  if (teachingContext && teachingContext.recentLessons && teachingContext.recentLessons.length > 0) {
    prompt += `\n[User has taught you ${teachingContext.totalLessons} lessons. Recent lessons:]\n`;
    
    for (const lesson of teachingContext.recentLessons.slice(0, 3)) {
      prompt += `- ${lesson.context}: ${lesson.input.substring(0, 100)}\n`;
    }
  }
  
  prompt += `\n[Now respond to: "${continuityDetection.message}"]`;
  
  return prompt;
}

/**
 * Analyze conversation flow to detect topic shifts
 */
export function analyzeConversationFlow(interactions) {
  if (!interactions || interactions.length < 3) {
    return {
      topicShift: false,
      confidence: 0,
      suggestion: "insufficient_history"
    };
  }

  // Get last 5 interactions
  const recent = interactions.slice(-5);
  
  // Count unique keywords/topics
  const keywords = new Set();
  for (const int of recent) {
    const words = int.text.toLowerCase().split(/\s+/);
    words.forEach(w => {
      if (w.length > 4) keywords.add(w); // Only significant words
    });
  }

  const uniqueKeywordRatio = keywords.size / (recent.length * 10); // Rough estimate
  
  return {
    topicShift: uniqueKeywordRatio > 0.5, // High keyword diversity = topic shift
    confidence: Math.min(uniqueKeywordRatio, 1.0),
    suggestion: uniqueKeywordRatio > 0.5 ? "new_topic" : "continuing_topic",
    recentInteractions: recent.length
  };
}

/**
 * Format context for logging/debugging
 */
export function formatContextDebug(continuityDetection, previousContext, teachingContext) {
  return {
    detected: !!continuityDetection,
    type: continuityDetection?.type || null,
    confidence: continuityDetection?.confidence || 0,
    previousMessages: previousContext?.contextLength || 0,
    teachingLessons: teachingContext?.totalLessons || 0,
    timestamp: new Date().toISOString()
  };
}

export default {
  detectContinuity,
  extractPreviousContext,
  buildContextPrompt,
  analyzeConversationFlow,
  formatContextDebug
};
