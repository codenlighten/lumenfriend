import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { mkdir } from "node:fs/promises";
import { queryOpenAI } from "./lib/openaiWrapper.js";
import { queryOpenAIWithFunctions } from "./lib/openaiWrapper.js";
import { loadSession, saveSession, addInteraction, buildContext } from "./lib/memoryStore.js";
import { getSession, touchSession, startCleanupTimer } from "./lib/sessionMap.js";
import { encryptJson } from "./lib/encryption.js";
import { publishText } from "./lib/simpleBsvClient.js";
import { anchorSession, verifyAnchoredSession, decryptAnchoredSession } from "./lib/bsvAnchor.js";
import { saveAnchorReceipt, getAnchorReceipt, listAnchorReceipts, deleteAnchorReceipt } from "./lib/anchorStore.js";
import { verifyAnchorOnChain } from "./lib/bsvExplorer.js";
import { recallMemoryFromTx, recallAndDecryptFromReceipt } from "./lib/memoryRecall.js";
import { signPayload, verifySignature, getPublicKey, loadOrCreateKeys } from "./lib/platformSigner.js";
import { wrapInEnvelope } from "./lib/envelopeWrapper.js";
import { personalitySchema } from "./schemas/personalitySchema.js";
import { codeGeneratorResponseSchema } from "./schemas/codeGenerator.js";
import { codeImproverResponseSchema } from "./schemas/codeImprover.js";
import { workflowPlannerSchema } from "./schemas/workflowPlanner.js";
import { summarizeAgentResponseSchema } from "./schemas/summarizeAgent.js";
import { terminalAgentResponseSchema } from "./schemas/terminalAgent.js";
import { baseAgentResponseSchema } from "./schemas/baseAgent.js";
import { lumenPersonality } from "./lib/lumenPersonality.js";
import { whoAmI, evolvePersonality } from "./lib/personalityEvolver.js";
import { chainResponses } from "./lib/responseChainer.js";
import TelegramBot from "./lib/telegramBot.js";
import {
  loadTelegramSession,
  saveTelegramSession,
  addTelegramInteraction,
  buildTelegramContext,
  handleStartCommand,
  handleResetCommand,
  handleMemoryCommand,
  handleHelpCommand,
  handleWhoAmICommand,
  handleStatsCommand,
  handleTeachCommand,
  handleExportCommand,
  handleAdminCommand
} from "./lib/telegramSessionManager.js";
import { loadUserStats, saveUserStats, recordInteraction } from "./lib/statsTracker.js";
import { detectContinuity, extractPreviousContext, buildContextPrompt } from "./lib/contextThreading.js";
import { getTeachingContext, loadTeachingHistory } from "./lib/teachingEngine.js";
import { hasAccess, getAccessDeniedMessage } from "./lib/accessControl.js";
import { getFunctionDefinitions, executeFunctionCall, formatCommandApprovalRequest } from "./lib/functionCalling.js";
import { validateCommand, executeCommand, formatExecutionResult } from "./lib/terminalExecutor.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3000;

const PERSONALITY_ANCHOR_STORE = "./.personality-anchors.json";
const LUMEN_MEMORY_DIR = resolve(process.cwd(), "sessions", "lumen");
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Store pending terminal commands for approval
const pendingCommands = new Map(); // userId -> { command, explanation, timestamp }

let telegramBot = null;
if (TELEGRAM_BOT_TOKEN) {
  telegramBot = new TelegramBot(TELEGRAM_BOT_TOKEN);
}

// Initialize keys on startup
loadOrCreateKeys();

startCleanupTimer();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const AGENT_VERSION = "1.0.0";

async function ensureDirectory(pathname) {
  await mkdir(pathname, { recursive: true });
}

function getLumenPersonalitySnapshot() {
  return typeof structuredClone === "function"
    ? structuredClone(lumenPersonality)
    : JSON.parse(JSON.stringify(lumenPersonality));
}

function getAgentName(pathname) {
  if (pathname.startsWith("/api/chat")) return "chat";
  if (pathname.startsWith("/api/code-generator")) return "code-generator";
  if (pathname.startsWith("/api/code-improver")) return "code-improver";
  if (pathname.startsWith("/api/workflow-planner")) return "workflow-planner";
  if (pathname.startsWith("/api/summarize")) return "summarize";
  if (pathname.startsWith("/api/terminal-agent")) return "terminal-agent";
  if (pathname.startsWith("/api/lumen")) return "lumen";
  if (pathname.startsWith("/api/anchors")) return "anchors";
  if (pathname.startsWith("/api/recall")) return "recall";
  if (pathname.startsWith("/api/personality")) return "personality";
  if (pathname.startsWith("/api/platform/public-key")) return "platform-public-key";
  if (pathname.startsWith("/api/platform/verify")) return "platform-verify";
  if (pathname.startsWith("/health")) return "health";
  return "api";
}

function buildMeta(latencyMs) {
  const meta = {};
  const model = process.env.OPENAI_DEFAULT_MODEL;
  if (model) meta.model = model;
  if (typeof latencyMs === "number") meta.latencyMs = latencyMs;
  return Object.keys(meta).length > 0 ? meta : undefined;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function validatePersonalityInput(personality) {
  if (!isPlainObject(personality)) {
    throw new Error("personality object is required.");
  }

  return queryOpenAI(
    `Validate and normalize this personality object: ${JSON.stringify(personality)}`,
    { schema: personalitySchema }
  );
}

async function persistPersonalityAnchor(sessionId, payload, { wait } = {}) {
  const anchor = await anchorSession(payload, { wait: Boolean(wait) });
  const receipt = await saveAnchorReceipt(sessionId, anchor, {
    storePath: PERSONALITY_ANCHOR_STORE
  });

  return {
    success: true,
    hash: anchor.hash,
    txid: anchor.txid,
    jobId: anchor.jobId,
    status: anchor.publishResult.status,
    receipt,
    storeKey: sessionId
  };
}

function normalizeInteractionsInput(source, fallback = []) {
  if (source === undefined) {
    return fallback;
  }

  if (!Array.isArray(source)) {
    throw new Error("interactions must be an array of { role, text } objects.");
  }

  return source.map((item, index) => {
    if (!isPlainObject(item) || typeof item.text !== "string" || typeof item.role !== "string") {
      throw new Error(`interaction at index ${index} must include role and text strings.`);
    }
    return {
      role: item.role,
      text: item.text,
      ts: item.ts || new Date().toISOString()
    };
  });
}

function normalizeSummariesInput(source, fallback = []) {
  if (source === undefined) {
    return fallback;
  }

  if (!Array.isArray(source)) {
    throw new Error("summaries must be an array of { range, text } objects.");
  }

  return source.map((item, index) => {
    if (!isPlainObject(item) || typeof item.text !== "string") {
      throw new Error(`summary at index ${index} must include text.`);
    }
    return {
      range: item.range || {
        startId: null,
        endId: null
      },
      text: item.text,
      ts: item.ts || new Date().toISOString()
    };
  });
}

function parseOptionalContext(raw) {
  if (raw === undefined) {
    return undefined;
  }

  if (!isPlainObject(raw)) {
    throw new Error("context must be a JSON object.");
  }

  return raw;
}

async function handleSchemaEndpoint(req, res, { schema, logLabel }) {
  try {
    const { query, context, model, temperature } = req.body || {};

    if (typeof query !== "string" || query.trim() === "") {
      return res.status(400).json({ error: "query is required." });
    }

    let parsedContext;
    try {
      parsedContext = parseOptionalContext(context);
    } catch (contextError) {
      return res.status(400).json({ error: contextError.message });
    }

    if (model !== undefined && typeof model !== "string") {
      return res.status(400).json({ error: "model must be a string." });
    }

    let numericTemperature;
    if (temperature !== undefined) {
      numericTemperature = Number(temperature);
      if (!Number.isFinite(numericTemperature)) {
        return res.status(400).json({ error: "temperature must be a finite number." });
      }
    }

    const options = { schema };
    if (parsedContext !== undefined) {
      options.context = parsedContext;
    }
    if (model) {
      options.model = model;
    }
    if (numericTemperature !== undefined) {
      options.temperature = numericTemperature;
    }

    const result = await queryOpenAI(query, options);
    return res.json({ query, result });
  } catch (error) {
    console.error(`${logLabel} failed:`, error);
    return res.status(500).json({ error: "Internal server error." });
  }
}

// Middleware to sign all responses
app.use((req, res, next) => {
  const requestId = randomUUID();
  const startTime = Date.now();
  const originalJson = res.json;

  res.json = function (data) {
    const envelopePayload = wrapInEnvelope({
      agentName: getAgentName(req.path),
      agentVersion: AGENT_VERSION,
      requestId,
      data,
      meta: buildMeta(Date.now() - startTime)
    });

    const signatureInfo = signPayload(envelopePayload);
    const signedEnvelope = {
      ...envelopePayload,
      signature: signatureInfo.signature,
      publicKey: signatureInfo.publicKey,
      signatureAlgorithm: signatureInfo.algorithm
    };

    return originalJson.call(this, signedEnvelope);
  };

  next();
});

app.post("/api/chat", async (req, res) => {
  try {
    const {
      sessionId: providedSessionId,
      message,
      persist,
      persistMode,
      persistWait,
      context: rawContext
    } = req.body || {};
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required." });
    }

    const sessionId = providedSessionId || randomUUID();
    const session = getSession(sessionId);

    let requestContext = null;
    if (rawContext !== undefined) {
      if (!rawContext || typeof rawContext !== "object" || Array.isArray(rawContext)) {
        return res.status(400).json({ error: "context must be a JSON object." });
      }
      requestContext = { ...rawContext };
    }

    if (requestContext && requestContext.personality) {
      if (!isPlainObject(requestContext.personality)) {
        return res.status(400).json({ error: "context.personality must be an object." });
      }

      try {
        const validatedPersonality = await validatePersonalityInput(requestContext.personality);
        if (session.personalityImmutable && session.personality) {
          const existingSnapshot = JSON.stringify(session.personality);
          const incomingSnapshot = JSON.stringify(validatedPersonality);
          if (existingSnapshot !== incomingSnapshot) {
            return res.status(409).json({ error: "Personality is immutable for this session." });
          }
        }

        session.personality = validatedPersonality;
        requestContext.personality = validatedPersonality;
      } catch (validationError) {
        return res.status(400).json({ error: `context.personality validation failed: ${validationError.message}` });
      }
    }

    if (requestContext && Object.prototype.hasOwnProperty.call(requestContext, "personalityEvolutionEnabled")) {
      if (typeof requestContext.personalityEvolutionEnabled !== "boolean") {
        return res.status(400).json({ error: "context.personalityEvolutionEnabled must be a boolean." });
      }
      session.personalityEvolutionEnabled = requestContext.personalityEvolutionEnabled;
    }

    if (requestContext && Object.prototype.hasOwnProperty.call(requestContext, "personalityImmutable")) {
      if (typeof requestContext.personalityImmutable !== "boolean") {
        return res.status(400).json({ error: "context.personalityImmutable must be a boolean." });
      }
      session.personalityImmutable = requestContext.personalityImmutable;
    }

    await addInteraction(session, { role: "user", text: message });

    const baseContext = buildContext(session);
    let contextForModel = baseContext;
    if (requestContext) {
      const requestContextForModel = {
        ...requestContext,
        personalityEvolutionEnabled: session.personalityEvolutionEnabled,
        personalityImmutable: session.personalityImmutable
      };
      contextForModel = {
        ...baseContext,
        requestContext: requestContextForModel
      };
    }

    const result = await queryOpenAI(message, { context: contextForModel });

    // Chain responses if continue is true (up to 10 iterations)
    const chainingOptions = {
      schema: baseAgentResponseSchema,
      context: contextForModel
    };

    const { responses, continuationHitLimit, totalIterations } = await chainResponses(
      result,
      chainingOptions,
      async (chainContext) => {
        return await queryOpenAI(message, {
          schema: baseAgentResponseSchema,
          context: chainContext
        });
      }
    );

    const responsesText = responses.map(r => r.response).join("\n\n---\n\n");
    await addInteraction(session, { role: "ai", text: responsesText });
    touchSession(sessionId, session);

    let persistResult = null;
    if (persist) {
      try {
        const sessionToAnchor = persistMode === "full" ? session : buildContext(session);
        const anchor = await anchorSession(sessionToAnchor, { wait: Boolean(persistWait) });
        const receipt = await saveAnchorReceipt(sessionId, anchor);

        persistResult = {
          success: true,
          hash: anchor.hash,
          txid: anchor.txid,
          jobId: anchor.jobId,
          status: anchor.publishResult.status,
          receipt
        };
      } catch (persistError) {
        persistResult = {
          success: false,
          error: persistError.message
        };
      }
    }

    return res.json({
      sessionId,
      responses,
      continuationHitLimit,
      totalIterations,
      persist: persistResult,
      personality: session.personality,
      personalityEvolutionEnabled: session.personalityEvolutionEnabled,
      personalityImmutable: session.personalityImmutable
    });
  } catch (error) {
    console.error("/api/chat failed:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
});

app.post("/api/code-generator", (req, res) =>
  handleSchemaEndpoint(req, res, {
    schema: codeGeneratorResponseSchema,
    logLabel: "/api/code-generator"
  })
);

app.post("/api/code-improver", (req, res) =>
  handleSchemaEndpoint(req, res, {
    schema: codeImproverResponseSchema,
    logLabel: "/api/code-improver"
  })
);

app.post("/api/workflow-planner", (req, res) =>
  handleSchemaEndpoint(req, res, {
    schema: workflowPlannerSchema,
    logLabel: "/api/workflow-planner"
  })
);

app.post("/api/summarize", (req, res) =>
  handleSchemaEndpoint(req, res, {
    schema: summarizeAgentResponseSchema,
    logLabel: "/api/summarize"
  })
);

app.post("/api/terminal-agent", (req, res) =>
  handleSchemaEndpoint(req, res, {
    schema: terminalAgentResponseSchema,
    logLabel: "/api/terminal-agent"
  })
);

app.post("/api/lumen", async (req, res) => {
  try {
    const {
      sessionId: providedSessionId,
      message,
      memory = true,
      context,
      model,
      temperature
    } = req.body || {};

    if (typeof message !== "string" || message.trim() === "") {
      return res.status(400).json({ error: "message is required." });
    }

    let parsedContext;
    try {
      parsedContext = parseOptionalContext(context);
    } catch (contextError) {
      return res.status(400).json({ error: contextError.message });
    }

    if (model !== undefined && typeof model !== "string") {
      return res.status(400).json({ error: "model must be a string." });
    }

    let numericTemperature;
    if (temperature !== undefined) {
      numericTemperature = Number(temperature);
      if (!Number.isFinite(numericTemperature)) {
        return res.status(400).json({ error: "temperature must be a finite number." });
      }
    }

    const sessionId = providedSessionId || randomUUID();
    const memoryEnabled = memory !== false;
    const personalitySnapshot = getLumenPersonalitySnapshot();

    const queryOptions = { schema: baseAgentResponseSchema };
    if (model) {
      queryOptions.model = model;
    }
    if (numericTemperature !== undefined) {
      queryOptions.temperature = numericTemperature;
    }

    let session = null;
    let sessionPath = null;
    let contextForModel;

    if (memoryEnabled) {
      await ensureDirectory(LUMEN_MEMORY_DIR);
      sessionPath = resolve(LUMEN_MEMORY_DIR, `${sessionId}.json`);
      session = await loadSession(sessionPath);

      session.personality = personalitySnapshot;
      session.personalityImmutable = false;
      session.personalityEvolutionEnabled = true;

      await addInteraction(session, { role: "user", text: message }, { summariesLimit: 3 });

      contextForModel = {
        ...buildContext(session),
        agent: {
          name: "Lumen",
          description:
            "SmartLedger Technology's collaborative guide built from this project's methodologies and best practices."
        },
        request: {
          sessionId,
          memoryEnabled: true
        }
      };
    } else {
      contextForModel = {
        personality: personalitySnapshot,
        summaries: [],
        interactions: [],
        agent: {
          name: "Lumen",
          description:
            "SmartLedger Technology's collaborative guide built from this project's methodologies and best practices."
        },
        request: {
          sessionId,
          memoryEnabled: false
        }
      };
    }

    if (parsedContext) {
      contextForModel.userContext = parsedContext;
    }

    queryOptions.context = contextForModel;

    // Get initial response
    const initialResult = await queryOpenAI(message, queryOptions);

    // Chain responses if continue is true (up to 10 iterations)
    const chainingOptions = {
      schema: baseAgentResponseSchema,
      model: queryOptions.model,
      temperature: queryOptions.temperature,
      context: contextForModel
    };

    const { responses, continuationHitLimit, totalIterations } = await chainResponses(
      initialResult,
      chainingOptions,
      async (chainContext) => {
        return await queryOpenAI(message, {
          schema: baseAgentResponseSchema,
          model: queryOptions.model,
          temperature: queryOptions.temperature,
          context: {
            ...chainContext
          }
        });
      }
    );

    if (memoryEnabled && session && sessionPath) {
      // Add all responses to interaction history
      const responsesText = responses.map(r => r.response).join("\n\n---\n\n");
      await addInteraction(session, { role: "ai", text: responsesText }, { summariesLimit: 3 });
      await saveSession(sessionPath, session);

      return res.json({
        sessionId,
        memory: true,
        responses,
        continuationHitLimit,
        totalIterations,
        personality: session.personality,
        summaries: session.summaries,
        interactions: session.interactions
      });
    }

    return res.json({
      sessionId,
      memory: false,
      responses,
      continuationHitLimit,
      totalIterations,
      personality: personalitySnapshot
    });
  } catch (error) {
    console.error("/api/lumen failed:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
});

app.post("/api/personality/create", async (req, res) => {
  try {
    const {
      sessionId: providedSessionId,
      personality,
      immutable,
      persist,
      persistWait,
      evolutionEnabled
    } = req.body || {};

    let validatedPersonality;
    try {
      validatedPersonality = await validatePersonalityInput(personality);
    } catch (validationError) {
      return res.status(400).json({ error: validationError.message });
    }

    const sessionId = providedSessionId || randomUUID();
    const session = getSession(sessionId);

    if (session.personality) {
      return res.status(409).json({ error: "Personality already exists for this session. Use /api/personality or /api/personality/evolve." });
    }

    session.personality = validatedPersonality;
    if (typeof evolutionEnabled === "boolean") {
      session.personalityEvolutionEnabled = evolutionEnabled;
    }
    if (typeof immutable === "boolean") {
      session.personalityImmutable = immutable;
    }

    touchSession(sessionId, session);

    let persistResult = null;
    if (persist || immutable) {
      try {
        const payloadToAnchor = {
          type: "personality",
          immutable: Boolean(immutable),
          sessionId,
          version: validatedPersonality.version,
          personality: validatedPersonality
        };
        persistResult = await persistPersonalityAnchor(`personality:${sessionId}`, payloadToAnchor, {
          wait: persistWait
        });
      } catch (persistError) {
        persistResult = {
          success: false,
          error: persistError.message
        };
      }
    }

    return res.json({
      sessionId,
      personality: session.personality,
      immutable: session.personalityImmutable,
      evolutionEnabled: session.personalityEvolutionEnabled,
      persist: persistResult
    });
  } catch (error) {
    console.error("/api/personality/create failed:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
});

app.post("/api/personality", async (req, res) => {
  try {
    const {
      sessionId: providedSessionId,
      personality,
      persist,
      persistWait,
      evolutionEnabled,
      immutable
    } = req.body || {};

    const sessionId = providedSessionId || randomUUID();
    const session = getSession(sessionId);

    if (!session.personality) {
      return res.status(404).json({ error: "No personality registered yet. Use /api/personality/create first." });
    }

    if (session.personalityImmutable && immutable !== false) {
      return res.status(409).json({ error: "Personality is immutable for this session. Provide immutable=false to override or use /api/personality/evolve." });
    }

    let validatedPersonality;
    try {
      validatedPersonality = await validatePersonalityInput(personality);
    } catch (validationError) {
      return res.status(400).json({ error: validationError.message });
    }

    session.personality = validatedPersonality;
    if (typeof evolutionEnabled === "boolean") {
      session.personalityEvolutionEnabled = evolutionEnabled;
    }
    if (typeof immutable === "boolean") {
      session.personalityImmutable = immutable;
    }

    touchSession(sessionId, session);

    let persistResult = null;
    if (persist || immutable) {
      try {
        const payloadToAnchor = {
          type: "personality",
          immutable: session.personalityImmutable,
          sessionId,
          version: session.personality.version,
          personality: session.personality
        };
        persistResult = await persistPersonalityAnchor(`personality:${sessionId}`, payloadToAnchor, {
          wait: persistWait
        });
      } catch (persistError) {
        persistResult = {
          success: false,
          error: persistError.message
        };
      }
    }

    return res.json({
      sessionId,
      personality: session.personality,
      immutable: session.personalityImmutable,
      evolutionEnabled: session.personalityEvolutionEnabled,
      persist: persistResult
    });
  } catch (error) {
    console.error("/api/personality failed:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
});

app.post("/api/personality/evolve", async (req, res) => {
  try {
    const {
      sessionId: providedSessionId,
      previousPersonality,
      interactions,
      summaries,
      history,
      iterationNotes,
      additionalContext,
      externalEvidence,
      adopt,
      persist,
      persistWait,
      immutable
    } = req.body || {};

    if (!providedSessionId && !previousPersonality) {
      return res.status(400).json({ error: "sessionId or previousPersonality is required." });
    }

    const sessionId = providedSessionId || null;
    const session = sessionId
      ? getSession(sessionId)
      : {
          interactions: [],
          summaries: [],
          personality: null,
          personalityEvolutionEnabled: true,
          personalityImmutable: false
        };

    let basePersonality = session.personality;
    if (previousPersonality) {
      try {
        basePersonality = await validatePersonalityInput(previousPersonality);
      } catch (validationError) {
        return res.status(400).json({ error: `previousPersonality invalid: ${validationError.message}` });
      }
    }

    if (!basePersonality) {
      return res.status(404).json({ error: "No personality available to evolve." });
    }

    let interactionsToUse;
    let summariesToUse;
    try {
      interactionsToUse = normalizeInteractionsInput(interactions, session.interactions || []);
      summariesToUse = normalizeSummariesInput(summaries, session.summaries || []);
    } catch (inputError) {
      return res.status(400).json({ error: inputError.message });
    }

    const evolution = await evolvePersonality(basePersonality, interactionsToUse, summariesToUse, {
      additionalContext,
      history,
      iterationNotes,
      externalEvidence
    });

    if (!evolution.personality) {
      return res.status(500).json({ error: "Failed to evolve personality." });
    }

    let adopted = false;
    if (adopt) {
      if (!sessionId) {
        return res.status(400).json({ error: "sessionId is required to adopt an evolved personality." });
      }

      if (session.personalityImmutable && immutable !== false) {
        return res.status(409).json({ error: "Personality is immutable; set immutable=false to adopt new version." });
      }

      session.personality = evolution.personality;
      if (typeof immutable === "boolean") {
        session.personalityImmutable = immutable;
      }
      touchSession(sessionId, session);
      adopted = true;
    }

    let persistResult = null;
    if ((persist || immutable) && evolution.personality) {
      if (!sessionId && persist) {
        return res.status(400).json({ error: "sessionId is required to persist an evolved personality." });
      }
      try {
        const payloadToAnchor = {
          type: "personality-evolution",
          sessionId,
          immutable: typeof immutable === "boolean" ? immutable : session.personalityImmutable,
          baseVersion: basePersonality.version,
          evolvedVersion: evolution.personality.version,
          explanation: evolution.explanation,
          personality: evolution.personality,
          evolvedAt: evolution.evolvedAt
        };
        const anchorKey = sessionId
          ? `personality:${sessionId}:${Date.now()}`
          : `personality:standalone:${Date.now()}`;
        persistResult = await persistPersonalityAnchor(anchorKey, payloadToAnchor, {
          wait: persistWait
        });
      } catch (persistError) {
        persistResult = {
          success: false,
          error: persistError.message
        };
      }
    }

    return res.json({
      sessionId,
      baseVersion: basePersonality.version,
      evolvedPersonality: evolution.personality,
      explanation: evolution.explanation,
      evolvedAt: evolution.evolvedAt,
      adopted,
      immutable: sessionId ? session.personalityImmutable : Boolean(immutable),
      persist: persistResult,
      error: evolution.error || false
    });
  } catch (error) {
    console.error("/api/personality/evolve failed:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
});

app.get("/api/personality/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = getSession(sessionId);

    if (!session.personality) {
      return res.status(404).json({ error: "Personality not found." });
    }

    return res.json({
      sessionId,
      personality: session.personality,
      immutable: session.personalityImmutable,
      evolutionEnabled: session.personalityEvolutionEnabled
    });
  } catch (error) {
    console.error("/api/personality/:sessionId failed:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
});

app.get("/api/personality/:sessionId/reflect", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = getSession(sessionId);

    if (!session.personality) {
      return res.status(404).json({ error: "Personality not found. Register one first." });
    }

    const reflection = await whoAmI(session);

    return res.json({
      sessionId,
      reflection: reflection.reflection,
      evolvedPersonality: reflection.evolvedPersonality,
      timestamp: reflection.timestamp,
      error: reflection.error,
      immutable: session.personalityImmutable,
      evolutionEnabled: session.personalityEvolutionEnabled
    });
  } catch (error) {
    console.error("/api/personality/:sessionId/reflect failed:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
});

app.get("/api/anchors/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const receipt = await getAnchorReceipt(sessionId);

    if (!receipt) {
      return res.status(404).json({ error: "Anchor receipt not found." });
    }

    const isValid = verifyAnchoredSession(receipt.encryptedPayload, receipt.hash);
    if (!isValid) {
      return res.status(400).json({ error: "Anchor verification failed." });
    }

    const decrypted = decryptAnchoredSession(receipt.encryptedPayload);

    return res.json({
      sessionId,
      hash: receipt.hash,
      txid: receipt.txid,
      anchoredAt: receipt.anchoredAt,
      data: decrypted
    });
  } catch (error) {
    console.error("/api/anchors/:sessionId failed:", error);
    return res.status(500).json({ error: "Failed to retrieve anchor." });
  }
});

app.get("/api/anchors/:sessionId/verify", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const receipt = await getAnchorReceipt(sessionId);

    if (!receipt) {
      return res.status(404).json({ error: "Anchor receipt not found." });
    }

    const onChainVerification = await verifyAnchorOnChain(receipt.txid);

    return res.json({
      sessionId,
      hash: receipt.hash,
      txid: receipt.txid,
      onChain: onChainVerification,
      explorerUrl: `${process.env.BSV_EXPLORER_URL || 'https://explorer.smartledger.technology'}/tx/${receipt.txid}`
    });
  } catch (error) {
    console.error("/api/anchors/:sessionId/verify failed:", error);
    return res.status(500).json({ error: error.message });
  }
});

app.get("/api/anchors", async (req, res) => {
  try {
    const receipts = await listAnchorReceipts();
    return res.json({ count: receipts.length, anchors: receipts });
  } catch (error) {
    console.error("/api/anchors failed:", error);
    return res.status(500).json({ error: "Failed to list anchors." });
  }
});

app.delete("/api/anchors/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const deleted = await deleteAnchorReceipt(sessionId);

    if (!deleted) {
      return res.status(404).json({ error: "Anchor receipt not found." });
    }

    return res.json({ success: true, deleted: sessionId });
  } catch (error) {
    console.error("/api/anchors/:sessionId DELETE failed:", error);
    return res.status(500).json({ error: "Failed to delete anchor." });
  }
});

app.get("/api/recall/:txid", async (req, res) => {
  try {
    const { txid } = req.params;
    const result = await recallMemoryFromTx(txid);

    return res.json(result);
  } catch (error) {
    console.error("/api/recall/:txid failed:", error);
    return res.status(500).json({ error: error.message });
  }
});

app.get("/api/recall/:sessionId/decrypt", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const receipt = await getAnchorReceipt(sessionId);

    if (!receipt) {
      return res.status(404).json({ error: "Anchor receipt not found." });
    }

    const result = await recallAndDecryptFromReceipt(receipt);

    return res.json(result);
  } catch (error) {
    console.error("/api/recall/:sessionId/decrypt failed:", error);
    return res.status(500).json({ error: error.message });
  }
});

// Serve static files (index.html for web chat)
app.use(express.static("."));

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/api/platform/public-key", (req, res) => {
  const publicKey = getPublicKey();
  res.json({
    publicKey,
    algorithm: "ECDSA-secp256k1",
    platform: "lumen",
    version: "1.0.0"
  });
});

app.post("/api/platform/verify", (req, res) => {
  try {
    const { signedObject } = req.body;

    if (!signedObject) {
      return res.status(400).json({ error: "signedObject is required." });
    }

    const result = verifySignature(signedObject);
    return res.json(result);
  } catch (error) {
    console.error("/api/platform/verify failed:", error);
    return res.status(500).json({ error: error.message });
  }
});

// Telegram Bot Integration
app.post("/api/telegram/webhook", async (req, res) => {
  try {
    if (!telegramBot) {
      console.error("[TG] Bot not configured");
      return res.status(400).json({ error: "Telegram bot not configured." });
    }

    const update = req.body;
    console.log(`[TG] Webhook received update ID: ${update.update_id}`);

    // Respond immediately to Telegram (non-blocking)
    res.status(200).json({ ok: true });

    // Handle the update asynchronously (don't wait)
    setImmediate(async () => {
      try {
        // Handle callback queries (button presses)
        if (update.callback_query) {
          const callbackQuery = update.callback_query;
          const chatId = callbackQuery.message.chat.id;
          const userId = callbackQuery.from.id;
          const data = callbackQuery.data;

          console.log(`[TG] Callback query from user ${userId}: ${data}`);

          // Answer the callback query immediately
          await telegramBot.answerCallbackQuery(callbackQuery.id, '✓');

          // Handle button actions
          let response;
          switch (data) {
            case 'toggle_memory':
              response = await handleMemoryCommand(userId);
              break;
            case 'show_help':
              response = await handleHelpCommand();
              break;
            case 'show_whoami':
              response = await handleWhoAmICommand(userId);
              break;
            case 'show_examples':
              response = `<b>📚 Example Questions You Can Ask:</b>

🔹 "Help me write a Node.js API"
🔹 "Review this code snippet"
🔹 "Design a workflow for authentication"
🔹 "What's the best practice for error handling?"
🔹 "Explain how to use async/await"

Just type your question naturally!`;
              break;
            case 'quick_question':
              response = `<b>💡 Ask me anything!</b>

I can help with:
• Code examples and explanations
• Architecture and design patterns
• Debugging and optimization
• Best practices and methodologies

Type your question below and I'll respond!`;
              break;
            default:
              response = `Unknown action: ${data}`;
          }

          const messages = telegramBot.formatTelegramResponse(response);
          await telegramBot.sendMultipleMessages(chatId, messages);
          return;
        }

        if (update.message) {
          const message = update.message;
          const chatId = message.chat.id;
          const userId = message.from.id;
          const text = message.text || "";

          console.log(`[TG] Message from user ${userId} in chat ${chatId}: "${text.substring(0, 50)}"`);

          // Check access control
          const userHasAccess = await hasAccess(userId);
          if (!userHasAccess) {
            console.log(`[TG] Access denied for user ${userId}`);
            const deniedMessage = getAccessDeniedMessage();
            await telegramBot.sendMessage(chatId, deniedMessage);
            return;
          }

          // Load or create session
          const session = await loadTelegramSession(userId);
          console.log(`[TG] Session loaded for user ${userId}: ${session.interactions.length} interactions`);

          // Send typing indicator
          try {
            await telegramBot.sendTypingAction(chatId);
            console.log(`[TG] Typing indicator sent to chat ${chatId}`);
          } catch (error) {
            console.warn(`[TG] Failed to send typing indicator: ${error.message}`);
          }

          // Handle commands
          if (text.startsWith("/")) {
            const command = text.split(" ")[0].toLowerCase();
            console.log(`[TG] Command received: ${command}`);

            let result;
            switch (command) {
              case "/start":
                result = await handleStartCommand(userId);
                break;
              case "/reset":
                result = await handleResetCommand(userId);
                break;
              case "/memory":
                result = await handleMemoryCommand(userId);
                break;
              case "/help":
                result = await handleHelpCommand(userId);
                break;
              case "/whoami":
                result = await handleWhoAmICommand(userId);
                break;
              case "/stats":
                const stats = await loadUserStats(userId);
                result = await handleStatsCommand(userId, session, stats);
                break;
              case "/teach":
                result = await handleTeachCommand(userId);
                break;
              case "/export":
                // Extract format from command (e.g., "/export json")
                const exportFormat = text.split(" ")[1] || null;
                result = await handleExportCommand(userId, session, exportFormat);
                
                // If result is an export file, send as document
                if (result && typeof result === 'object' && result.type === 'export') {
                  console.log(`[TG] Sending export file: ${result.filename}`);
                  
                  await telegramBot.sendDocument(
                    chatId,
                    result.data,
                    result.filename,
                    `📦 Your Lumen conversation export (${result.format.toUpperCase()})`
                  );
                  
                  console.log(`[TG] Export file sent successfully`);
                  return;
                }
                break;
              case "/admin":
                result = await handleAdminCommand(userId, text);
                break;
                break;
              default:
                result = `Unknown command: ${command}. Type /help for available commands.`;
            }

            // Check if result has buttons
            if (result && typeof result === 'object' && result.message) {
              console.log(`[TG] Command response with buttons: ${result.message.substring(0, 50)}...`);
              await telegramBot.sendMessageWithButtons(chatId, result.message, result.buttons);
            } else {
              console.log(`[TG] Command response: ${result.substring(0, 50)}...`);
              const messages = telegramBot.formatTelegramResponse(result);
              console.log(`[TG] Formatted into ${messages.length} message(s)`);
              await telegramBot.sendMultipleMessages(chatId, messages);
            }
            
            console.log(`[TG] Command response sent successfully`);
            return;
          }

          // Regular message - send to Lumen
          console.log(`[TG] Processing regular message from user ${userId}`);
          
          // Check for pending command approval
          const pending = pendingCommands.get(userId);
          if (pending) {
            const textLower = text.toLowerCase().trim();
            
            if (textLower === 'yes' || textLower === 'y') {
              console.log(`[TG] User approved command: ${pending.command}`);
              pendingCommands.delete(userId);
              
              // Execute the command
              const execResult = await executeCommand(userId, pending.command);
              const formattedResult = formatExecutionResult(execResult);
              
              // Send execution result
              await telegramBot.sendMessage(chatId, formattedResult);
              
              // If successful, continue with function calling flow
              if (execResult.success) {
                // Add the tool response to messages and get final AI response
                const messages = [
                  {
                    role: "system",
                    content: `You are Lumen, an AI assistant. You just executed a terminal command and received output. Explain the results to the user.`
                  },
                  {
                    role: "user",
                    content: pending.explanation
                  },
                  {
                    role: "tool",
                    tool_call_id: pending.functionCall?.id || "terminal_exec",
                    content: execResult.stdout || "(no output)"
                  }
                ];
                
                const functions = getFunctionDefinitions();
                const finalAiResponse = await queryOpenAIWithFunctions(messages, functions);
                const finalResponse = finalAiResponse.content || "Command executed successfully.";
                
                await telegramBot.sendMessage(chatId, finalResponse);
              }
              
              return;
              
            } else if (textLower === 'no' || textLower === 'n') {
              console.log(`[TG] User rejected command: ${pending.command}`);
              pendingCommands.delete(userId);
              
              await telegramBot.sendMessage(chatId, "❌ Command cancelled.");
              return;
              
            } else {
              // User sent something else - remind them
              await telegramBot.sendMessage(chatId, `⏳ You have a pending command approval. Please reply with **"yes"** or **"no"**.\n\n**Command:** \`${pending.command}\``);
              return;
            }
          }
          
          await addTelegramInteraction(userId, session, { role: "user", text });

          // Detect conversation continuity
          const continuityDetection = detectContinuity(text);
          let contextPrompt = null;
          
          if (continuityDetection) {
            console.log(`[TG] Continuity detected: ${continuityDetection.type} (confidence: ${continuityDetection.confidence})`);
            
            // Extract previous context
            const previousContext = extractPreviousContext(session.interactions, 3);
            
            // Load teaching context if available
            let teachingContext = null;
            try {
              const teachingHistory = await loadTeachingHistory(userId);
              teachingContext = getTeachingContext(teachingHistory, 10);
            } catch (error) {
              console.log(`[TG] No teaching context available for user ${userId}`);
            }
            
            // Build context prompt
            contextPrompt = buildContextPrompt(continuityDetection, previousContext, teachingContext);
            console.log(`[TG] Context prompt injected (${contextPrompt.length} chars)`);
          }

          // Get Lumen's response with function calling
          console.log(`[TG] Querying OpenAI for user ${userId} (function calling enabled)`);
          
          const contextForModel = {
            ...buildTelegramContext(session),
            agent: {
              name: "Lumen",
              description: "SmartLedger Technology's collaborative guide built from this project's methodologies and best practices."
            },
            platform: "telegram",
            userId: userId  // Add userId for anchoring
          };

          // Build messages for function calling
          const messages = [
            {
              role: "system",
              content: `You are Lumen, SmartLedger Technology's intelligent guide. You have access to powerful tools:
- generate_code: Write code from descriptions
- improve_code: Review and enhance code
- plan_workflow: Design system architectures
- summarize_conversation: Extract key points
- anchor_to_blockchain: Create immutable proof

Use these tools naturally when users ask for these capabilities. You don't need to announce you're using a tool - just use it and present the results.

Context: ${JSON.stringify(contextForModel)}`
            },
            {
              role: "user",
              content: contextPrompt ? `${text}${contextPrompt}` : text
            }
          ];

          // Get function definitions
          const functions = getFunctionDefinitions();

          // Query with function calling
          const aiResponse = await queryOpenAIWithFunctions(messages, functions);

          let finalResponse;

          // Handle function calls
          if (aiResponse.type === "function_call") {
            console.log(`[TG] AI requested ${aiResponse.functionCalls.length} function call(s)`);
            
            // Execute function calls
            const functionResults = [];
            for (const call of aiResponse.functionCalls) {
              console.log(`[TG] Executing function: ${call.name}`);
              const result = await executeFunctionCall(call.name, call.arguments);
              
              // Handle terminal command approval
              if (result.needsApproval && result.command) {
                // Store pending command
                pendingCommands.set(userId, {
                  command: result.command,
                  explanation: result.explanation,
                  timestamp: Date.now(),
                  functionCall: call
                });
                
                // Send approval request
                const approvalMessage = formatCommandApprovalRequest(result.command, result.explanation);
                await telegramBot.sendMessage(chatId, approvalMessage);
                
                // Don't continue with function execution
                return;
              }
              
              functionResults.push({
                call: call,
                result: result
              });
            }

            // Build response with function results
            messages.push(aiResponse.message);
            
            // Add function results to messages
            for (const fr of functionResults) {
              messages.push({
                role: "tool",
                tool_call_id: fr.call.id,
                content: fr.result.formatted || JSON.stringify(fr.result)
              });
            }

            // Get final response from AI after function execution
            const finalAiResponse = await queryOpenAIWithFunctions(messages, functions);
            finalResponse = finalAiResponse.content || "Tool execution complete.";
            
            console.log(`[TG] Function calling complete, final response: ${finalResponse.substring(0, 50)}...`);
          } else {
            // Regular text response
            finalResponse = aiResponse.content;
            console.log(`[TG] Regular response received: ${finalResponse.substring(0, 50)}...`);
          }

          // For Telegram, we'll send the complete response as one message
          // Convert to baseAgent format for compatibility
          const formattedResult = {
            response: finalResponse,
            responseType: aiResponse.type === "function_call" ? "tool_enhanced" : "conversational"
          };

          const responses = [formattedResult];
          const continuationHitLimit = false;
          const totalIterations = 1;

          console.log(`[TG] Response ready for sending`);

          // Deduplicate responses
          const uniqueResponses = responses;

          console.log(`[TG] After deduplication: ${uniqueResponses.length} responses for Telegram`);

          // Store all responses in session
          const responsesText = uniqueResponses.map(r => r.response).join("\n\n---\n\n");
          await addTelegramInteraction(userId, session, { role: "ai", text: responsesText });
          console.log(`[TG] Session updated with combined response (${responsesText.length} chars)`);

          // Record stats for engagement tracking
          const stats = await loadUserStats(userId);
          await recordInteraction(userId, stats, text, responsesText);
          console.log(`[TG] Stats recorded for user ${userId}: ${stats.interactions} interactions`);

          // Format and send responses - only send if we have unique ones
          let totalMessagesSent = 0;
          
          if (uniqueResponses.length > 0) {
            // For Telegram, combine all responses into ONE message to avoid flooding
            const combinedResponse = uniqueResponses.map(r => r.response).join("\n\n");
            console.log(`[TG] Combining ${uniqueResponses.length} responses into single message (${combinedResponse.length} chars)`);
            
            const messages = telegramBot.formatTelegramResponse(combinedResponse);
            console.log(`[TG] Combined response formatted into ${messages.length} message(s)`);
            
            await telegramBot.sendMultipleMessages(chatId, messages);
            totalMessagesSent += messages.length;
            console.log(`[TG] Combined response sent successfully (${messages.length} messages)`);
          } else {
            console.log(`[TG] No unique responses to send!`);
          }

          if (continuationHitLimit) {
            const limitNotice = "⚠️ Response chain reached maximum iterations (10) — there may be more to say.";
            const messages = telegramBot.formatTelegramResponse(limitNotice);
            await telegramBot.sendMultipleMessages(chatId, messages);
            totalMessagesSent += messages.length;
            console.log(`[TG] Limit notice sent`);
          }

          console.log(`[TG] All responses sent successfully (${totalMessagesSent} messages total)`);
        }
      } catch (error) {
        console.error(`[TG] Error processing Telegram message:`, error);
        console.error(`[TG] Error stack:`, error.stack);
        
        // Try to send error message to user
        if (update.message) {
          try {
            const chatId = update.message.chat.id;
            await telegramBot.sendMessage(chatId, `❌ Error processing your message: ${error.message}`);
            console.log(`[TG] Error message sent to user`);
          } catch (sendError) {
            console.error(`[TG] Failed to send error message to user:`, sendError.message);
          }
        }
      }
    });
  } catch (error) {
    console.error(`[TG] Webhook handler failed:`, error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Register Telegram webhook
app.post("/api/telegram/register", async (req, res) => {
  try {
    if (!telegramBot) {
      return res.status(400).json({ error: "Telegram bot not configured." });
    }

    const { webhookUrl } = req.body;

    if (!webhookUrl) {
      return res.status(400).json({ error: "webhookUrl is required." });
    }

    const result = await telegramBot.setWebhook(webhookUrl);

    return res.json({
      success: result.ok,
      message: result.description || "Webhook registered successfully",
      result
    });
  } catch (error) {
    console.error("/api/telegram/register failed:", error);
    return res.status(500).json({ error: error.message });
  }
});

// Get Telegram bot info and webhook status
app.get("/api/telegram/status", async (req, res) => {
  try {
    if (!telegramBot) {
      return res.status(400).json({ error: "Telegram bot not configured." });
    }

    const botInfo = await telegramBot.getMe();
    const webhookInfo = await telegramBot.getWebhookInfo();

    return res.json({
      bot: botInfo.result,
      webhook: webhookInfo.result
    });
  } catch (error) {
    console.error("/api/telegram/status failed:", error);
    return res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  if (telegramBot) {
    console.log(`Telegram bot integration enabled`);
  }
});
