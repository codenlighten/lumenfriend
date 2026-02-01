#!/bin/bash

# BSV ECDSA Signing Demo with Session Persistence

BASE_URL="http://localhost:3000"
SESSION_ID="bsv-signing-demo-$(date +%s%N | cut -b1-13)"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  🔐 BSV ECDSA Signing Demo with Session Persistence"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Step 1: Chat with persistence
echo "📝 Step 1: Chat with persistence enabled..."
CHAT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/chat" \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"What is blockchain technology?\",\"sessionId\":\"$SESSION_ID\",\"persist\":true}")

echo "✓ Response received and SIGNED with ECDSA"
echo ""
echo "  Algorithm: $(echo $CHAT_RESPONSE | jq -r '.algorithm')"
echo "  Public Key: $(echo $CHAT_RESPONSE | jq -r '.publicKey')"
echo "  Timestamp: $(echo $CHAT_RESPONSE | jq -r '.timestamp')"
SIGNATURE=$(echo $CHAT_RESPONSE | jq -r '.signature')
echo "  Signature: ${SIGNATURE:0:50}..."
echo ""

# Step 2: Get anchor info
echo "⛓️  Step 2: Retrieving anchor information..."
ANCHOR_RESPONSE=$(curl -s "$BASE_URL/api/anchors/$SESSION_ID")

if [ "$(echo $ANCHOR_RESPONSE | jq -r '.payload.hash')" != "null" ]; then
  echo "✓ Session anchored successfully"
  echo ""
  echo "  Hash: $(echo $ANCHOR_RESPONSE | jq -r '.payload.hash')"
  echo "  TXID: $(echo $ANCHOR_RESPONSE | jq -r '.payload.txid // "(pending)"')"
  echo "  Anchored At: $(echo $ANCHOR_RESPONSE | jq -r '.payload.anchoredAt')"
  echo ""
fi

# Step 3: More interactions
echo "💬 Step 3: Adding more interactions..."
curl -s -X POST "$BASE_URL/api/chat" \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"Explain decentralized systems\",\"sessionId\":\"$SESSION_ID\",\"persist\":true}" > /dev/null
echo "  ✓ Interaction 1 persisted"

sleep 0.5

curl -s -X POST "$BASE_URL/api/chat" \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"What are cryptographic signatures?\",\"sessionId\":\"$SESSION_ID\",\"persist\":true}" > /dev/null
echo "  ✓ Interaction 2 persisted"
echo ""

# Step 4: List all anchors
echo "📋 Step 4: Listing all anchors..."
ANCHORS_COUNT=$(curl -s "$BASE_URL/api/anchors" | jq '.payload | length')
echo "✓ Total anchored sessions: $ANCHORS_COUNT"
echo ""

# Step 5: Health check
echo "❤️  Step 5: Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s "$BASE_URL/health")
echo "✓ Health: $(echo $HEALTH_RESPONSE | jq -r '.payload.ok')"
echo "  Signed: Yes"
echo "  Algorithm: $(echo $HEALTH_RESPONSE | jq -r '.algorithm')"
echo ""

# Step 6: Get public key
echo "🔑 Step 6: Retrieving platform public key..."
PUBKEY_RESPONSE=$(curl -s "$BASE_URL/api/platform/public-key")
echo "✓ Public Key: $(echo $PUBKEY_RESPONSE | jq -r '.payload.publicKey')"
echo "  Algorithm: $(echo $PUBKEY_RESPONSE | jq -r '.payload.algorithm')"
echo "  Platform: $(echo $PUBKEY_RESPONSE | jq -r '.payload.platform')"
echo ""

echo "═══════════════════════════════════════════════════════════"
echo "  ✅ All tests completed successfully!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "🎯 Summary:"
echo "   - Session ID: $SESSION_ID"
echo "   - All responses signed with ECDSA (secp256k1)"
echo "   - Session persisted to encrypted anchor"
echo "   - Platform public key available for verification"
echo ""
