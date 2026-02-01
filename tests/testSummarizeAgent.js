import dotenv from "dotenv";
import { queryOpenAI } from "../lib/openaiWrapper.js";
import { summarizeAgentResponseSchema } from "../schemas/summarizeAgent.js";

dotenv.config();

async function run() {
  const query = "Summarize the provided context in 2-3 sentences.";
  const context = {
    title: "Weekly Project Update",
    text: "This week we shipped the CLI for querying the OpenAI wrapper with optional context. We also fixed the base agent schema by adding items to the questions array and correcting required fields. Next week we plan to add a small Express API endpoint and improve error handling around invalid JSON context."
  };

  const result = await queryOpenAI(query, {
    context,
    schema: summarizeAgentResponseSchema
  });

  console.log("Result:");
  console.log(JSON.stringify(result, null, 2));
}

run().catch((error) => {
  console.error("Summarize agent test failed:", error);
  process.exit(1);
});
