import bsv from "@smartledger/bsv";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const KEY_DIR = "./.keys";
const PRIVATE_KEY_PATH = resolve(KEY_DIR, "platform.private.wif");
const PUBLIC_KEY_PATH = resolve(KEY_DIR, "platform.public.hex");

function ensureKeyDir() {
  if (!existsSync(KEY_DIR)) {
    mkdirSync(KEY_DIR, { recursive: true });
  }
}

export function generateKeyPair() {
  ensureKeyDir();

  const privateKey = new bsv.PrivateKey();
  const wif = privateKey.toWIF();
  const publicKeyHex = privateKey.publicKey.toString();

  writeFileSync(PRIVATE_KEY_PATH, wif, { mode: 0o600 });
  writeFileSync(PUBLIC_KEY_PATH, publicKeyHex, { mode: 0o644 });

  return {
    privateKeyPath: PRIVATE_KEY_PATH,
    publicKeyPath: PUBLIC_KEY_PATH,
    wif,
    publicKeyHex
  };
}

export function loadOrCreateKeys() {
  ensureKeyDir();

  const envPrivate = process.env.PLATFORM_PRIVATE_KEY?.trim();
  const envPublic = process.env.PLATFORM_PUBLIC_KEY?.trim();
  if (envPrivate && envPublic) {
    return {
      wif: envPrivate,
      publicKeyHex: envPublic,
      privateKey: new bsv.PrivateKey(envPrivate),
      publicKey: new bsv.PublicKey(envPublic)
    };
  }

  if (!existsSync(PRIVATE_KEY_PATH) || !existsSync(PUBLIC_KEY_PATH)) {
    return generateKeyPair();
  }

  const wif = readFileSync(PRIVATE_KEY_PATH, "utf-8").trim();
  const publicKeyHex = readFileSync(PUBLIC_KEY_PATH, "utf-8").trim();

  return {
    wif,
    publicKeyHex,
    privateKey: new bsv.PrivateKey(wif),
    publicKey: new bsv.PublicKey(publicKeyHex)
  };
}

export function getPublicKey() {
  const { publicKeyHex } = loadOrCreateKeys();
  return publicKeyHex;
}

export function signObject(obj) {
  const signatureInfo = signPayload(obj);
  return {
    payload: obj,
    signature: signatureInfo.signature,
    publicKey: signatureInfo.publicKey,
    timestamp: new Date().toISOString(),
    algorithm: signatureInfo.algorithm
  };
}

export function signPayload(payload) {
  const { privateKey } = loadOrCreateKeys();
  const payloadString = stableStringify(payload);

  const message = new bsv.Message(payloadString);
  const signature = message.sign(privateKey);

  return {
    signature,
    publicKey: privateKey.publicKey.toString(),
    algorithm: "ECDSA-secp256k1"
  };
}

export function verifySignature(signedObject) {
  if (!signedObject || !signedObject.signature || !signedObject.publicKey) {
    throw new Error("Invalid signed object format.");
  }

  const payload = signedObject.payload ? signedObject.payload : stripSignatureFields(signedObject);
  const payloadString = stableStringify(payload);
  const message = new bsv.Message(payloadString);
  const publicKey = new bsv.PublicKey(signedObject.publicKey);
  const address = publicKey.toAddress();

  const isValid = message.verify(address, signedObject.signature);

  return {
    valid: isValid,
    timestamp: signedObject.timestamp,
    algorithm: signedObject.signatureAlgorithm || signedObject.algorithm,
    publicKey: signedObject.publicKey
  };
}

function stripSignatureFields(signedObject) {
  const { signature, publicKey, signatureAlgorithm, algorithm, ...rest } = signedObject;
  return rest;
}

function stableStringify(value) {
  return JSON.stringify(sortKeysDeep(value));
}

function sortKeysDeep(value) {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }

  if (value && typeof value === "object") {
    const sorted = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = sortKeysDeep(value[key]);
    }
    return sorted;
  }

  return value;
}
