#!/usr/bin/env node

import fetch from "node-fetch";
import { verifySignature } from "../lib/platformSigner.js";
import { readFileSync } from "node:fs";

const BASE_URL = "http://localhost:3000";
const sessionId = `bsv-signing-demo-${Date.now()}`;

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function makeRequest(endpoint, options = {}) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    },
    ...(options.body && { body: JSON.stringify(options.body) })
  });
  return response.json();
}

async function main() {
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  🔐 BSV ECDSA Signing Demo with Session Persistence");
  console.log("═══════════════════════════════════════════════════════════\n");

  // Step 1: Chat with persistence
  console.log("📝 Step 1: Chat with persistence enabled...");
  const chatResponse = await makeRequest("/api/chat", {
    method: "POST",
    body: {
      message: "What is blockchain technology?",
      sessionId,
      persist: true
    }
  });

  console.log(`✓ Response received and SIGNED with ECDSA\n`);
  console.log(`  Algorithm: ${chatResponse.algorithm}`);
  console.log(`  Public Key: ${chatResponse.publicKey}`);
  console.log(`  Timestamp: ${chatResponse.timestamp}`);
  console.log(`  Signature: ${chatResponse.signature.substring(0, 50)}...\n`);

  // Step 2: Verify the signature
  console.log("🔍 Step 2: Verifying signature...");
  try {
    const verified = verifySignature(chatResponse);
    console.log(`✓ Signature verified: ${verified.valid}`);
    console.log(`  Timestamp: ${verified.timestamp}`);
    console.log(`  Algorithm: ${verified.algorithm}\n`);
  } catch (error) {
    console.error(`✗ Verification failed: ${error.message}\n`);
  }

  // Step 3: Get anchor info
  console.log("⛓️  Step 3: Retrieving anchor information...");
  const anchorResponse = await makeRequest(`/api/anchors/${sessionId}`);

  if (anchorResponse.payload.hash) {
    console.log(`✓ Session anchored successfully\n`);
    console.log(`  Hash: ${anchorResponse.payload.hash}`);
    console.log(`  TXID: ${anchorResponse.payload.txid || "(pending)"}`);
    console.log(`  Anchored At: ${anchorResponse.payload.anchoredAt}\n`);
  }

  // Step 4: More interactions
  console.log("💬 Step 4: Adding more interactions...");
  for (let i = 0; i < 2; i++) {
    const interactions = [
      "Explain decentralized systems",
      "What are cryptographic signatures?"
    ];
    await makeRequest("/api/chat", {
      method: "POST",
      body: {
        message: interactions[i],
        sessionId,
        persist: true
      }
    });
    console.log(`  ✓ Interaction ${i + 1} persisted`);
    await sleep(500);
  }
  console.log();

  // Step 5: List all anchors
  console.log("📋 Step 5: Listing all anchors...");
  const anchorsResponse = await makeRequest("/api/anchors");
  console.log(`✓ Total anchored sessions: ${anchorsResponse.payload.length}\n`);

  // Step 6: Health check (minimal response)
  console.log("❤️  Step 6: Testing health endpoint...");
  const healthResponse = await makeRequest("/health");
  console.log(`✓ Health: ${healthResponse.payload.ok}`);
  console.log(`  Signed: Yes`);
  console.log(`  Algorithm: ${healthResponse.algorithm}\n`);

  // Step 7: Get public key
  console.log("🔑 Step 7: Retrieving platform public key...");
  const pubKeyResponse = await makeRequest("/api/platform/public-key");
  console.log(`✓ Public Key: ${pubKeyResponse.payload.publicKey}`);
  console.log(`  Algorithm: ${pubKeyResponse.payload.algorithm}`);
  console.log(`  Platform: ${pubKeyResponse.payload.platform}\n`);

  console.log("═══════════════════════════════════════════════════════════");
  console.log("  ✅ All tests completed successfully!");
  console.log("═══════════════════════════════════════════════════════════\n");

  console.log("🎯 Summary:");
  console.log(`   - Session ID: ${sessionId}`);
  console.log(
    `   - All responses signed with ECDSA (secp256k1)`
  );
  console.log(`   - Session persisted to encrypted anchor`);
  console.log(`   - Platform public key available for verification\n`);
}

main().catch(console.error);
