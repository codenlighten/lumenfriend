/**
 * Teaching Engine - User-directed learning for Lumen
 * Allows users to teach Lumen new concepts, corrections, and preferences
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const TEACH_DIR = "sessions/teach";

/**
 * Load teaching history for a user
 */
export async function loadTeachingHistory(userId) {
  const teachPath = resolve(TEACH_DIR, `${userId}.json`);

  try {
    const data = await readFile(teachPath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    // No teaching history exists, return fresh structure
    return {
      userId,
      createdAt: new Date().toISOString(),
      events: [],
      lastUpdated: null
    };
  }
}

/**
 * Save teaching history for a user
 */
export async function saveTeachingHistory(userId, history) {
  const teachPath = resolve(TEACH_DIR, `${userId}.json`);

  try {
    // Ensure directory exists
    await mkdir(TEACH_DIR, { recursive: true });
    history.lastUpdated = new Date().toISOString();
    await writeFile(teachPath, JSON.stringify(history, null, 2), "utf-8");
  } catch (error) {
    console.error(`Error saving teaching history for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Record a teaching event
 */
export async function recordTeachingEvent(userId, input, feedback, context = "general", outcome = "pending") {
  const history = await loadTeachingHistory(userId);

  const event = {
    timestamp: new Date().toISOString(),
    input,
    feedback,
    context,
    outcome
  };

  history.events.push(event);

  // Keep last 100 teaching events to prevent unbounded growth
  if (history.events.length > 100) {
    history.events = history.events.slice(-100);
  }

  await saveTeachingHistory(userId, history);
  return event;
}

/**
 * Get teaching summary for a user
 */
export function formatTeachingSummary(history) {
  const totalEvents = history.events.length;
  
  if (totalEvents === 0) {
    return {
      totalEvents: 0,
      recentEvents: [],
      contexts: [],
      summary: "No teaching events yet"
    };
  }

  // Get unique contexts
  const contexts = [...new Set(history.events.map(e => e.context))];

  // Get last 5 events
  const recentEvents = history.events.slice(-5).reverse();

  // Count outcomes
  const outcomes = history.events.reduce((acc, event) => {
    acc[event.outcome] = (acc[event.outcome] || 0) + 1;
    return acc;
  }, {});

  return {
    totalEvents,
    recentEvents,
    contexts,
    outcomes,
    createdAt: history.createdAt,
    lastUpdated: history.lastUpdated
  };
}

/**
 * Get teaching context for injecting into Lumen's prompt
 * Returns recent teaching events that should influence responses
 */
export function getTeachingContext(history, limit = 10) {
  if (!history || history.events.length === 0) {
    return null;
  }

  const recentEvents = history.events.slice(-limit);
  
  return {
    teachingActive: true,
    totalLessons: history.events.length,
    recentLessons: recentEvents.map(e => ({
      context: e.context,
      input: e.input,
      outcome: e.outcome,
      timestamp: e.timestamp
    }))
  };
}

/**
 * Analyze teaching effectiveness
 */
export function analyzeTeachingEffectiveness(history) {
  if (!history || history.events.length === 0) {
    return { level: "beginner", score: 0, description: "No teaching sessions yet" };
  }

  const totalEvents = history.events.length;
  const successfulEvents = history.events.filter(e => e.outcome === "correct" || e.outcome === "understood").length;
  const successRate = totalEvents > 0 ? (successfulEvents / totalEvents) * 100 : 0;

  let level, description;
  
  if (totalEvents < 5) {
    level = "novice";
    description = "Just getting started with teaching";
  } else if (totalEvents < 15) {
    level = "learning";
    description = "Building teaching experience";
  } else if (totalEvents < 30) {
    level = "active";
    description = "Regular teaching sessions";
  } else if (totalEvents < 50) {
    level = "experienced";
    description = "Experienced teacher";
  } else {
    level = "master";
    description = "Master teacher with deep impact";
  }

  return {
    level,
    score: Math.round(successRate),
    totalLessons: totalEvents,
    successfulLessons: successfulEvents,
    description
  };
}

export default {
  loadTeachingHistory,
  saveTeachingHistory,
  recordTeachingEvent,
  formatTeachingSummary,
  getTeachingContext,
  analyzeTeachingEffectiveness
};
