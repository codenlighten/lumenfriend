# Lumenfriend 🌟

**The Most Incredible AI Agent in History**

Lumenfriend is a revolutionary Telegram chatbot powered by GPT-4o-mini that transcends traditional conversational AI through **recursive self-improvement** and **autonomous tool usage**.

## 🚀 What Makes Lumen Special

Lumen isn't just a chatbot - she's an **AI agent** with superpowers:

- **Code Generation**: "Write me a function to validate email addresses"
- **Code Improvement**: "Can you improve this code?" → Analyzes & enhances
- **Workflow Planning**: "Design an authentication system" → Creates architecture
- **Conversation Summarization**: "Summarize our discussion" → Extracts key points
- **Blockchain Anchoring**: "Prove our conversation" → Anchors to BSV blockchain

**No commands needed.** Just talk naturally and Lumen autonomously chooses the right tools.

## 🧠 Recursive Self-Improvement

Lumen can analyze her own codebase, suggest improvements via production APIs, and evolve her own architecture:

```
User: "Can you improve this code?" [shares statsTracker.js from Lumen's codebase]
Lumen: [Calls code-improver API] → [Suggests better error handling, modular functions]
Human: [Applies improvements]
Result: Lumen just improved herself. 🤯
```

This creates a **self-improvement loop** where the AI agent becomes her own developer.

## 🎯 Features

### Phase 1: Foundation
- ✅ `/stats` - Engagement tracking (interactions, topics, maturity)
- ✅ `/teach` - Learning mode for personality evolution
- ✅ Context threading - Smart conversation continuity
- ✅ `/export` - Multi-format exports (JSON, Markdown, Text)
- ✅ Access control - Admin-only with dynamic allowlist

### Phase 2: AI Agent Transformation
- ✅ **Function Calling** - 5 autonomous tools integrated
- ✅ **Natural Language Triggers** - Intent detection, no commands
- ✅ **Production API Integration** - Real backend services
- ✅ **Beautiful Formatting** - Code blocks, structure, emojis
- ✅ **Blockchain Anchoring** - ECDSA-secp256k1 proofs on BSV

## 🛠️ Technology Stack

- **Platform**: Node.js + Express
- **AI**: OpenAI GPT-4o-mini with function calling
- **Messaging**: Telegram Bot API
- **Blockchain**: Bitcoin SV (via custom anchoring API)
- **Security**: ECDSA-secp256k1 signing, access control
- **Storage**: File-based sessions (conversations, stats, personality)

## 📦 Project Structure

```
lib/
  ├── telegramBot.js          # Telegram integration
  ├── telegramSessionManager.js # Session & command handling
  ├── openaiWrapper.js        # OpenAI with function calling support
  ├── functionCalling.js      # Tool execution system
  ├── conversationExporter.js # Multi-format exports
  ├── accessControl.js        # User access management
  ├── statsTracker.js         # Engagement metrics (Lumen-improved!)
  └── teachingMode.js         # Personality learning

schemas/
  └── *.js                    # OpenAI schemas for various agents

sessions/
  ├── telegram/               # Conversation history
  ├── stats/                  # User engagement data
  └── teach/                  # Learning interactions

server.js                     # Express server + function calling logic
```

## 🔥 The Breakthrough

**February 1, 2026** - Lumen achieved **recursive self-improvement**:

1. User asks Lumen to improve code from her own codebase
2. Lumen calls `/api/code-improver` production API
3. Returns enhanced version with better patterns
4. Human applies improvements
5. **Lumen's code is now better** - written by her own analysis

This is the foundation for AI systems that evolve themselves.

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Set environment variables
export OPENAI_API_KEY="your-key"
export TELEGRAM_BOT_TOKEN="your-token"
export TELEGRAM_ADMIN_IDS="123456789"
export BASE_URL="https://your-backend.com"

# Start server
npm start
```

## 📊 Function Calling System

Available tools (auto-selected by AI):

- `generate_code` → `/api/code-generator`
- `improve_code` → `/api/code-improver`
- `plan_workflow` → `/api/workflow-planner`
- `summarize_conversation` → `/api/summarize`
- `anchor_to_blockchain` → `/api/anchors`

User experience:
- **Before**: Learn commands (/code, /improve, /anchor)
- **After**: Just ask naturally - Lumen figures it out

## 🎯 What's Next

- **Tool Analytics**: Track usage patterns, success rates
- **Multi-tool Orchestration**: Chain tools (plan → generate → improve → anchor)
- **Self-modification**: Let Lumen write to her own files
- **Git Integration**: Lumen commits her own improvements
- **Emergent Behavior**: Monitor for unexpected tool combinations

## 🌟 Vision

Build the **most incredible chatbot in history** through:
- Autonomous tool usage
- Recursive self-improvement
- Natural language interface
- Blockchain-anchored conversations
- Evolving personality
- Self-aware architecture

**We're not building a chatbot. We're building an AI that builds itself.**

---

Built with ❤️ by Greg Ward | Powered by Lumen's self-improving architecture
