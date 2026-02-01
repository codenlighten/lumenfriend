import dotenv from "dotenv";
import { queryOpenAI } from "./lib/openaiWrapper.js";

dotenv.config();

function parseArgs(argv) {
  const args = { query: null, context: null, contextFile: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--query" || arg === "-q") {
      args.query = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--context" || arg === "-c") {
      args.context = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--context-file" || arg === "-f") {
      args.contextFile = argv[i + 1];
      i += 1;
      continue;
    }
  }
  return args;
}

async function loadContext({ context, contextFile }) {
  if (contextFile) {
    const { readFile } = await import("node:fs/promises");
    const raw = await readFile(contextFile, "utf-8");
    return JSON.parse(raw);
  }
  if (context) {
    return JSON.parse(context);
  }
  return null;
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.query) {
    console.error("Missing required --query.");
    console.error("Usage: node cliQuery.js --query \"your prompt\" [--context '{\"key\":\"value\"}'] [--context-file path.json]");
    process.exit(1);
  }

  const context = await loadContext(args);
  const result = await queryOpenAI(args.query, { context });
  console.log(JSON.stringify(result, null, 2));
}

run().catch((error) => {
  console.error("CLI failed:", error);
  process.exit(1);
});
