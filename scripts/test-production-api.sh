#!/bin/bash
# API Endpoint Testing Script
# Tests all production endpoints on lumenfriend.codenlighten.org

BASE_URL="https://lumenfriend.codenlighten.org"
echo "🧪 Testing Lumenfriend Production API"
echo "Base URL: $BASE_URL"
echo "========================================"
echo ""

# Health check
echo "1️⃣  Testing /health"
curl -s "$BASE_URL/health" | head -c 200
echo -e "\n"

# Platform public key
echo "2️⃣  Testing /api/platform/public-key"
curl -s "$BASE_URL/api/platform/public-key" | head -c 200
echo -e "\n"

# Code Generator
echo "3️⃣  Testing /api/code-generator"
curl -s -X POST "$BASE_URL/api/code-generator" \
  -H "Content-Type: application/json" \
  -d '{"query": "Write a simple hello world function in JavaScript"}' \
  | jq -r '.response.code[0]' 2>/dev/null || echo "Response received"
echo -e "\n"

# Code Improver
echo "4️⃣  Testing /api/code-improver"
curl -s -X POST "$BASE_URL/api/code-improver" \
  -H "Content-Type: application/json" \
  -d '{"code": "function add(a,b){return a+b}", "query": "Add error handling"}' \
  | jq -r '.response.improvedCode' 2>/dev/null || echo "Response received"
echo -e "\n"

# Workflow Planner
echo "5️⃣  Testing /api/workflow-planner"
curl -s -X POST "$BASE_URL/api/workflow-planner" \
  -H "Content-Type: application/json" \
  -d '{"query": "Plan workflow for user authentication"}' \
  | jq -r '.response.phases[0].name' 2>/dev/null || echo "Response received"
echo -e "\n"

# Summarize
echo "6️⃣  Testing /api/summarize"
curl -s -X POST "$BASE_URL/api/summarize" \
  -H "Content-Type: application/json" \
  -d '{"text": "This is a long text that needs to be summarized. It contains multiple sentences with various information that should be condensed into key points."}' \
  | jq -r '.response.summary' 2>/dev/null || echo "Response received"
echo -e "\n"

# Lumen Chat
echo "7️⃣  Testing /api/lumen"
curl -s -X POST "$BASE_URL/api/lumen" \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "test-session-'$(date +%s)'", "query": "What is SmartLedger?"}' \
  | jq -r '.responses[0].text' 2>/dev/null | head -c 150
echo -e "\n...\n"

# Generic Chat
echo "8️⃣  Testing /api/chat"
curl -s -X POST "$BASE_URL/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "test-session-'$(date +%s)'", "query": "Hello"}' \
  | jq -r '.responses[0].text' 2>/dev/null | head -c 100
echo -e "\n...\n"

# List anchors
echo "9️⃣  Testing /api/anchors (list)"
curl -s "$BASE_URL/api/anchors" | jq -r '.anchors | length' 2>/dev/null || echo "Response received"
echo -e "\n"

# Telegram status
echo "🔟 Testing /api/telegram/status"
curl -s "$BASE_URL/api/telegram/status" | head -c 200
echo -e "\n"

echo "========================================"
echo "✅ API Testing Complete"
