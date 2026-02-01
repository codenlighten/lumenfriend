# 🚀 Lumenfriend Production API - Complete Endpoint Catalog
**Base URL:** `https://lumenfriend.codenlighten.org`
**Tested:** February 1, 2026

## 📋 Table of Contents
1. [Code Generation](#code-generation)
2. [Workflow Planning](#workflow-planning)
3. [Summarization](#summarization)
4. [Chat & Conversation](#chat--conversation)
5. [Blockchain Anchoring](#blockchain-anchoring)
6. [Personality System](#personality-system)
7. [Platform & Security](#platform--security)
8. [Telegram Integration](#telegram-integration)

---

## 1. Code Generation

### `/api/code-generator`
**Method:** POST
**Purpose:** Generate code from natural language specifications

**Request:**
```json
{
  "query": "Write a hello world function"
}
```

**Response:**
```json
{
  "data": {
    "result": {
      "code": "def hello_world():\n    print('Hello, World!')",
      "language": "Python",
      "reasoning": "Simple function implementation...",
      "complexity": "O(1)",
      "missingContext": []
    }
  }
}
```

**Use Cases:**
- Generate functions from descriptions
- Create boilerplate code
- Quick prototyping

---

### `/api/code-improver`
**Method:** POST  
**Purpose:** Improve existing code with suggestions

**Request:**
```json
{
  "code": "function add(a,b){return a+b}",
  "query": "Add error handling and type checking"
}
```

**Response:**
```json
{
  "data": {
    "result": {
      "improvedCode": "function add(a, b) {\n  if (typeof a !== 'number' || typeof b !== 'number') {\n    throw new Error('Both arguments must be numbers');\n  }\n  return a + b;\n}",
      "improvements": ["Added type checking", "Added error handling"],
      "reasoning": "Enhanced robustness..."
    }
  }
}
```

**Use Cases:**
- Code review automation
- Add error handling
- Performance optimization
- Security improvements

---

## 2. Workflow Planning

### `/api/workflow-planner`
**Method:** POST
**Purpose:** Generate workflow schemas for complex processes

**Request:**
```json
{
  "query": "Plan authentication workflow"
}
```

**Response:**
```json
{
  "data": {
    "result": {
      "workflowName": "AuthenticationWorkflow",
      "workflowDescription": "Handles user authentication...",
      "workflowSchemaAsString": "{\"version\":1,\"steps\":[...]}",
      "estimatedDuration": "2-5 seconds",
      "requiredAgents": ["input-handler", "validation-service", "token-generator"],
      "dataFlowSummary": "User credentials validated...",
      "missingContext": ["Database schema", "Error handling"],
      "reasoning": "Sequential steps ensure validation..."
    }
  }
}
```

**Use Cases:**
- API design planning
- Process automation
- System architecture
- Agent orchestration

---

## 3. Summarization

### `/api/summarize`
**Method:** POST
**Purpose:** Summarize text into concise key points

**Request:**
```json
{
  "query": "Summarize this: SmartLedger provides blockchain solutions for enterprises using BSV for data integrity."
}
```

**Response:**
```json
{
  "data": {
    "result": {
      "summary": "SmartLedger offers blockchain solutions tailored for enterprises, utilizing Bitcoin SV (BSV) to ensure data integrity.",
      "keyPoints": ["Blockchain solutions", "Enterprise focus", "BSV technology"],
      "summaryType": "concise"
    }
  }
}
```

**Use Cases:**
- Meeting notes
- Documentation TL;DR
- Conversation digests
- Research summaries

---

## 4. Chat & Conversation

### `/api/lumen`
**Method:** POST
**Purpose:** Chat with Lumen (SmartLedger personality with memory)

**Request:**
```json
{
  "sessionId": "user-123",
  "query": "What is SmartLedger?"
}
```

**Response:**
```json
{
  "responses": [
    {
      "text": "SmartLedger Technology is...",
      "order": 1
    }
  ],
  "sessionId": "user-123",
  "continuationHitLimit": false,
  "totalIterations": 1
}
```

**Features:**
- Persistent memory per session
- Personality evolution
- Automatic response chaining
- Context awareness

---

### `/api/chat`
**Method:** POST
**Purpose:** Generic conversational AI with memory

**Request:**
```json
{
  "sessionId": "conversation-456",
  "query": "Hello, how are you?"
}
```

**Response:**
```json
{
  "responses": [
    {
      "text": "Hello! I'm doing well...",
      "order": 1
    }
  ],
  "sessionId": "conversation-456"
}
```

---

## 5. Blockchain Anchoring

### `/api/anchors/:sessionId`
**Method:** GET
**Purpose:** Anchor conversation to BSV blockchain for immutable proof

**Response:**
```json
{
  "data": {
    "sessionId": "user-123",
    "txid": "abc123...",
    "hash": "sha256hash...",
    "timestamp": "2026-02-01T18:00:00.000Z",
    "verified": true
  }
}
```

**Use Cases:**
- Conversation proof
- Timestamp verification
- Immutable audit trails
- Legal compliance

---

### `/api/anchors/:sessionId/verify`
**Method:** GET
**Purpose:** Verify anchored data on-chain

**Response:**
```json
{
  "verified": true,
  "txid": "abc123...",
  "onChain": true,
  "blockHeight": 123456
}
```

---

### `/api/anchors` (List All)
**Method:** GET
**Purpose:** List all anchored sessions

**Response:**
```json
{
  "anchors": [
    {
      "sessionId": "user-123",
      "txid": "abc...",
      "timestamp": "2026-02-01..."
    }
  ],
  "total": 1
}
```

---

### `/api/recall/:txid`
**Method:** GET
**Purpose:** Recall conversation from blockchain transaction

**Response:**
```json
{
  "data": {
    "sessionData": {...},
    "verified": true,
    "source": "blockchain"
  }
}
```

---

## 6. Personality System

### `/api/personality/create`
**Method:** POST
**Purpose:** Create new AI personality profile

**Request:**
```json
{
  "traits": {
    "helpful": 0.9,
    "technical": 0.8,
    "creative": 0.7
  },
  "background": "Expert in blockchain technology",
  "purpose": "Technical assistant"
}
```

---

### `/api/personality`
**Method:** POST
**Purpose:** Query with personality-specific responses

---

### `/api/personality/:sessionId/evolve`
**Method:** POST
**Purpose:** Evolve personality based on interactions

---

### `/api/personality/:sessionId`
**Method:** GET
**Purpose:** Get current personality state

---

### `/api/personality/:sessionId/reflect`
**Method:** GET
**Purpose:** Get personality self-reflection

---

## 7. Platform & Security

### `/api/platform/public-key`
**Method:** GET
**Purpose:** Get platform's ECDSA public key for signature verification

**Response:**
```json
{
  "data": {
    "publicKey": "027093ed97769b19577bed8a1d939f640546b7a1126d059ca096533c3db6975927",
    "algorithm": "ECDSA-secp256k1"
  }
}
```

---

### `/api/platform/verify`
**Method:** POST
**Purpose:** Verify signed payloads

**Request:**
```json
{
  "payload": {...},
  "signature": "IB..."
}
```

---

### `/health`
**Method:** GET
**Purpose:** Health check endpoint

**Response:**
```json
{
  "data": {
    "ok": true
  }
}
```

---

## 8. Telegram Integration

### `/api/telegram/webhook`
**Method:** POST
**Purpose:** Telegram bot webhook receiver (internal use)

---

### `/api/telegram/register`
**Method:** POST
**Purpose:** Register Telegram webhook

---

### `/api/telegram/status`
**Method:** GET
**Purpose:** Get bot status and info

**Response:**
```json
{
  "data": {
    "bot": {
      "id": 8154304398,
      "is_bot": true,
      "first_name": "lumenfriend",
      "username": "ilumenbot"
    },
    "webhook": {
      "url": "https://lumenfriend.codenlighten.org/api/telegram/webhook",
      "has_custom_certificate": false,
      "pending_update_count": 0
    }
  }
}
```

---

## 🎯 Integration Strategy for Telegram

### High-Value Commands to Add:

1. **`/code [description]`** → `/api/code-generator`
   - Generate code snippets on demand
   - Fast prototyping in chat

2. **`/improve [code]`** → `/api/code-improver`
   - Send code, get improvements
   - Quick code reviews

3. **`/workflow [description]`** → `/api/workflow-planner`
   - Plan complex workflows
   - Architecture guidance

4. **`/summarize [text or last N messages]`** → `/api/summarize`
   - Summarize long conversations
   - Extract key points from threads

5. **`/anchor`** → `/api/anchors/:sessionId`
   - Anchor conversation to blockchain
   - Immutable proof generation
   - Share verification links

6. **`/verify [txid]`** → `/api/anchors/:sessionId/verify`
   - Verify blockchain anchors
   - Proof of authenticity

### Lumen Self-Integration:

**Allow Lumen to call these APIs internally when asked:**
- "Can you write me a function to..." → Auto-call `/api/code-generator`
- "Improve this code..." → Auto-call `/api/code-improver`
- "Plan a workflow for..." → Auto-call `/api/workflow-planner`
- "Summarize our conversation" → Auto-call `/api/summarize`

This would make Lumen a **function-calling agent** that automatically uses the right tool!

---

## 📊 All Endpoints Summary

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/health` | GET | Health check | ✅ Working |
| `/api/platform/public-key` | GET | Get public key | ✅ Working |
| `/api/code-generator` | POST | Generate code | ✅ Working |
| `/api/code-improver` | POST | Improve code | ✅ Working |
| `/api/workflow-planner` | POST | Plan workflows | ✅ Working |
| `/api/summarize` | POST | Summarize text | ✅ Working |
| `/api/lumen` | POST | Lumen chat | ✅ Working |
| `/api/chat` | POST | Generic chat | ✅ Working |
| `/api/personality/*` | Various | Personality system | ✅ Working |
| `/api/anchors/*` | Various | Blockchain anchoring | ✅ Working |
| `/api/recall/*` | GET | Blockchain recall | ✅ Working |
| `/api/telegram/*` | Various | Telegram integration | ✅ Working |

**Total: 20+ production endpoints ready for integration**
