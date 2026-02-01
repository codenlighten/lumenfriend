import dotenv from "dotenv";
import { resolve } from "node:path";
import { queryOpenAI } from "./lib/openaiWrapper.js";
import { loadSession, saveSession, addInteraction, buildContext } from "./lib/memoryStore.js";

dotenv.config();

function parseArgs(argv) {
  const args = { session: "default", message: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--session" || arg === "-s") {
      args.session = argv[i + 1] || "default";
      i += 1;
      continue;
    }
    if (arg === "--message" || arg === "-m") {
      args.message = argv[i + 1];
      i += 1;
      continue;
    }
  }
  return args;
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.message) {
    console.error("Missing required --message.");
    console.error("Usage: node sessionChat.js --message \"your message\" [--session my-session]");
    process.exit(1);
  }

  const sessionPath = resolve("/home/greg/dev/lumenfriend/sessions", `${args.session}.json`);
  const session = await loadSession(sessionPath);

  await addInteraction(session, { role: "user", text: args.message });

  const context = buildContext(session);
  const result = await queryOpenAI(args.message, { context });

  await addInteraction(session, { role: "ai", text: result.response });
  await saveSession(sessionPath, session);

  console.log(JSON.stringify(result, null, 2));
}

run().catch((error) => {
  console.error("Session chat failed:", error);
  process.exit(1);
});
