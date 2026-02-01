import dotenv from "dotenv";

dotenv.config();

const BASE_URL = "http://localhost:3000";

async function apiCall(endpoint, method = "GET", body = null) {
  const options = {
    method,
    headers: { "Content-Type": "application/json" }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(`API Error: ${data.error || response.statusText}`);
  }

  return data;
}

async function demo() {
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  LUMEN FRIEND - SESSION MEMORY DEMO");
  console.log("═══════════════════════════════════════════════════════════\n");

  // Step 1: Start a new session
  console.log("📝 STEP 1: Starting a new chat session...\n");
  const session1 = await apiCall("/api/chat", "POST", {
    message: "What is blockchain technology?"
  });

  const sessionId = session1.sessionId;
  console.log(`✓ Session created: ${sessionId}`);
  console.log(`✓ AI Response: ${session1.result.response.substring(0, 100)}...\n`);

  // Step 2: Add more messages to the session
  console.log("📝 STEP 2: Continuing the conversation...\n");
  const session2 = await apiCall("/api/chat", "POST", {
    sessionId,
    message: "How does BSV differ from Bitcoin?"
  });

  console.log(`✓ AI Response: ${session2.result.response.substring(0, 100)}...\n`);

  // Step 3: Persist the session to BSV blockchain
  console.log("⛓️  STEP 3: Anchoring session to BSV blockchain...\n");
  const session3 = await apiCall("/api/chat", "POST", {
    sessionId,
    message: "Tell me about distributed ledgers.",
    persist: true,
    persistMode: "context",
    persistWait: true
  });

  const txid = session3.persist.txid;
  const hash = session3.persist.hash;
  console.log(`✓ Session persisted!`);
  console.log(`✓ Transaction ID: ${txid}`);
  console.log(`✓ Hash: ${hash}\n`);

  // Step 4: Verify on-chain
  console.log("🔍 STEP 4: Verifying anchor on BSV blockchain...\n");
  const verification = await apiCall(`/api/anchors/${sessionId}/verify`);

  console.log(`✓ On-chain verification:
  - TXID: ${verification.txid}
  - Confirmed: ${verification.onChain.confirmed}
  - Confirmations: ${verification.onChain.confirmations}
  - Block Height: ${verification.onChain.blockHeight}
  - Anchor Payload: ${verification.onChain.anchorPayload}\n`);

  // Step 5: Recall from TXID (no local DB needed)
  console.log("🔄 STEP 5: Recalling anchor metadata from TXID (explorer)...\n");
  const recalled = await apiCall(`/api/recall/${txid}`);

  console.log(`✓ Recalled from TXID:
  - Hash: ${recalled.hash}
  - Protocol: ${recalled.protocol}
  - Issuer: ${recalled.issuer}
  - Timestamp: ${recalled.timestamp}
  - Block Height: ${recalled.blockHeight}\n`);

  // Step 6: Decrypt full session (local receipt)
  console.log("🔐 STEP 6: Decrypting full session from local receipt...\n");
  const decrypted = await apiCall(`/api/recall/${sessionId}/decrypt`);

  console.log(`✓ Session decrypted:
  - Hash (verified): ${decrypted.hash}
  - TXID: ${decrypted.txid}
  - Total Interactions: ${decrypted.sessionData.sessionData.interactions.length}
  - Anchored At: ${decrypted.anchoredAt}\n`);

  console.log("📋 INTERACTION HISTORY:\n");
  decrypted.sessionData.sessionData.interactions.forEach((interaction, i) => {
    const role = interaction.role === "user" ? "👤 USER" : "🤖 AI";
    const text = interaction.text.substring(0, 120);
    console.log(`  ${i + 1}. [${interaction.ts}]`);
    console.log(`     ${role}: ${text}...`);
    console.log("");
  });

  // Step 7: List all anchors
  console.log("📊 STEP 7: Listing all anchored sessions...\n");
  const allAnchors = await apiCall("/api/anchors");

  console.log(`✓ Total anchored sessions: ${allAnchors.count}`);
  allAnchors.anchors.forEach((anchor) => {
    console.log(`  - ${anchor.sessionId} (TXID: ${anchor.txid.substring(0, 16)}...)`);
  });

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  ✅ FULL WORKFLOW COMPLETE!");
  console.log("═══════════════════════════════════════════════════════════\n");
  console.log("Summary:");
  console.log(`  📝 Session ID: ${sessionId}`);
  console.log(`  ⛓️  TXID on blockchain: ${txid}`);
  console.log(`  🔐 Encrypted & stored in .anchor-receipts.json`);
  console.log(`  ✅ Full recovery from blockchain explorer possible\n`);
}

demo().catch(console.error);
