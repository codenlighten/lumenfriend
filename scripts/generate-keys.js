#!/usr/bin/env node

import bsv from "@smartledger/bsv";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const KEY_DIR = "./.keys";
const PRIVATE_KEY_PATH = resolve(KEY_DIR, "platform.private.wif");
const PUBLIC_KEY_PATH = resolve(KEY_DIR, "platform.public.hex");
const ENV_PATH = ".env";

function generateAndSaveKeys() {
  // Create .keys directory if it doesn't exist
  if (!existsSync(KEY_DIR)) {
    mkdirSync(KEY_DIR, { recursive: true });
  }

  console.log("\n🔐 Generating secp256k1 key pair using @smartledger/bsv...\n");

  const privateKey = new bsv.PrivateKey();
  const wif = privateKey.toWIF();
  const publicKeyHex = privateKey.publicKey.toString();

  // Save keys to files
  writeFileSync(PRIVATE_KEY_PATH, wif, { mode: 0o600 });
  writeFileSync(PUBLIC_KEY_PATH, publicKeyHex, { mode: 0o644 });

  console.log("✓ Keys generated successfully!\n");
  console.log(`📁 Private Key: ${PRIVATE_KEY_PATH} (mode 0600, WIF format)`);
  console.log(`📁 Public Key:  ${PUBLIC_KEY_PATH} (mode 0644, hex format)\n`);

  // Display the public key
  console.log("📋 PUBLIC KEY (for distribution):\n");
  console.log(publicKeyHex);


  // Check if .env exists and add keys if not
  if (existsSync(ENV_PATH)) {
    let envContent = readFileSync(ENV_PATH, "utf-8");
    let updated = false;

    // Remove old entries if they exist
    envContent = envContent.replace(/PLATFORM_PRIVATE_KEY=.*\n/g, "");
    envContent = envContent.replace(/PLATFORM_PUBLIC_KEY=.*\n/g, "");

    console.log("\n📝 Adding platform keys to .env...\n");
    const envEntry = `# Platform Signing Keys (ECDSA secp256k1)\nPLATFORM_PRIVATE_KEY="${wif}"\nPLATFORM_PUBLIC_KEY="${publicKeyHex}"\n`;
    const newContent = envContent.trimEnd() + "\n" + envEntry;
    writeFileSync(ENV_PATH, newContent);
    console.log("✓ PLATFORM_PRIVATE_KEY and PLATFORM_PUBLIC_KEY added to .env");
  }

  console.log("\n═════════════════════════════════════════════════════════");
  console.log("  ✅ Key generation complete!");
  console.log("═════════════════════════════════════════════════════════\n");
  console.log("📌 Key Files:");
  console.log(`   - Private: ${PRIVATE_KEY_PATH} (WIF format, KEEP SECURE)`);
  console.log(`   - Public:  ${PUBLIC_KEY_PATH} (hex format, SAFE TO SHARE)\n`);
  console.log("🚀 All API responses are now signed with ECDSA (secp256k1)!");
  console.log("   Get public key: GET /api/platform/public-key\n");
}

generateAndSaveKeys();
