const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

const sessions = new Map();

function createSession() {
  return {
    interactions: [],
    summaries: [],
    nextId: 1,
    personality: null,
    personalityEvolutionEnabled: true,
    personalityImmutable: false
  };
}

export function getSession(sessionId) {
  const entry = sessions.get(sessionId);
  if (entry && Date.now() - entry.updatedAt < ONE_WEEK_MS) {
    return entry.session;
  }

  const fresh = createSession();
  sessions.set(sessionId, { session: fresh, updatedAt: Date.now() });
  return fresh;
}

export function touchSession(sessionId, session) {
  sessions.set(sessionId, { session, updatedAt: Date.now() });
}

export function startCleanupTimer() {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [sessionId, entry] of sessions.entries()) {
      if (now - entry.updatedAt >= ONE_WEEK_MS) {
        sessions.delete(sessionId);
      }
    }
  }, CLEANUP_INTERVAL_MS);

  if (typeof timer.unref === "function") {
    timer.unref();
  }
}
