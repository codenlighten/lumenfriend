#!/usr/bin/env node

// Test baseAgentExtended universal agent
import { queryOpenAI } from "./lib/openaiWrapper.js";
import { baseAgentExtendedResponseSchema } from "./schemas/baseAgentExtended.js";

console.log("🧪 Testing Universal Agent (baseAgentExtended)\n");
console.log("=".repeat(60));

async function testUniversalAgent(query, expectedChoice) {
  console.log(`\n📝 Query: "${query}"`);
  console.log(`Expected choice: ${expectedChoice}`);
  
  try {
    const result = await queryOpenAI(query, {
      schema: baseAgentExtendedResponseSchema,
      context: {
        instruction: "Analyze the query and choose the appropriate response type: 'response' for conversation, 'code' for code generation, 'terminalCommand' for terminal operations. Only populate fields relevant to your choice."
      }
    });
    
    console.log(`\n✅ Choice made: ${result.choice}`);
    
    switch (result.choice) {
      case "response":
        console.log(`Response: ${result.response?.substring(0, 100)}...`);
        console.log(`Questions for user: ${result.questionsForUser}`);
        console.log(`Missing context: ${result.missingContext?.length || 0} items`);
        break;
        
      case "code":
        console.log(`Language: ${result.language}`);
        console.log(`Code: ${result.code?.substring(0, 100)}...`);
        console.log(`Explanation: ${result.codeExplanation?.substring(0, 100)}...`);
        break;
        
      case "terminalCommand":
        console.log(`Command: ${result.terminalCommand}`);
        console.log(`Reasoning: ${result.commandReasoning?.substring(0, 100)}...`);
        console.log(`Requires approval: ${result.requiresApproval}`);
        break;
    }
    
    console.log(`Continue: ${result.continue}`);
    
    return result;
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

// Test 1: Should choose "response"
await testUniversalAgent("How are you today?", "response");

// Test 2: Should choose "code"
await testUniversalAgent("Write a function to calculate fibonacci", "code");

// Test 3: Should choose "terminalCommand"
await testUniversalAgent("List all files in the current directory", "terminalCommand");

// Test 4: Ambiguous - let AI decide
await testUniversalAgent("I need to see my package.json file", "terminalCommand");

console.log("\n\n" + "=".repeat(60));
console.log("✅ Universal Agent Tests Complete");
