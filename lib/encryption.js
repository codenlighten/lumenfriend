import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function parseKey(rawKey) {
  if (!rawKey) {
    throw new Error("MEMORY_ENCRYPTION_KEY is required.");
  }

  const trimmed = rawKey.trim();
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }

  const base64 = Buffer.from(trimmed, "base64");
  if (base64.length === 32) {
    return base64;
  }

  throw new Error("MEMORY_ENCRYPTION_KEY must be 32 bytes (base64) or 64 hex chars.");
}

export function encryptJson(payload) {
  const key = parseKey(process.env.MEMORY_ENCRYPTION_KEY);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const plaintext = JSON.stringify(payload);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();

  return {
    alg: ALGORITHM,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: encrypted.toString("base64")
  };
}

export function decryptJson(encryptedPayload) {
  const key = parseKey(process.env.MEMORY_ENCRYPTION_KEY);
  const iv = Buffer.from(encryptedPayload.iv, "base64");
  const tag = Buffer.from(encryptedPayload.tag, "base64");
  const data = Buffer.from(encryptedPayload.data, "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(data),
    decipher.final()
  ]);

  return JSON.parse(decrypted.toString("utf8"));
}
