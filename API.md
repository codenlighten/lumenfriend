# API Documentation

Base URL: `https://lumenfriend.codenlighten.org`

All responses are wrapped in a signed envelope (schema-icu-v1):
- `version`, `agentName`, `agentVersion`, `requestId`, `timestamp`, `data`
- `signature`, `publicKey`, `signatureAlgorithm`

Signature format (ECDSA secp256k1):
- The signed payload is the envelope **without** `signature`, `publicKey`, `signatureAlgorithm`.
- Canonical JSON: keys are sorted recursively before `JSON.stringify`.
- Signature = `bsv.Message(payloadString).sign(privateKey)` (base64).
- Verify using address derived from `publicKey`:
  - `message.verify(publicKey.toAddress(), signature)`

## Health
### GET /health
Returns a basic health response.

Response (data):
```json
{ "ok": true }
```

## Platform Keys & Verification
### GET /api/platform/public-key
Returns the platform public key.

Response (data):
```json
{
  "publicKey": "<hex>ದ್ಯ",
  "algorithm": "ECDSA-secp256k1",
  "platform": "lumen",
  "version": "1.0.0"
}
```

### POST /api/platform/verify
Verifies a signed envelope.

Request body:
```json
{ "signedObject": { /* signed envelope */ } }
## Code Generator
### POST /api/code-generator
Invokes the code generator schema to synthesize code along with metadata (language, complexity, reasoning).

Request body:
```json
{
  "query": "Generate a Python function that reverses a list.",
  "context": { "styleGuide": "pep8" },
  "model": "gpt-4o-mini",
  "temperature": 0.2
}
```

Response (data):
```json
{
  "query": "Generate a Python function that reverses a list.",
  "result": {
    "code": "string",
    "missingContext": [],
    "reasoning": "string",
    "language": "Python",
    "complexity": "O(n)"
  }
}
```

## Code Improver
### POST /api/code-improver
Improves an existing code snippet by applying the codeImprover schema, returning the enhanced code, explanation, and further suggestions.

Request body:
```json
{
  "query": "Improve this JavaScript snippet...",
  "context": { "constraints": ["no external deps"] },
  "temperature": 0.3
}
```

Response (data):
```json
{
  "query": "Improve this JavaScript snippet...",
  "result": {
    "improvedCode": "string",
    "explanation": "string",
    "suggestions": ["string"]
  }
}
```

## Workflow Planner
### POST /api/workflow-planner
Generates a multi-step workflow DAG using the workflowPlanner schema, suitable for orchestrating agent pipelines.

Request body:
```json
{
  "query": "Design a workflow to review pull requests.",
  "context": {
    "tooling": ["eslint", "jest"],
    "constraints": ["must run under 10 minutes"]
  }
}
```

## Summarize
### POST /api/summarize
Produces a concise summary with reasoning and missing context analysis using the summarize agent schema.

Request body:
```json
{
  "query": "Summarize this weekly status report.",
  "context": {
    "title": "Weekly Project Update",
    "text": "Engineering delivered the API integration and expanded test coverage."
  },
  "model": "gpt-4o-mini",
  "temperature": 0.1
}
```

## Lumen Chatbot
### POST /api/lumen
Conversational endpoint for the SmartLedger "Lumen" agent. Uses the base agent schema, persistent rolling memory (21 interactions, 3 summaries), and the pre-seeded Lumen personality. Lumen's personality evolves naturally as interaction history accumulates during summarization cycles. 

Responses automatically chain up to 10 times if the model indicates `continue: true`, delivering the complete thought at once. Set `memory=false` to run a stateless interaction that returns the current personality alongside the response.

Request body:
```json
{
  "sessionId": "optional string",
  "message": "How is the build looking?",
  "memory": true,
  "context": { "project": "lumenfriend" },
  "model": "gpt-4o-mini",
  "temperature": 0.4
}
```

Response (data) with memory enabled:
```json
{
  "sessionId": "uuid",
  "memory": true,
  "responses": [
    {
      "response": "string",
      "includesCode": false,
      "code": "string",
      "continue": true,
      "questionsForUser": false,
      "questions": [],
      "missingContext": [],
      "order": 1
    },
    {
      "response": "string",
      "includesCode": false,
      "code": "string",
      "continue": false,
      "questionsForUser": false,
      "questions": [],
      "missingContext": [],
      "order": 2
    }
  ],
  "continuationHitLimit": false,
  "totalIterations": 2,
  "personality": { /* Lumen personality, evolved through session history */ },
  "summaries": [
    { "range": { "startId": 1, "endId": 21 }, "text": "..." }
  ],
  "interactions": [
    { "id": 1, "role": "user", "text": "..." }
  ]
}
```

Response (data) with `memory=false`:
```json
{
  "sessionId": "uuid",
  "memory": false,
  "responses": [
    { /* baseAgent schema object with order field */ }
  ],
  "continuationHitLimit": false,
  "totalIterations": 1,
  "personality": { /* Lumen personality snapshot */ }
}
```

Response (data):
```json
{
  "query": "Summarize this weekly status report.",
  "result": {
    "summary": "string",
    "missingContext": ["string"],
    "reasoning": "string"
  }
}
```

Response (data):
```json
{
  "query": "Design a workflow to review pull requests.",
  "result": {
    "workflowName": "string",
    "workflowDescription": "string",
    "workflowSchemaAsString": "{\"version\":1,...}",
    "estimatedDuration": "string",
    "requiredAgents": ["string"],
    "dataFlowSummary": "string",
    "missingContext": ["string"],
    "reasoning": "string"
  }
}
```

```

Response (data):
```json
{
  "valid": true,
  "timestamp": "<iso>",
  "algorithm": "ECDSA-secp256k1",
  "publicKey": "<hex>"
}
```

## Chat
### POST /api/chat
Creates or continues a session and returns a model response. Responses automatically chain up to 10 times if the model indicates `continue: true`, delivering the complete thought at once.

Request body:
```json
{
  "message": "string",
  "sessionId": "optional-string",
  "context": {
    "personality": { /* optional personality object validated against personalitySchema */ },
    "personalityEvolutionEnabled": true,
    "personalityImmutable": false,
    "personalitySource": {
      "type": "onchain",
      "txid": "string",
      "hash": "string",
      "note": "optional metadata"
    },
    "metadata": { "custom": "values" }
  },
  "persist": false,
  "persistMode": "context|full",
  "persistWait": false
}
```

Response (data):
```json
{
  "sessionId": "string",
  "responses": [
    {
      "response": "string",
      "includesCode": false,
      "code": "string",
      "continue": true,
      "questionsForUser": false,
      "questions": [],
      "missingContext": [],
      "order": 1
    },
    {
      "response": "string",
      "includesCode": false,
      "code": "string",
      "continue": false,
      "questionsForUser": false,
      "questions": [],
      "missingContext": [],
      "order": 2
    }
  ],
  "continuationHitLimit": false,
  "totalIterations": 2,
  "persist": null,
  "personality": { /* current validated personality or null */ },
  "personalityEvolutionEnabled": true,
  "personalityImmutable": false
}
```

If `context.personality` is provided it must satisfy [schemas/personalitySchema.js](schemas/personalitySchema.js). The server validates and adopts it for the session before generating a response. Use `context.personalityEvolutionEnabled=false` to opt-out of automatic evolution ("who am I?") during summarization.

`context.personalityImmutable` toggles immutability for the active session. `context.personalitySource` is optional metadata for provenance (e.g., anchored txid/hash). Both are passed to the model inside `requestContext` for additional grounding.

If `persist=true`, `persist` returns:
```json
{
  "success": true,
  "hash": "<sha256>",
  "txid": "<txid|null>",
  "jobId": 0,
  "status": "pending|success",
  "receipt": {
    "hash": "<sha256>",
    "txid": "<txid|null>",
    "jobId": 0,
    "encryptedPayload": { "alg": "aes-256-gcm", "iv": "...", "tag": "...", "data": "..." },
    "anchoredAt": "<iso>"
  }
}
```

## Anchors
### GET /api/anchors
Lists stored anchor receipts.

Response (data):
```json
{ "count": 0, "anchors": [ { "sessionId": "...", "hash": "...", "txid": "..." } ] }
```

### GET /api/anchors/:sessionId
Returns decrypted session data for a stored receipt.

Response (data):
```json
{
  "sessionId": "string",
  "hash": "<sha256>",
  "txid": "<txid|null>",
  "anchoredAt": "<iso>",
  "data": { "summaries": [], "interactions": [] }
}
```

### GET /api/anchors/:sessionId/verify
Verifies anchor on-chain via explorer.

Response (data):
```json
{
  "sessionId": "string",
  "hash": "<sha256>",
  "txid": "<txid>",
  "onChain": {
    "txid": "<txid>",
    "confirmed": false,
    "confirmations": 0,
    "anchorPayload": "{...}"
  },
  "explorerUrl": "https://explorer.smartledger.technology/tx/<txid>"
}
```

### DELETE /api/anchors/:sessionId
Deletes an anchor receipt.

Response (data):
```json
{ "success": true, "deleted": "<sessionId>" }
```

## Personality
### POST /api/personality/create
Creates the initial personality for a session. The payload is validated against [schemas/personalitySchema.js](schemas/personalitySchema.js). Use `immutable=true` to freeze the personality (auto-evolution and future updates require explicit opt-out) and optionally anchor it on-chain.

Request body:
```json
{
  "sessionId": "optional-string",
  "personality": { /* full personalitySchema payload */ },
  "immutable": false,
  "evolutionEnabled": true,
  "persist": false,
  "persistWait": false
}
```

Response (data):
```json
{
  "sessionId": "string",
  "personality": { /* normalized personality */ },
  "immutable": false,
  "evolutionEnabled": true,
  "persist": {
    "success": true,
    "hash": "<sha256>",
    "txid": "<txid|null>",
    "jobId": 0,
    "status": "pending|success",
    "receipt": { "hash": "<sha256>", "txid": "<txid|null>", "jobId": 0, "encryptedPayload": { "alg": "aes-256-gcm", "iv": "...", "tag": "...", "data": "..." }, "anchoredAt": "<iso>" },
    "storeKey": "personality:<sessionId>"
  }
}
```

Anchored personalities are written to ./.personality-anchors.json (separate from session receipts).

### POST /api/personality
Updates an existing personality. Fails if none is registered. If the current personality is immutable, include `immutable=false` to explicitly unlock it; otherwise the request is rejected. `persist=true` (or setting `immutable=true`) re-anchors the latest profile.

Request body:
```json
{
  "sessionId": "required-string",
  "personality": { /* updated personality */ },
  "immutable": false,
  "evolutionEnabled": true,
  "persist": false,
  "persistWait": false
}
```

Response (data):
```json
{
  "sessionId": "string",
  "personality": { /* normalized personality */ },
  "immutable": false,
  "evolutionEnabled": true,
  "persist": { /* same structure as create when anchoring */ }
}
```

### POST /api/personality/evolve
Generates an evolved personality ("who am I?" analysis) using the previous personality plus provided context. Supply `adopt=true` to set the evolved personality for the session (subject to immutability rules). `persist=true` anchors the evolved result under a timestamped key.

`sessionId` is required when using `adopt=true` or `persist=true`.

Request body:
```json
{
  "sessionId": "optional-string",
  "previousPersonality": { /* optional override, validated if provided */ },
  "interactions": [ { "role": "user", "text": "..." } ],
  "summaries": [ { "range": { "startId": 1, "endId": 21 }, "text": "..." } ],
  "additionalContext": "freeform string",
  "history": ["notable change", "milestone"],
  "iterationNotes": ["iteration detail"],
  "externalEvidence": ["onchain txid", "audit ref"],
  "adopt": false,
  "immutable": null,
  "persist": false,
  "persistWait": false
}
```

Response (data):
```json
{
  "sessionId": "string",
  "baseVersion": "1.0.0",
  "evolvedPersonality": { /* evolved personality */ },
  "explanation": "2-3 sentence evolution summary",
  "evolvedAt": "2026-01-31T15:00:00Z",
  "adopted": false,
  "immutable": false,
  "persist": {
    "success": true,
    "hash": "<sha256>",
    "txid": "<txid|null>",
    "jobId": 0,
    "status": "pending|success",
    "receipt": { "hash": "<sha256>", "txid": "<txid|null>", "jobId": 0, "encryptedPayload": { "alg": "aes-256-gcm", "iv": "...", "tag": "...", "data": "..." }, "anchoredAt": "<iso>" },
    "storeKey": "personality:<sessionId>:<timestamp>"
  },
  "error": false
}
```

### GET /api/personality/:sessionId
Fetches the current personality plus session flags.

Response (data):
```json
{
  "sessionId": "string",
  "personality": { /* personality object */ },
  "immutable": false,
  "evolutionEnabled": true
}
```

### GET /api/personality/:sessionId/reflect
Returns the on-demand "who am I?" reflection without mutating the stored personality. Useful for auditing or dry-run evolutions.

Response (data):
```json
{
  "sessionId": "string",
  "reflection": "Based on our interactions, you're becoming more direct and pragmatic, prioritizing clarity over elaboration.",
  "evolvedPersonality": { /* evolved personality */ },
  "timestamp": "2026-01-31T15:00:00Z",
  "immutable": false,
  "evolutionEnabled": true,
  "error": false
}
```

The evolved personality always includes:
- Incremented version (if unchanged, the service increments automatically)
- Updated audit.updatedAt and audit.updatedBy ("personalityEvolver")
- New changelog entry summarizing the shift
- Mutable preference timestamp to trace evolution cadence

## Recall
### GET /api/recall/:txid
Fetches anchor metadata from the explorer (works even if unconfirmed).

Response (data):
```json
{
  "txid": "<txid>",
  "hash": "<sha256>",
  "protocol": "SmartLedger",
  "type": "SESSION_ANCHOR_SHA256",
  "issuer": "did:web:lumenfriend",
  "timestamp": "<iso>",
  "note": "To decrypt session data, use /api/recall/:sessionId/decrypt"
}
```

### GET /api/recall/:sessionId/decrypt
Decrypts session data from local receipt store.

Response (data):
```json
{
  "sessionData": { "sessionData": { "summaries": [], "interactions": [] }, "anchored": "<iso>" },
  "hash": "<sha256>",
  "txid": "<txid|null>",
  "anchoredAt": "<iso>"
}
```

## Telegram Bot Integration

Lumen can operate as a Telegram bot, providing the same intelligent responses through Telegram's interface. Per-user sessions maintain memory and personality evolution just like the web interface.

### Bot Commands

- **/start** - Welcome message and feature overview
- **/reset** - Clear conversation history for this user
- **/memory** - Toggle persistent memory on/off
- **/help** - Show command guide

### POST /api/telegram/webhook

Telegram webhook endpoint. Configure this URL with the Telegram Bot API to receive message updates.

**Setup:**
1. Create a bot via [@BotFather](https://t.me/botfather) on Telegram
2. Copy the bot token to `TELEGRAM_BOT_TOKEN` in `.env`
3. Call `/api/telegram/register` with your webhook URL
4. Start sending messages to the bot

**Update Payload (from Telegram):**
```json
{
  "update_id": 123456789,
  "message": {
    "message_id": 1,
    "from": { "id": 987654321, "first_name": "John" },
    "chat": { "id": 987654321, "type": "private" },
    "date": 1706832000,
    "text": "Hello Lumen"
  }
}
```

Response: `{ "ok": true }` (Telegram receives this immediately; processing happens async)

### POST /api/telegram/register

Register the webhook URL with Telegram's Bot API. Must be called once to enable receiving updates.

**Request body:**
```json
{
  "webhookUrl": "https://lumenfriend.codenlighten.org/api/telegram/webhook"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Webhook registered successfully",
  "result": {
    "ok": true,
    "description": "Webhook was set"
  }
}
```

### GET /api/telegram/status

Returns bot information and current webhook status.

**Response:**
```json
{
  "bot": {
    "id": 1234567890,
    "is_bot": true,
    "first_name": "Lumen",
    "username": "lumenfriend_bot",
    "can_join_groups": true,
    "can_read_all_group_messages": false,
    "supports_inline_queries": false
  },
  "webhook": {
    "url": "https://lumenfriend.codenlighten.org/api/telegram/webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0,
    "last_error_date": 0,
    "max_connections": 40,
    "allowed_updates": ["message", "callback_query"]
  }
}
```

### Features

- **Session Memory**: Each Telegram user ID gets a persistent session file with conversation history
- **Personality Evolution**: Lumen's persona evolves based on interactions (same as web interface)
- **Response Chaining**: Long responses are automatically chained (up to 10 iterations) for complete thoughts
- **Markdown Formatting**: Responses render with proper formatting (**bold**, _italic_, `code`, lists)
- **Code Blocks**: Syntax-highlighted code appears in Telegram's code block format
- **Typing Indicator**: Shows "typing..." while Lumen composes a response
- **Message Splitting**: Responses longer than 4096 chars are automatically split across multiple messages

## Environment Variables
- `OPENAI_API_KEY`
- `OPENAI_DEFAULT_MODEL`
- `OPENAI_DEFAULT_TEMPERATURE`
- `SIMPLEBSV_API_KEY`
- `SIMPLEBSV_BASE_URL` (optional)
- `MEMORY_ENCRYPTION_KEY`
- `PLATFORM_PRIVATE_KEY` (WIF)
- `PLATFORM_PUBLIC_KEY` (hex)
- `BSV_EXPLORER_URL` (optional)
- `TELEGRAM_BOT_TOKEN` (optional - for Telegram bot integration)
- `PORT`

