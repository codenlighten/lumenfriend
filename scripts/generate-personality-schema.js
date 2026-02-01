#!/usr/bin/env node

import { writeFileSync } from "node:fs";
import { queryOpenAI } from "../lib/openaiWrapper.js";
import { schemaGeneratorResponseSchema } from "../schemas/schemaGenerator.js";

const OUTPUT_PATH = "./schemas/personalitySchema.js";

const prompt = `Generate a JSON schema for a "personality" object that can evolve over time in an AI session.

Requirements:
- Must support core identity fields (name, description, version).
- Must support tone, style, values, and constraints (e.g., mustNot, shouldAvoid).
- Must support a "mutable" section for evolving preferences with timestamps.
- Must support an "audit" section for provenance: createdAt, updatedAt, updatedBy, changeLog entries.
- Must support a "compatibility" or "policy" section to capture compliance constraints.
- The schema should be strict (additionalProperties: false) and use clear descriptions.
- Return the schema as a JSON string in schemaAsString.
`;

async function main() {
  const result = await queryOpenAI(prompt, {
    schema: schemaGeneratorResponseSchema
  });

  const schemaObject = JSON.parse(result.schemaAsString);

  const fileContents = `export const personalitySchema = ${JSON.stringify(schemaObject, null, 2)};\n`;
  writeFileSync(OUTPUT_PATH, fileContents, "utf-8");

  console.log(`✓ Personality schema written to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error("Failed to generate personality schema:", err.message);
  process.exit(1);
});
