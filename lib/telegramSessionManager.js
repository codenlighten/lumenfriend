/**
 * Telegram Session Manager
 * Maps Telegram user IDs to Lumen sessions with file-backed memory
 * Similar structure to memoryStore but keyed by Telegram user ID
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const TELEGRAM_SESSIONS_DIR = "sessions/telegram";

/**
 * Ensure the sessions directory exists
 */
async function ensureSessionsDir() {
  try {
    await mkdir(TELEGRAM_SESSIONS_DIR, { recursive: true });
  } catch (error) {
    console.error(`Error creating sessions directory ${TELEGRAM_SESSIONS_DIR}:`, error);
    throw error;
  }
}

/**
 * Load a Telegram user's session from disk
 */
export async function loadTelegramSession(userId) {
  const sessionPath = resolve(TELEGRAM_SESSIONS_DIR, `${userId}.json`);

  try {
    const data = await readFile(sessionPath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    // Session doesn't exist, return new empty session
    return {
      userId,
      createdAt: new Date().toISOString(),
      interactions: [],
      summaries: [],
      personality: null,
      personalityVersion: null,
      memoryEnabled: true
    };
  }
}

/**
 * Save a Telegram user's session to disk
 */
export async function saveTelegramSession(userId, session) {
  const sessionPath = resolve(TELEGRAM_SESSIONS_DIR, `${userId}.json`);

  try {
    // Ensure directory exists before writing
    await ensureSessionsDir();
    await writeFile(sessionPath, JSON.stringify(session, null, 2), "utf-8");
  } catch (error) {
    console.error(`Error saving Telegram session ${userId}:`, error);
    throw error;
  }
}

/**
 * Add interaction to Telegram session
 */
export async function addTelegramInteraction(userId, session, interaction) {
  const nextId = (session.interactions.length > 0)
    ? Math.max(...session.interactions.map(i => i.id)) + 1
    : 1;

  const newInteraction = {
    id: nextId,
    role: interaction.role,
    text: interaction.text,
    timestamp: new Date().toISOString()
  };

  session.interactions.push(newInteraction);
  await saveTelegramSession(userId, session);

  return newInteraction;
}

/**
 * Build context for Lumen from Telegram session
 */
export function buildTelegramContext(session) {
  return {
    sessionId: `telegram:${session.userId}`,
    userId: session.userId,
    platform: "telegram",
    memoryEnabled: session.memoryEnabled,
    interactions: session.interactions || [],
    summaries: session.summaries || [],
    personality: session.personality,
    createdAt: session.createdAt
  };
}

/**
 * Handle /start command
 * Returns both message text and optional inline buttons
 */
export async function handleStartCommand(userId) {
  const session = await loadTelegramSession(userId);
  session.memoryEnabled = true;
  await saveTelegramSession(userId, session);

  const message = `👋 <b>Welcome to Lumen</b>

I'm your SmartLedger Technology guide. I'm here to help you with:

🔹 Code generation & improvement
🔹 Workflow planning & architecture
🔹 Project guidance & best practices
🔹 SmartLedger methodologies

<b>Commands:</b>
/start - Show this welcome message
/reset - Clear conversation history
/memory - Toggle memory on/off (currently: ON)
/help - Show all commands

Let's build something great! 🚀`;

  const buttons = [
    [
      { text: '💡 Ask a Question', callback_data: 'quick_question' },
      { text: '📖 View Examples', callback_data: 'show_examples' }
    ],
    [
      { text: '👤 Who Am I', callback_data: 'show_whoami' },
      { text: '⚙️ Toggle Memory', callback_data: 'toggle_memory' }
    ],
    [
      { text: '❓ Help', callback_data: 'show_help' }
    ]
  ];

  return { message, buttons };
}

/**
 * Handle /reset command
 */
export async function handleResetCommand(userId) {
  const session = {
    userId,
    createdAt: new Date().toISOString(),
    interactions: [],
    summaries: [],
    personality: null,
    personalityVersion: null,
    memoryEnabled: true
  };

  await saveTelegramSession(userId, session);

  return `🔄 Session reset!

Your conversation history has been cleared. We're starting fresh.

What can I help you with today?`;
}

/**
 * Handle /memory command
 */
export async function handleMemoryCommand(userId) {
  const session = await loadTelegramSession(userId);
  session.memoryEnabled = !session.memoryEnabled;
  await saveTelegramSession(userId, session);

  const status = session.memoryEnabled ? "enabled" : "disabled";
  const emoji = session.memoryEnabled ? "✅" : "❌";
  const desc = session.memoryEnabled 
    ? "I'll remember our conversation history and use it for context."
    : "I'll respond to each message independently without memory of previous conversations.";

  return `${emoji} Memory ${status}!

${desc}`;
}

/**
 * Handle /help command
 */
export async function handleHelpCommand(userId = null) {
  let helpText = `<b>📖 Lumen Command Guide</b>

<b>Available commands:</b>

/start - Show welcome message with features
/help - Show this help message
/whoami - Show my personality profile and evolution
/stats - Show your engagement statistics
/teach - Enter teaching mode to train me
/export - Export your conversation history
/reset - Clear all conversation history
/memory - Toggle memory on/off`;

  // Add admin commands if user is admin
  if (userId) {
    const { isAdmin } = await import("./accessControl.js");
    if (isAdmin(userId)) {
      helpText += `

<b>🔧 Admin Commands:</b>
/admin - Access control management`;
    }
  }

  return helpText;
}

/**
 * Handle /stats command
 * Show user engagement statistics
 */
export async function handleStatsCommand(userId, session, stats) {
  const topTopics = Object.entries(stats.topicCounts || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([topic]) => topic);

  const avgResponseTime = stats.interactions > 0
    ? (stats.totalResponseTime / stats.interactions).toFixed(1)
    : 0;

  const memorySummaries = session?.summaries?.length || 0;
  const memoryPercentage = Math.floor((memorySummaries / 30) * 100);

  const engagementLevel = getEngagementLevel(stats.engagementScore);

  const topicsStr = topTopics.length > 0 
    ? topTopics.map(t => `  • ${t}`).join("\n")
    : "  (No topics yet)";

  return `<b>📊 Your Lumen Statistics</b>

<b>Engagement Metrics:</b>
💬 Interactions: ${stats.interactions}
⏱️  Avg Response: ${avgResponseTime}s
🎯 Your Engagement: ${engagementLevel}
🔥 Engagement Score: ${stats.engagementScore}/100

<b>Memory & Learning:</b>
💾 Summaries Stored: ${memorySummaries}/30 (${memoryPercentage}%)
🧠 Personality Maturity: Level ${stats.personalityMaturityLevel}
📈 Sessions: ${stats.sessionCount}

<b>Topics Discussed:</b>
${topicsStr}

<b>Your Journey:</b>
Started: ${new Date(stats.createdAt).toLocaleDateString()}
Last interaction: ${stats.lastInteraction ? new Date(stats.lastInteraction).toLocaleTimeString() : 'Never'}

${stats.interactions < 10 ? '🌱 You\'re just getting started! Keep chatting to level up.' : ''}
${stats.interactions >= 10 && stats.interactions < 30 ? '📈 Great progress! You\'re building a rich conversation history.' : ''}
${stats.interactions >= 30 ? '⭐ You\'re a power user! Your conversations are shaping my personality.' : ''}`;
}

/**
 * Get engagement level with emoji
 */
function getEngagementLevel(score) {
  if (score < 20) return "🟤 Beginner";
  if (score < 40) return "🟢 Learning";
  if (score < 60) return "🔵 Active";
  if (score < 80) return "🟣 Engaged";
  return "🔴 Highly Engaged";
}

/**
 * Handle /teach command
 * Show teaching statistics and enter teaching mode
 */
export async function handleTeachCommand(userId) {
  // Import teaching engine
  const { loadTeachingHistory, formatTeachingSummary, analyzeTeachingEffectiveness } = await import("./teachingEngine.js");
  
  const history = await loadTeachingHistory(userId);
  const summary = formatTeachingSummary(history);
  const effectiveness = analyzeTeachingEffectiveness(history);

  if (summary.totalEvents === 0) {
    return `<b>🎓 Teaching Mode</b>

<b>Welcome to Teaching Mode!</b>

You haven't taught me anything yet. Here's how it works:

<b>How to teach me:</b>
1️⃣ Have a normal conversation
2️⃣ When I make a mistake or you want to teach me something, just tell me
3️⃣ I'll learn from your corrections and feedback
4️⃣ Use /teach anytime to see what I've learned

<b>What you can teach me:</b>
• Correct my mistakes
• Share your preferences
• Teach me new concepts
• Guide my responses
• Share domain knowledge

<b>Your Teaching Stats:</b>
📚 Lessons: ${summary.totalEvents}
🎯 Level: ${effectiveness.level}
⭐ Success Rate: ${effectiveness.score}%

💡 <i>Start chatting and correct me when needed!</i>`;
  }

  // Format recent events
  const recentEventsStr = summary.recentEvents.slice(0, 3).map((event, idx) => {
    const date = new Date(event.timestamp).toLocaleDateString();
    const contextEmoji = event.context === "code" ? "💻" : 
                        event.context === "preference" ? "⚙️" : 
                        event.context === "correction" ? "✏️" : "📝";
    return `  ${contextEmoji} ${date}: ${event.input.substring(0, 40)}${event.input.length > 40 ? "..." : ""}`;
  }).join("\n");

  const contextsStr = summary.contexts.length > 0 
    ? summary.contexts.slice(0, 5).map(c => `  • ${c}`).join("\n")
    : "  (No contexts yet)";

  return `<b>🎓 Your Teaching Impact</b>

<b>Teaching Effectiveness:</b>
🎯 Level: ${effectiveness.level.toUpperCase()}
⭐ Success Rate: ${effectiveness.score}%
📚 Total Lessons: ${effectiveness.totalLessons}
✅ Successful: ${effectiveness.successfulLessons}

<b>Teaching Categories:</b>
${contextsStr}

<b>Recent Lessons:</b>
${recentEventsStr}

<b>Status:</b>
${effectiveness.description}

💡 <i>Keep teaching me to help me improve!</i>

<b>Started:</b> ${new Date(history.createdAt).toLocaleDateString()}
<b>Last lesson:</b> ${history.lastUpdated ? new Date(history.lastUpdated).toLocaleTimeString() : "Never"}`;
}
export async function handleWhoAmICommand(userId) {
  const session = await loadTelegramSession(userId);
  
  const memoryStatus = session.memoryEnabled ? "🟢 Enabled" : "🔴 Disabled";
  const interactions = session.interactions.length;
  const summaries = session.summaries?.length || 0;
  
  let personalityInfo = "";
  if (session.personality) {
    personalityInfo = `
<b>Current Personality Profile:</b>
${session.personality.substring(0, 200)}${session.personality.length > 200 ? '...' : ''}`;
  } else {
    personalityInfo = `
<b>Current Personality:</b>
Building my identity through our conversations...`;
  }

  return `<b>👤 Who I Am - Lumen</b>

<b>Name:</b> Lumen
<b>Role:</b> SmartLedger Technology Guide
<b>Created By:</b> SmartLedger Team

<b>Session Stats:</b>
📊 Interactions: ${interactions}
📝 Summary Cycles: ${summaries}
💾 Memory: ${memoryStatus}

<b>My Purpose:</b>
I help with code generation, workflow planning, project guidance, and SmartLedger methodologies. I learn and evolve through our conversations.${personalityInfo}

<b>Capabilities:</b>
✅ Code generation & review
✅ Architecture & design patterns
✅ Workflow planning
✅ Best practices & guidance
✅ Personality evolution
✅ Conversation memory

💬 Want to tell me more about yourself?`;
}

/**
 * Handle /export command
 * Export conversation in various formats
 */
export async function handleExportCommand(userId, session, format = null) {
  const { exportConversation, getExportSummary } = await import("./conversationExporter.js");
  
  try {
    const summary = await getExportSummary(userId);
    
    // If no format specified, show options
    if (!format) {
      return `<b>📦 Conversation Export Ready</b>

<b>Your Data Summary:</b>
💬 Total Interactions: ${summary.totalInteractions}
📊 Stats Tracked: ${summary.hasStats ? `Yes (${summary.statsInteractions} logged)` : "No"}
🎓 Teaching Lessons: ${summary.hasTeaching ? `Yes (${summary.teachingLessons} lessons)` : "No"}
📝 Summaries: ${summary.summaries}
📅 Session Started: ${new Date(summary.createdAt).toLocaleDateString()}

<b>Export Formats Available:</b>
• <code>/export json</code> - Machine-readable JSON
• <code>/export markdown</code> - Rich formatted text
• <code>/export text</code> - Plain text format

<b>What's Included:</b>
✅ Full conversation history
✅ Your engagement statistics
✅ Teaching & learning history
✅ Personality development timeline
✅ All summaries and context

💾 Choose your format and I'll prepare the export!`;
    }

    // Valid formats
    const validFormats = ["json", "markdown", "md", "text", "txt"];
    if (!validFormats.includes(format.toLowerCase())) {
      return `<b>⚠️ Invalid Format</b>

"${format}" is not a valid export format.

Valid formats: json, markdown, text

Example: <code>/export markdown</code>`;
    }

    // Generate the export
    const exportData = await exportConversation(userId, format, {
      includeStats: true,
      includeTeaching: true,
      includePersonality: true,
      maxInteractions: 100
    });

    // Return export data with flag for file sending
    return {
      type: "export",
      format: format.toLowerCase(),
      data: exportData,
      filename: `lumen-export-${userId}-${Date.now()}.${format === "markdown" || format === "md" ? "md" : format === "json" ? "json" : "txt"}`
    };

  } catch (error) {
    return `<b>⚠️ Export Error</b>

Could not prepare export: ${error.message}

Make sure you have some conversation history first!`;
  }
}

/**
 * Handle /admin command (admin-only access control)
 */
export async function handleAdminCommand(userId, commandText) {
  const { isAdmin, addUser, removeUser, listAllowedUsers } = await import("./accessControl.js");
  
  // Only admins can use this command
  if (!isAdmin(userId)) {
    return `<b>⛔ Access Denied</b>

This command is restricted to administrators only.`;
  }
  
  const parts = commandText.split(" ");
  const action = parts[1]?.toLowerCase();
  
  if (!action) {
    return `<b>🔧 Admin Commands</b>

<b>Access Control:</b>
• <code>/admin allow [userId]</code> - Grant access
• <code>/admin remove [userId]</code> - Revoke access
• <code>/admin list</code> - Show all users

<b>Your Admin ID:</b> ${userId}

<b>Usage Example:</b>
<code>/admin allow 123456789</code>`;
  }
  
  switch (action) {
    case "allow":
    case "add": {
      const targetUserId = parseInt(parts[2], 10);
      if (!targetUserId || isNaN(targetUserId)) {
        return `<b>⚠️ Invalid User ID</b>

Usage: <code>/admin allow [userId]</code>

Example: <code>/admin allow 123456789</code>`;
      }
      
      const result = await addUser(targetUserId, userId);
      
      if (!result.success) {
        if (result.reason === "already_exists") {
          return `<b>ℹ️ User Already Has Access</b>

User ID ${targetUserId} is already in the allowlist.`;
        }
        return `<b>❌ Failed to Add User</b>

Could not add user ${targetUserId} to allowlist.`;
      }
      
      return `<b>✅ Access Granted</b>

User ID ${targetUserId} has been added to the allowlist.

Added by: ${userId}
Time: ${new Date().toLocaleString()}`;
    }
    
    case "remove":
    case "revoke": {
      const targetUserId = parseInt(parts[2], 10);
      if (!targetUserId || isNaN(targetUserId)) {
        return `<b>⚠️ Invalid User ID</b>

Usage: <code>/admin remove [userId]</code>

Example: <code>/admin remove 123456789</code>`;
      }
      
      const result = await removeUser(targetUserId);
      
      if (!result.success) {
        if (result.reason === "not_found") {
          return `<b>ℹ️ User Not Found</b>

User ID ${targetUserId} is not in the allowlist.`;
        }
        return `<b>❌ Failed to Remove User</b>

Could not remove user ${targetUserId} from allowlist.`;
      }
      
      return `<b>✅ Access Revoked</b>

User ID ${targetUserId} has been removed from the allowlist.

Removed by: ${userId}
Time: ${new Date().toLocaleString()}`;
    }
    
    case "list": {
      const allowed = await listAllowedUsers();
      
      let message = `<b>👥 Access Control List</b>

<b>Total Users:</b> ${allowed.total}

<b>Admins (${allowed.admins.length}):</b>
`;
      
      allowed.admins.forEach(admin => {
        message += `  🔑 ${admin.id} (system admin)\n`;
      });
      
      if (allowed.users.length > 0) {
        message += `\n<b>Allowed Users (${allowed.users.length}):</b>\n`;
        allowed.users.forEach(user => {
          const addedDate = new Date(user.addedAt).toLocaleDateString();
          message += `  👤 ${user.id}`;
          if (user.name) message += ` (${user.name})`;
          message += ` - added ${addedDate}\n`;
        });
      } else {
        message += `\n<b>Allowed Users:</b> None yet`;
      }
      
      return message;
    }
    
    default:
      return `<b>❌ Unknown Admin Command</b>

Available commands:
• <code>/admin allow [userId]</code>
• <code>/admin remove [userId]</code>
• <code>/admin list</code>

Type <code>/admin</code> for help.`;
  }
}

export default {
  loadTelegramSession,
  saveTelegramSession,
  addTelegramInteraction,
  buildTelegramContext,
  handleStartCommand,
  handleResetCommand,
  handleMemoryCommand,
  handleHelpCommand,
  handleWhoAmICommand,
  handleStatsCommand,
  handleTeachCommand,
  handleExportCommand,
  handleAdminCommand
};
