## Project Memory (Rolling)
- Added CLI for querying OpenAI wrapper with optional context JSON (cliQuery.js).
- Added test scripts: testOpenaiWrapper.js (base agent schema) and testSummarizeAgent.js (summarize agent schema).
- Fixed baseAgent schema required fields and added items for `questions` array.
- OpenAI wrapper supports optional context object in prompt assembly.
- Added session-based chat CLI with rolling memory and summaries (sessionChat.js, lib/memoryStore.js).
- Added Express API for session-based chat with in-memory 1-week TTL (server.js, lib/sessionMap.js).
- Added BSV publishing support with encrypted memory payloads (lib/encryption.js, lib/simpleBsvClient.js, server.js).
- Added BSV anchor persistence with SmartLedger-BSV (lib/bsvAnchor.js, lib/anchorStore.js, server.js).
  - Hash-anchoring for privacy: encrypted payloads hashed and stored on-chain via OP_RETURN.
  - Endpoints: POST /api/chat with persist flag, GET /api/anchors/:sessionId to retrieve & decrypt.
  - **TESTED & WORKING**: Sessions encrypted, hashed to BSV blockchain, retrievable + decryptable.

---

Memory Method:
● A conversation loop that always remembers only the most recent 21 messages 
(“interactions”) and keeps up to 3 rolling summaries of those messages in 21-message 
chunks. 
Why 
● The last 21 keep the conversation sharp and relevant. 
● The 3 summaries preserve deeper context without storing the whole history. 
Key pieces 
1. Interactions window (size = 21): a sliding window of the newest 21 turns (user + AI 
messages count as interactions). 
2. Summaries list (max = 3): each summary represents one 21-interaction block. We 
keep at most 3; when a 4th is created, we drop the oldest. 
How it updates (step-by-step) 
● Each time a new interaction comes in: 
1. Add it to the interactions list. 
2. If the list is ≤ 21, do nothing else. 
3. If the list becomes 22, do two things: 
■ Summarize the latest 21 interactions (i.e., interactions #2–#22). 
■ Slide the window: drop the oldest one so the window goes back to 21 
(now #2–#22). 
4. Put that new summary at the end of the summaries list. 
5. If summaries now exceed 3, drop the oldest summary. 
Simple example 
● Interactions 1–21 arrive → window holds 1–21, no summary yet. 
● Interaction 22 arrives → summarize 2–22, store Summary A, window becomes 2–22. 
● Interaction 43 arrives → summarize 23–43, store Summary B (now A, B). 
● Interaction 64 arrives → summarize 44–64, store Summary C (now A, B, C). 
● Interaction 85 arrives → summarize 65–85, store Summary D (now drop A, keep B, C, 
D). 
What to store (lightweight shape) 
● interactions: array (max length 21). Each item: {role: "user"|"ai", text: 
string, ts: iso-string}. 
● summaries: array (max length 3). Each item: {range: {startIndex:number, 
endIndex:number} | {startId, endId}, text: string, ts: 
iso-string}. 
○ We don’t need to keep the old interactions for a summary—just its text and the 
range it covered for reference. 
Rules of thumb 
● Summaries should be concise but specific: goals, decisions, facts, names, and any 
evolving state. 
● When generating a model response, provide the model with: 
○ The current 21 interactions plus the 3 summaries (if any), newest first. 
● No hard dependency on absolute counts—treat “21” and “3” as configurable 
constants. 
Acceptance criteria 
● After any message, interactions.length is always ≤ 21. 
● A new summary is created every time the 22nd interaction is added. 
● summaries.length is always ≤ 3, oldest dropped first. 
● Given 85 messages total, there are exactly 3 summaries (covering 23–43, 44–64, 
65–85) and the active window shows messages 65–85. 
That’s it—rolling short-term memory (21) + rolling long-term context (3 summaries). 