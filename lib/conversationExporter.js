/**
 * Conversation Exporter - Export chat history in multiple formats
 * Supports JSON, Markdown, and text formats
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

/**
 * Export conversation in requested format
 */
export async function exportConversation(userId, format = "markdown", options = {}) {
  const {
    includeStats = true,
    includeTeaching = true,
    includePersonality = false,
    maxInteractions = 100
  } = options;

  // Load session data
  const session = await loadSessionData(userId);
  
  // Load stats if requested
  let stats = null;
  if (includeStats) {
    try {
      const statsData = await readFile(resolve("sessions/stats", `${userId}.json`), "utf-8");
      stats = JSON.parse(statsData);
    } catch (error) {
      console.log(`No stats found for user ${userId}`);
    }
  }

  // Load teaching history if requested
  let teaching = null;
  if (includeTeaching) {
    try {
      const teachingData = await readFile(resolve("sessions/teach", `${userId}.json`), "utf-8");
      teaching = JSON.parse(teachingData);
    } catch (error) {
      console.log(`No teaching history found for user ${userId}`);
    }
  }

  // Format based on requested type
  switch (format.toLowerCase()) {
    case "json":
      return exportAsJSON(session, stats, teaching, maxInteractions);
    case "markdown":
    case "md":
      return exportAsMarkdown(session, stats, teaching, maxInteractions);
    case "text":
    case "txt":
      return exportAsText(session, stats, teaching, maxInteractions);
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

/**
 * Load session data for user
 */
async function loadSessionData(userId) {
  try {
    const sessionData = await readFile(resolve("sessions/telegram", `${userId}.json`), "utf-8");
    return JSON.parse(sessionData);
  } catch (error) {
    throw new Error(`Session not found for user ${userId}`);
  }
}

/**
 * Export as JSON
 */
function exportAsJSON(session, stats, teaching, maxInteractions) {
  const interactions = session.interactions.slice(-maxInteractions);
  
  const exportData = {
    exportedAt: new Date().toISOString(),
    format: "json",
    version: "1.0",
    session: {
      userId: session.userId,
      createdAt: session.createdAt,
      interactions: interactions.map(int => ({
        role: int.role,
        text: int.text,
        timestamp: int.timestamp
      })),
      interactionCount: session.interactions.length,
      summaries: session.summaries || []
    }
  };

  if (stats) {
    exportData.stats = {
      totalInteractions: stats.interactions,
      engagementScore: stats.engagementScore,
      personalityMaturityLevel: stats.personalityMaturityLevel,
      topTopics: Object.entries(stats.topicCounts || {})
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([topic, count]) => ({ topic, count })),
      createdAt: stats.createdAt,
      lastInteraction: stats.lastInteraction
    };
  }

  if (teaching) {
    exportData.teaching = {
      totalLessons: teaching.events.length,
      lessons: teaching.events.map(event => ({
        timestamp: event.timestamp,
        input: event.input,
        context: event.context,
        outcome: event.outcome
      })),
      createdAt: teaching.createdAt,
      lastUpdated: teaching.lastUpdated
    };
  }

  return JSON.stringify(exportData, null, 2);
}

/**
 * Export as Markdown
 */
function exportAsMarkdown(session, stats, teaching, maxInteractions) {
  const interactions = session.interactions.slice(-maxInteractions);
  let markdown = `# Lumen Conversation Export\n\n`;
  markdown += `**Exported:** ${new Date().toLocaleString()}\n`;
  markdown += `**User ID:** ${session.userId}\n`;
  markdown += `**Session Started:** ${new Date(session.createdAt).toLocaleString()}\n\n`;

  markdown += `---\n\n`;

  // Stats section
  if (stats) {
    markdown += `## 📊 Engagement Statistics\n\n`;
    markdown += `- **Total Interactions:** ${stats.interactions}\n`;
    markdown += `- **Engagement Score:** ${stats.engagementScore}/100\n`;
    markdown += `- **Personality Maturity:** Level ${stats.personalityMaturityLevel}\n`;
    
    const topTopics = Object.entries(stats.topicCounts || {})
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
    
    if (topTopics.length > 0) {
      markdown += `- **Top Topics:**\n`;
      topTopics.forEach(([topic, count]) => {
        markdown += `  - ${topic} (${count})\n`;
      });
    }
    markdown += `\n`;
  }

  // Teaching section
  if (teaching && teaching.events.length > 0) {
    markdown += `## 🎓 Teaching History\n\n`;
    markdown += `- **Total Lessons:** ${teaching.events.length}\n`;
    markdown += `- **Started:** ${new Date(teaching.createdAt).toLocaleString()}\n\n`;
    
    markdown += `### Recent Lessons\n\n`;
    teaching.events.slice(-10).reverse().forEach((event, idx) => {
      markdown += `${idx + 1}. **${event.context}** (${new Date(event.timestamp).toLocaleDateString()})\n`;
      markdown += `   - Input: ${event.input.substring(0, 100)}${event.input.length > 100 ? "..." : ""}\n`;
      markdown += `   - Outcome: ${event.outcome}\n\n`;
    });
  }

  // Conversation history
  markdown += `## 💬 Conversation History\n\n`;
  markdown += `Showing last ${Math.min(maxInteractions, interactions.length)} of ${session.interactions.length} interactions\n\n`;
  markdown += `---\n\n`;

  interactions.forEach((int, idx) => {
    const date = new Date(int.timestamp).toLocaleString();
    const role = int.role === "user" ? "👤 You" : "🤖 Lumen";
    
    markdown += `### ${role} • ${date}\n\n`;
    markdown += `${int.text}\n\n`;
    markdown += `---\n\n`;
  });

  // Summaries section
  if (session.summaries && session.summaries.length > 0) {
    markdown += `## 📝 Conversation Summaries\n\n`;
    session.summaries.forEach((summary, idx) => {
      markdown += `### Summary ${idx + 1}\n\n`;
      markdown += `${summary}\n\n`;
      markdown += `---\n\n`;
    });
  }

  markdown += `\n*Exported from Lumen - SmartLedger Technology*\n`;
  
  return markdown;
}

/**
 * Export as plain text
 */
function exportAsText(session, stats, teaching, maxInteractions) {
  const interactions = session.interactions.slice(-maxInteractions);
  let text = `LUMEN CONVERSATION EXPORT\n`;
  text += `${"=".repeat(60)}\n\n`;
  text += `Exported: ${new Date().toLocaleString()}\n`;
  text += `User ID: ${session.userId}\n`;
  text += `Session Started: ${new Date(session.createdAt).toLocaleString()}\n\n`;

  // Stats
  if (stats) {
    text += `ENGAGEMENT STATISTICS\n`;
    text += `${"-".repeat(60)}\n`;
    text += `Total Interactions: ${stats.interactions}\n`;
    text += `Engagement Score: ${stats.engagementScore}/100\n`;
    text += `Personality Maturity: Level ${stats.personalityMaturityLevel}\n\n`;
  }

  // Teaching
  if (teaching && teaching.events.length > 0) {
    text += `TEACHING HISTORY\n`;
    text += `${"-".repeat(60)}\n`;
    text += `Total Lessons: ${teaching.events.length}\n`;
    text += `Recent: ${teaching.events.slice(-3).map(e => e.context).join(", ")}\n\n`;
  }

  // Conversation
  text += `CONVERSATION HISTORY\n`;
  text += `${"-".repeat(60)}\n`;
  text += `Showing last ${Math.min(maxInteractions, interactions.length)} of ${session.interactions.length} interactions\n\n`;

  interactions.forEach((int) => {
    const date = new Date(int.timestamp).toLocaleString();
    const role = int.role === "user" ? "YOU" : "LUMEN";
    
    text += `[${date}] ${role}:\n`;
    text += `${int.text}\n\n`;
  });

  text += `${"=".repeat(60)}\n`;
  text += `Exported from Lumen - SmartLedger Technology\n`;
  
  return text;
}

/**
 * Get export summary (metadata only)
 */
export async function getExportSummary(userId) {
  try {
    const session = await loadSessionData(userId);
    
    // Check for stats
    let statsExists = false;
    let statsCount = 0;
    try {
      const statsData = await readFile(resolve("sessions/stats", `${userId}.json`), "utf-8");
      const stats = JSON.parse(statsData);
      statsExists = true;
      statsCount = stats.interactions;
    } catch (error) {
      // No stats
    }

    // Check for teaching
    let teachingExists = false;
    let teachingCount = 0;
    try {
      const teachingData = await readFile(resolve("sessions/teach", `${userId}.json`), "utf-8");
      const teaching = JSON.parse(teachingData);
      teachingExists = true;
      teachingCount = teaching.events.length;
    } catch (error) {
      // No teaching
    }

    return {
      userId,
      totalInteractions: session.interactions.length,
      summaries: session.summaries?.length || 0,
      hasStats: statsExists,
      statsInteractions: statsCount,
      hasTeaching: teachingExists,
      teachingLessons: teachingCount,
      createdAt: session.createdAt
    };
  } catch (error) {
    throw new Error(`Could not load export summary for user ${userId}`);
  }
}

export default {
  exportConversation,
  getExportSummary
};
