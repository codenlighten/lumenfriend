import { readFile, writeFile } from "node:fs/promises";
import { access } from "node:fs/promises";
import { queryOpenAI } from "./openaiWrapper.js";
import { summarizeAgentResponseSchema } from "../schemas/summarizeAgent.js";
import { evolvePersonality, consolidateLongTermMemory } from "./personalityEvolver.js";

const DEFAULT_INTERACTIONS_LIMIT = 21;
const DEFAULT_SUMMARIES_LIMIT = 3;
const SUMMARIES_CONSOLIDATION_THRESHOLD = 5; // Trigger consolidation after 5 summaries

function nowIso() {
  return new Date().toISOString();
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function normalizeSession(session) {
  return {
    interactions: Array.isArray(session.interactions) ? session.interactions : [],
    summaries: Array.isArray(session.summaries) ? session.summaries : [],
    nextId: Number.isInteger(session.nextId) ? session.nextId : 1,
    personality: session.personality ?? null,
    personalityEvolutionEnabled:
      typeof session.personalityEvolutionEnabled === "boolean"
        ? session.personalityEvolutionEnabled
        : true,
    personalityImmutable:
      typeof session.personalityImmutable === "boolean"
        ? session.personalityImmutable
        : false
  };
}

export async function loadSession(sessionPath) {
  if (!(await fileExists(sessionPath))) {
    return normalizeSession({});
  }

  const raw = await readFile(sessionPath, "utf-8");
  const parsed = JSON.parse(raw);
  return normalizeSession(parsed);
}

export async function saveSession(sessionPath, session) {
  const payload = JSON.stringify(session, null, 2);
  await writeFile(sessionPath, payload, "utf-8");
}

function buildSummaryPrompt(interactions) {
  const text = interactions
    .map((item) => `${item.role.toUpperCase()}: ${item.text}`)
    .join("\n");

  return `Summarize the following chat interactions in 3-5 sentences, focusing on goals, decisions, facts, names, and evolving state.\n\n${text}`;
}

async function summarizeInteractions(interactions) {
  const prompt = buildSummaryPrompt(interactions);
  const result = await queryOpenAI(prompt, {
    schema: summarizeAgentResponseSchema
  });
  return result.summary;
}

export async function addInteraction(session, interaction, options = {}) {
  const {
    interactionsLimit = DEFAULT_INTERACTIONS_LIMIT,
    summariesLimit = DEFAULT_SUMMARIES_LIMIT
  } = options;

  const enriched = {
    id: session.nextId,
    ...interaction,
    ts: interaction.ts || nowIso()
  };

  session.nextId += 1;
  session.interactions.push(enriched);

  while (session.interactions.length > interactionsLimit) {
    const interactionsToSummarize = session.interactions.slice(0, interactionsLimit);
    const summaryText = await summarizeInteractions(interactionsToSummarize);
    const summary = {
      range: {
        startId: interactionsToSummarize[0]?.id ?? null,
        endId: interactionsToSummarize[interactionsToSummarize.length - 1]?.id ?? null
      },
      text: summaryText,
      ts: nowIso()
    };

    session.summaries.push(summary);
    
    // PHASE 1: Consolidation - Convert summaries to long-term pillars
    if (session.summaries.length >= SUMMARIES_CONSOLIDATION_THRESHOLD && session.personality) {
      console.log(`[MemoryEngine] Threshold reached (${SUMMARIES_CONSOLIDATION_THRESHOLD} summaries). Running Consolidation...`);
      
      const evolvedPersonality = await consolidateLongTermMemory(
        session.personality,
        session.summaries
      );
      
      session.personality = evolvedPersonality;
      
      // HYBRID MEMORY: Keep last 2 summaries for recent context
      const recentSummaries = session.summaries.slice(-2);
      session.summaries = recentSummaries;
      
      console.log(`[MemoryEngine] Consolidation complete. Kept ${recentSummaries.length} recent summaries.`);
    } else if (session.summaries.length > summariesLimit) {
      session.summaries.shift();
    }

    // Evolve personality at summarization point
    if (
      session.personality &&
      session.personalityEvolutionEnabled !== false &&
      session.personalityImmutable !== true
    ) {
      const evolution = await evolvePersonality(
        session.personality,
        interactionsToSummarize,
        session.summaries
      );
      if (evolution.personality) {
        session.personality = evolution.personality;
        console.log(`[PersonalityEvolution] ${evolution.explanation}`);
      }
    }

    session.interactions.shift();
  }

  return session;
}

export function buildContext(session) {
  const summariesNewestFirst = [...session.summaries].reverse();
  
  // Format long-term pillars for injection into context
  const personality = session.personality ?? null;
  const longTermMemory = personality?.pillars?.length > 0
    ? personality.pillars
        .sort((a, b) => b.importance - a.importance) // Sort by importance
        .map(p => `[${p.category} (Importance: ${p.importance}/10)]: ${p.details}`)
        .join(\"\\n\")
    : \"No long-term pillars established yet.\";
  
  return {
    personality: personality,
    longTermMemory: longTermMemory, // NEW: Inject pillars for AI context
    summaries: summariesNewestFirst,
    interactions: session.interactions,
    personalityEvolutionEnabled: session.personalityEvolutionEnabled,
    personalityImmutable: session.personalityImmutable
  };
}
