/**
 * Stats Tracker - Track user engagement metrics
 * Monitors interactions, topics, response times, personality maturity
 */

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const STATS_DIR = "sessions/stats";

/**
 * Load stats for a user
 */
export async function loadUserStats(userId) {
  const statsPath = resolve(STATS_DIR, `${userId}.json`);

  try {
    const data = await readFile(statsPath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    // Stats don't exist, return fresh stats
    return {
      userId,
      createdAt: new Date().toISOString(),
      interactions: 0,
      totalResponseTime: 0,
      topics: [],
      topicCounts: {},
      sessionCount: 0,
      lastInteraction: null,
      personalityMaturityLevel: 1,
      engagementScore: 0
    };
  }
}

/**
 * Save stats for a user
 */
export async function saveUserStats(userId, stats) {
  const statsPath = resolve(STATS_DIR, `${userId}.json`);

  try {
    // Ensure directory exists
    await import("node:fs/promises").then(fs => fs.mkdir(STATS_DIR, { recursive: true }));
    await writeFile(statsPath, JSON.stringify(stats, null, 2), "utf-8");
  } catch (error) {
    console.error(`Error saving stats for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Record an interaction
 */
export async function recordInteraction(userId, stats, userMessage, responseMessage, responseTime = 0, detectedTopics = []) {
  // Update basic stats
  stats.interactions += 1;
  stats.totalResponseTime += responseTime;
  stats.lastInteraction = new Date().toISOString();

  // Simple topic detection from message content
  const topics = [];
  const keywords = {
    'code': ['code', 'javascript', 'python', 'api', 'function', 'class', 'const', 'let'],
    'architecture': ['architecture', 'design', 'pattern', 'flow', 'workflow', 'system'],
    'help': ['help', 'guide', 'explain', 'how to', 'what is', 'why'],
    'review': ['review', 'check', 'feedback', 'critique', 'improve']
  };

  const messageLower = (userMessage + ' ' + responseMessage).toLowerCase();
  for (const [topic, words] of Object.entries(keywords)) {
    if (words.some(word => messageLower.includes(word))) {
      topics.push(topic);
    }
  }

  // Track topics
  for (const topic of [...new Set([...topics, ...detectedTopics])]) {
    stats.topicCounts[topic] = (stats.topicCounts[topic] || 0) + 1;
    if (!stats.topics.includes(topic)) {
      stats.topics.push(topic);
    }
  }

  // Calculate personality maturity (increases with interactions)
  stats.personalityMaturityLevel = Math.floor(stats.interactions / 10) + 1;

  // Calculate engagement score (0-100)
  stats.engagementScore = Math.min(100, Math.floor((stats.interactions / 50) * 100));

  // Auto-increment session count periodically
  if (stats.interactions % 20 === 0) {
    stats.sessionCount += 1;
  }

  await saveUserStats(userId, stats);
  return stats;
}

/**
 * Get formatted stats for display
 */
export function formatStats(stats, session) {
  const avgResponseTime = stats.interactions > 0 
    ? (stats.totalResponseTime / stats.interactions).toFixed(1)
    : 0;

  const topTopics = Object.entries(stats.topicCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([topic]) => topic);

  const memorySummaries = session?.summaries?.length || 0;
  const totalInteractions = session?.interactions?.length || 0;
  const memoryPercentage = Math.floor((memorySummaries / 30) * 100);

  return {
    interactions: stats.interactions,
    avgResponseTime,
    topTopics,
    memorySummaries,
    totalInteractions,
    memoryPercentage,
    personalityMaturityLevel: stats.personalityMaturityLevel,
    engagementScore: stats.engagementScore,
    sessionCount: stats.sessionCount,
    createdAt: stats.createdAt,
    lastInteraction: stats.lastInteraction
  };
}

/**
 * Get engagement level description
 */
export function getEngagementLevel(score) {
  if (score < 20) return "🟤 Beginner";
  if (score < 40) return "🟢 Learning";
  if (score < 60) return "🔵 Active";
  if (score < 80) return "🟣 Engaged";
  return "🔴 Highly Engaged";
}

/**
 * Get personality maturity description
 */
export function getPersonalityDescription(level) {
  const descriptions = [
    "Just getting to know myself",
    "Starting to develop my voice",
    "Growing personality traits",
    "Well-defined personality",
    "Highly evolved personality",
    "Deeply personalized guide"
  ];
  return descriptions[Math.min(level - 1, descriptions.length - 1)] || "Legendary Lumen";
}

export default {
  loadUserStats,
  saveUserStats,
  recordInteraction,
  formatStats,
  getEngagementLevel,
  getPersonalityDescription
};
