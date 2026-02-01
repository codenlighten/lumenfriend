import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";

const baseUrlRaw = (process.env.API_BASE_URL || "http://localhost:3000").trim();
const baseUrl = baseUrlRaw.endsWith("/") ? baseUrlRaw.slice(0, -1) : baseUrlRaw;
const defaultTimeout = Number(process.env.API_TEST_TIMEOUT_MS || 15000);
const results = [];

function toMs(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : defaultTimeout;
}

async function callAndRecord(name, method, path, body, options = {}) {
  if (!path.startsWith("/")) {
    throw new Error(`Path must start with '/' for ${name}`);
  }

  const allowedStatuses = options.allowedStatuses || [200];
  const timeoutMs = toMs(options.timeoutMs);
  const note = options.note || null;

  const url = `${baseUrl}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const init = { method, signal: controller.signal };
  if (body !== undefined) {
    init.headers = { "content-type": "application/json" };
    init.body = JSON.stringify(body);
  }

  const started = performance.now();
  let response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    clearTimeout(timer);
    const elapsed = Math.round(performance.now() - started);
    const entry = {
      name,
      method,
      path,
      status: null,
      statusOk: false,
      latencyMs: elapsed,
      error: error.name === "AbortError" ? `Request timed out after ${timeoutMs}ms` : error.message,
      note
    };
    results.push(entry);
    console.error(`[FAIL] ${name} -> ${entry.error}`);
    throw error;
  }
  clearTimeout(timer);

  const latencyMs = Math.round(performance.now() - started);
  let envelope;
  let parseError = null;
  try {
    envelope = await response.json();
  } catch (parseErr) {
    parseError = parseErr.message || "Non-JSON response";
  }

  const data = envelope?.data || null;
  const apiError = data?.error || envelope?.error || parseError;
  const statusOk = allowedStatuses.includes(response.status);

  const entry = {
    name,
    method,
    path,
    status: response.status,
    statusOk,
    latencyMs,
    allowedStatuses,
    note
  };

  if (apiError) {
    entry.error = apiError;
  }

  if (data && typeof data === "object") {
    entry.dataKeys = Object.keys(data);
    if (data.result && typeof data.result === "object") {
      entry.resultKeys = Object.keys(data.result);
    }
    if (data.sessionId) {
      entry.sessionId = data.sessionId;
    }
  }

  if (statusOk) {
    console.log(`[PASS] ${name} (${response.status}, ${latencyMs}ms)`);
  } else {
    console.error(`[FAIL] ${name} (${response.status}, ${latencyMs}ms)${apiError ? ` - ${apiError}` : ""}`);
  }

  results.push(entry);
  return { envelope, data, statusOk, status: response.status };
}

async function run() {
  console.log(`Testing endpoints at ${baseUrl} (timeout ${defaultTimeout}ms)`);

  const health = await callAndRecord("GET /health", "GET", "/health");
  if (!health.envelope) {
    throw new Error("Health endpoint did not return a signed envelope.");
  }

  await callAndRecord("POST /api/platform/verify", "POST", "/api/platform/verify", {
    signedObject: health.envelope
  });

  await callAndRecord("GET /api/platform/public-key", "GET", "/api/platform/public-key");

  const chat = await callAndRecord("POST /api/chat", "POST", "/api/chat", {
    message: "System check ping from automated endpoint sweep.",
    context: {
      metadata: {
        sweep: "full-endpoint-check",
        requestedAt: new Date().toISOString()
      }
    }
  });

  const sessionId = chat.data?.sessionId;
  if (!sessionId) {
    throw new Error("Chat endpoint did not return a sessionId.");
  }

  await callAndRecord("POST /api/code-generator", "POST", "/api/code-generator", {
    query: "Generate a simple Node.js Express handler that returns pong.",
    context: { runtime: "node" },
    temperature: 0.2
  });

  await callAndRecord("POST /api/code-improver", "POST", "/api/code-improver", {
    query: "Improve this function: function add(a,b){return a+b}",
    context: { focus: "style" },
    temperature: 0.1
  });

  await callAndRecord("POST /api/workflow-planner", "POST", "/api/workflow-planner", {
    query: "Plan a workflow to onboard new developers to the repo."
  });

  await callAndRecord("POST /api/summarize", "POST", "/api/summarize", {
    query: "Summarize this context.",
    context: {
      text: "Weekly update: endpoints validated, deployment live, monitoring enabled."
    }
  });

  const lumenSessionId = randomUUID();

  await callAndRecord("POST /api/lumen (memory)", "POST", "/api/lumen", {
    sessionId: lumenSessionId,
    message: "Log the key focus areas for the next release.",
    context: { release: "next" },
    memory: true,
    temperature: 0.3
  });

  await callAndRecord("POST /api/lumen (stateless)", "POST", "/api/lumen", {
    message: "Share a quick SmartLedger-style pep talk.",
    memory: false
  });

  const iso = new Date().toISOString();
  const personality = {
    name: "Lumen Friend",
    description: "Supportive coding teammate focused on clarity.",
    version: "1.0.0",
    tone: "encouraging",
    style: "concise",
    values: ["clarity", "empathy", "safety"],
    constraints: {
      mustNot: ["share confidential keys", "use profanity"],
      shouldAvoid: ["overly long explanations", "untested assumptions"]
    },
    mutable: [
      {
        preference: "prefers clear bullet summaries",
        timestamp: iso
      }
    ],
    audit: {
      createdAt: iso,
      updatedAt: iso,
      updatedBy: "endpoint-check",
      changeLog: [
        {
          change: "Initial personality creation during endpoint sweep",
          timestamp: iso
        }
      ]
    },
    compatibility: {
      policy: "Align with lumen deployment safety guidelines"
    }
  };

  await callAndRecord("POST /api/personality/create", "POST", "/api/personality/create", {
    sessionId,
    personality,
    immutable: false,
    evolutionEnabled: true,
    persist: false
  });

  const personalityUpdateTimestamp = new Date().toISOString();
  const updatedPersonality = {
    ...personality,
    version: "1.0.1",
    style: "concise with friendly sign-offs",
    audit: {
      ...personality.audit,
      updatedAt: personalityUpdateTimestamp,
      changeLog: [
        ...personality.audit.changeLog,
        {
          change: "Style updated to include friendly sign-offs",
          timestamp: personalityUpdateTimestamp
        }
      ]
    }
  };

  await callAndRecord("POST /api/personality", "POST", "/api/personality", {
    sessionId,
    personality: updatedPersonality,
    immutable: false,
    evolutionEnabled: true,
    persist: false
  });

  await callAndRecord("POST /api/personality/evolve", "POST", "/api/personality/evolve", {
    sessionId,
    interactions: [
      { role: "user", text: "Can you keep responses upbeat?", ts: iso },
      { role: "ai", text: "Absolutely! I will keep things positive while staying concise.", ts: iso }
    ],
    summaries: [
      { text: "User prefers upbeat tone and clarity.", ts: iso }
    ],
    iterationNotes: ["User emphasised upbeat tone"],
    adopt: true,
    immutable: false,
    persist: false
  });

  await callAndRecord("GET /api/personality/:sessionId", "GET", `/api/personality/${sessionId}`);
  await callAndRecord("GET /api/personality/:sessionId/reflect", "GET", `/api/personality/${sessionId}/reflect`);

  await callAndRecord("GET /api/anchors", "GET", "/api/anchors", undefined, {
    note: "List anchors; may be empty."
  });

  await callAndRecord("GET /api/anchors/:sessionId", "GET", `/api/anchors/${sessionId}`, undefined, {
    allowedStatuses: [200, 404],
    note: "Expect 404 unless the session was persisted."
  });

  await callAndRecord("GET /api/anchors/:sessionId/verify", "GET", `/api/anchors/${sessionId}/verify`, undefined, {
    allowedStatuses: [200, 404],
    note: "Expect 404 unless the session was persisted."
  });

  await callAndRecord("GET /api/recall/:sessionId/decrypt", "GET", `/api/recall/${sessionId}/decrypt`, undefined, {
    allowedStatuses: [200, 404],
    note: "Expect 404 without an anchor receipt."
  });
}

await run().catch((error) => {
  console.error("Endpoint sweep failed:", error.message || error);
}).finally(() => {
  const failed = results.filter((entry) => !entry.statusOk);
  console.log("\nDetailed results:");
  console.table(results);

  if (failed.length > 0) {
    console.error(`\n${failed.length} endpoint checks failed.`);
    process.exitCode = 1;
  } else {
    console.log("\nAll endpoint checks passed.");
  }
});
