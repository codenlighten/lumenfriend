import { queryOpenAI } from "./openaiWrapper.js";
import { personalitySchema } from "../schemas/personalitySchema.js";

function nowIso() {
  return new Date().toISOString();
}

function incrementVersion(versionStr) {
  const parts = versionStr.split(".");
  const patch = parseInt(parts[2] || "0", 10);
  return `${parts[0]}.${parts[1] || "0"}.${patch + 1}`;
}

function buildEvolutionPrompt(previousPersonality, interactions, summaries, extras = {}) {
  const {
    additionalContext,
    history,
    iterationNotes,
    externalEvidence
  } = extras;

  const interactionText = interactions
    .map((item) => `${item.role.toUpperCase()}: ${item.text}`)
    .join("\n");

  const summaryText = summaries
    .map((s) => `[Summary ${s.range.startId}-${s.range.endId}]: ${s.text}`)
    .join("\n");

  const previousPersonalityJson = JSON.stringify(previousPersonality, null, 2);

  const supplementalSections = [];
  if (additionalContext) {
    supplementalSections.push(`## Additional Context\n${additionalContext}`);
  }

  if (history) {
    const historyBlock = Array.isArray(history)
      ? history.map((entry, idx) => `History ${idx + 1}: ${entry}`).join("\n")
      : typeof history === "object"
        ? JSON.stringify(history, null, 2)
        : String(history);
    supplementalSections.push(`## Historical Accounts\n${historyBlock}`);
  }

  if (iterationNotes) {
    const iterationBlock = Array.isArray(iterationNotes)
      ? iterationNotes
          .map((note, idx) => `Iteration ${idx + 1}: ${typeof note === "string" ? note : JSON.stringify(note)}`)
          .join("\n")
      : typeof iterationNotes === "object"
        ? JSON.stringify(iterationNotes, null, 2)
        : String(iterationNotes);
    supplementalSections.push(`## Iteration Notes\n${iterationBlock}`);
  }

  if (externalEvidence) {
    const evidenceBlock = Array.isArray(externalEvidence)
      ? externalEvidence.map((item) => `- ${item}`).join("\n")
      : typeof externalEvidence === "object"
        ? JSON.stringify(externalEvidence, null, 2)
        : String(externalEvidence);
    supplementalSections.push(`## External Evidence\n${evidenceBlock}`);
  }

  const supplementalText = supplementalSections.length > 0
    ? `\n${supplementalSections.join("\n\n")}`
    : "";

  return `You are analyzing a conversation history to understand how an AI personality is evolving.

## Previous Personality Profile
${previousPersonalityJson}

## Recent Summaries
${summaryText}

## Recent Interactions
${interactionText}

${supplementalText}

## Task
Based on the previous personality, the summaries, and the interactions, reflect on:
1. How is this personality evolving through these interactions?
2. What new values, constraints, or preferences are emerging?
3. How might the tone, style, or approach be shifting?
4. What patterns or growth are evident?

Provide:
1. An updated personality object that reflects this evolution (increment version, update mutable preferences with new timestamp, update audit.updatedAt, add changelog entry explaining evolution)
2. A brief explanation (2-3 sentences) of the evolution observed

Return valid JSON with the evolved personality object and explanation.`;
}

export async function evolvePersonality(previousPersonality, interactions, summaries, options = {}) {
  if (!previousPersonality) {
    return {
      personality: null,
      explanation: "No previous personality to evolve from.",
      evolvedAt: nowIso()
    };
  }

  try {
    const prompt = buildEvolutionPrompt(previousPersonality, interactions, summaries, options);

    // Create a schema for the evolution response
    const evolutionSchema = {
      type: "object",
      properties: {
        personality: personalitySchema,
        explanation: {
          type: "string",
          description: "Brief explanation of how the personality evolved"
        }
      },
      required: ["personality", "explanation"],
      additionalProperties: false
    };

    const result = await queryOpenAI(prompt, {
      schema: evolutionSchema
    });

    // Validate and enhance the evolved personality
    const evolved = result.personality;

    const previousVersion = previousPersonality.version || "1.0.0";
    if (!evolved.version || evolved.version === previousVersion) {
      evolved.version = incrementVersion(previousVersion);
    }

    if (!Array.isArray(evolved.mutable)) {
      evolved.mutable = Array.isArray(previousPersonality.mutable)
        ? [...previousPersonality.mutable]
        : [];
    }

    // Ensure audit trail is updated
    if (!evolved.audit) {
      evolved.audit = {
        createdAt: previousPersonality.audit?.createdAt || nowIso(),
        updatedAt: nowIso(),
        updatedBy: "personalityEvolver",
        changeLog: []
      };
    }

    evolved.audit.createdAt =
      evolved.audit.createdAt || previousPersonality.audit?.createdAt || nowIso();
    evolved.audit.updatedAt = nowIso();
    evolved.audit.updatedBy = "personalityEvolver";

    // Add changelog entry
    if (!Array.isArray(evolved.audit.changeLog)) {
      evolved.audit.changeLog = [];
    }
    evolved.audit.changeLog.push({
      change: `Personality evolved at summarization point: ${result.explanation}`,
      timestamp: nowIso()
    });

    // Keep only last 10 changelog entries to avoid bloat
    if (evolved.audit.changeLog.length > 10) {
      evolved.audit.changeLog = evolved.audit.changeLog.slice(-10);
    }

    return {
      personality: evolved,
      explanation: result.explanation,
      evolvedAt: nowIso()
    };
  } catch (error) {
    console.error("Error evolving personality:", error.message);
    return {
      personality: previousPersonality,
      explanation: `Evolution attempt failed: ${error.message}`,
      evolvedAt: nowIso(),
      error: true
    };
  }
}

/**
 * Get the "who am I" reflection - returns the evolution analysis
 * Can be used as a standalone endpoint or within summarization
 */
export async function whoAmI(session) {
  if (!session.personality) {
    return {
      reflection: "No personality established yet for this session.",
      timestamp: nowIso()
    };
  }

  const result = await evolvePersonality(
    session.personality,
    session.interactions,
    session.summaries
  );

  return {
    reflection: result.explanation,
    evolvedPersonality: result.personality,
    timestamp: result.evolvedAt,
    error: result.error || false
  };
}
