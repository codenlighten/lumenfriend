import { readFile, writeFile } from "node:fs/promises";
import { access } from "node:fs/promises";

const DEFAULT_STORE_PATH = "./.anchor-receipts.json";

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function loadStore(path = DEFAULT_STORE_PATH) {
  if (!(await fileExists(path))) {
    return { receipts: {} };
  }

  const raw = await readFile(path, "utf-8");
  return JSON.parse(raw);
}

async function saveStore(store, path = DEFAULT_STORE_PATH) {
  await writeFile(path, JSON.stringify(store, null, 2), "utf-8");
}

export async function saveAnchorReceipt(sessionId, anchor, options = {}) {
  const { storePath = DEFAULT_STORE_PATH } = options;

  const store = await loadStore(storePath);

  store.receipts[sessionId] = {
    hash: anchor.hash,
    txid: anchor.txid,
    jobId: anchor.jobId,
    encryptedPayload: anchor.encryptedPayload,
    anchoredAt: new Date().toISOString()
  };

  await saveStore(store, storePath);

  return store.receipts[sessionId];
}

export async function getAnchorReceipt(sessionId, options = {}) {
  const { storePath = DEFAULT_STORE_PATH } = options;

  const store = await loadStore(storePath);
  return store.receipts[sessionId] || null;
}

export async function listAnchorReceipts(options = {}) {
  const { storePath = DEFAULT_STORE_PATH } = options;

  const store = await loadStore(storePath);
  return Object.entries(store.receipts).map(([sessionId, receipt]) => ({
    sessionId,
    ...receipt
  }));
}

export async function deleteAnchorReceipt(sessionId, options = {}) {
  const { storePath = DEFAULT_STORE_PATH } = options;

  const store = await loadStore(storePath);
  const deleted = store.receipts[sessionId] || null;

  delete store.receipts[sessionId];
  await saveStore(store, storePath);

  return deleted;
}
