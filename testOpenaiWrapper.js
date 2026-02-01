import dotenv from "dotenv";
import { queryOpenAI } from "./lib/openaiWrapper.js";

dotenv.config();

async function run() {
  const prompt = "Return a short greeting and set includesCode=false. Provide empty code string and missingContext as empty array.";

  const result = await queryOpenAI(prompt, {
    context: {
      purpose: "openaiWrapper.js baseAgent schema test",
      timestamp: new Date().toISOString()
    }
  });

  console.log("Result:");
  console.log(JSON.stringify(result, null, 2));
}

run().catch((error) => {
  console.error("Test failed:", error);
  process.exit(1);
});
