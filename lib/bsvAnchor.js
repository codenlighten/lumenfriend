import bsv from "@smartledger/bsv";
import { publishText } from "./simpleBsvClient.js";
import { encryptJson, decryptJson } from "./encryption.js";

export async function anchorSession(session, options = {}) {
  const {
    issuerDid = "did:web:lumenfriend",
    wait = false
  } = options;

  const payload = {
    sessionData: session,
    anchored: new Date().toISOString()
  };

  const encrypted = encryptJson(payload);
  const encryptedJson = JSON.stringify(encrypted);

  const hash = bsv.crypto.Hash.sha256(Buffer.from(encryptedJson)).toString("hex");

  const anchorPayload = {
    protocol: "SmartLedger",
    version: "1.0",
    type: "SESSION_ANCHOR_SHA256",
    hash,
    issuer: issuerDid,
    timestamp: new Date().toISOString()
  };

  const publishResult = await publishText(JSON.stringify(anchorPayload), { wait });

  return {
    hash,
    anchorPayload,
    encryptedPayload: encrypted,
    publishResult,
    txid: publishResult.txid || null,
    jobId: publishResult.jobId
  };
}

export function verifyAnchoredSession(encryptedPayload, expectedHash) {
  const json = JSON.stringify(encryptedPayload);
  const computedHash = bsv.crypto.Hash.sha256(Buffer.from(json)).toString("hex");
  return computedHash === expectedHash;
}

export function decryptAnchoredSession(encryptedPayload) {
  const payload = decryptJson(encryptedPayload);
  return payload.sessionData;
}
