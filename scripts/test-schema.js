#!/usr/bin/env node
import dotenv from "dotenv";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { queryOpenAI } from "../lib/openaiWrapper.js";

dotenv.config();

const schemaDirUrl = new URL("../schemas/", import.meta.url);
const schemaDirPath = fileURLToPath(schemaDirUrl);

function parseArgs(argv) {
  const args = {
    schema: null,
    exportName: null,
    query: null,
    context: null,
    contextFile: null,
    list: false,
    model: null,
    temperature: null
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case "--schema":
      case "-s":
        args.schema = argv[++i];
        break;
      case "--export":
      case "-e":
        args.exportName = argv[++i];
        break;
      case "--query":
      case "-q":
        args.query = argv[++i];
        break;
      case "--context":
      case "-c":
        args.context = argv[++i];
        break;
      case "--context-file":
      case "-f":
        args.contextFile = argv[++i];
        break;
      case "--list":
        args.list = true;
        break;
      case "--model":
        args.model = argv[++i];
        break;
      case "--temperature":
        args.temperature = parseFloat(argv[++i]);
        break;
      default:
        console.error(`Unknown argument: ${arg}`);
        process.exit(1);
    }
  }

  return args;
}

async function loadContext({ context, contextFile }) {
  if (contextFile) {
    const raw = await readFile(contextFile, "utf-8");
    return JSON.parse(raw);
  }
  if (context) {
    return JSON.parse(context);
  }
  return null;
}

async function listSchemas() {
  const files = await readdir(schemaDirPath);
  files
    .filter((file) => file.endsWith(".js"))
    .map((file) => file.replace(/\.js$/u, ""))
    .sort()
    .forEach((name) => console.log(name));
}

function pickSchemaExport(module, exportName) {
  if (exportName) {
    if (!module[exportName]) {
      throw new Error(`Export ${exportName} not found in module.`);
    }
    return module[exportName];
  }

  if (module.default) {
    return module.default;
  }

  const exports = Object.entries(module);
  if (exports.length === 0) {
    throw new Error("Schema module has no exports.");
  }

  return exports[0][1];
}

function ensureQuery(query) {
  if (!query) {
    throw new Error("--query is required when not listing schemas.");
  }
  return query;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.list) {
    await listSchemas();
    return;
  }

  if (!args.schema) {
    throw new Error("--schema is required (use --list to see options).");
  }

  const schemaPath = new URL(`../schemas/${args.schema}.js`, import.meta.url);
  let schemaModule;
  try {
    schemaModule = await import(schemaPath.href);
  } catch (error) {
    throw new Error(`Failed to load schema module: ${error.message}`);
  }

  const schema = pickSchemaExport(schemaModule, args.exportName);
  const query = ensureQuery(args.query);
  const context = await loadContext(args);

  const options = { schema };
  if (context) {
    options.context = context;
  }
  if (args.model) {
    options.model = args.model;
  }
  if (typeof args.temperature === "number" && !Number.isNaN(args.temperature)) {
    options.temperature = args.temperature;
  }

  const result = await queryOpenAI(query, options);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(`Schema test failed: ${error.message}`);
  process.exit(1);
});
