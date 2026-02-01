import { randomUUID } from "node:crypto";

export function wrapInEnvelope({
  agentName = "api",
  agentVersion = "1.0.0",
  data = {},
  requestId = randomUUID(),
  timestamp = new Date().toISOString(),
  meta
} = {}) {
  const envelope = {
    version: "schema-icu-v1",
    agentName,
    agentVersion,
    requestId,
    timestamp,
    data
  };

  if (meta && Object.keys(meta).length > 0) {
    envelope.meta = meta;
  }

  return envelope;
}
