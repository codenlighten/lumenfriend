#!/usr/bin/env node

// Test updated /api/lumen with universal agent
const API_URL = "http://localhost:3000/api/lumen";

console.log("🧪 Testing /api/lumen with Universal Agent\n");
console.log("=".repeat(60));

async function testLumen(message, expectedChoice) {
  console.log(`\n📝 Query: "${message}"`);
  console.log(`Expected choice: ${expectedChoice}`);
  
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        memory: false
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    
    const result = await response.json();
    const data = result.data || result; // Handle envelope wrapper
    
    console.log(`\n✅ Response received`);
    
    if (!data.responses) {
      console.log('⚠️  No responses array found');
      console.log('Full result:', JSON.stringify(result, null, 2));
      return result;
    }
    
    console.log(`Total iterations: ${data.totalIterations}`);
    data.responses.forEach((r, i) => {
      console.log(`\n--- Response ${i + 1} ---`);
      console.log(`Type: ${r.type}`);
      console.log(`Choice: ${r.choice}`);
      
      switch (r.type) {
        case "response":
          console.log(`Response: ${r.response?.substring(0, 100)}...`);
          console.log(`Has questions: ${r.questionsForUser}`);
          console.log(`Missing context items: ${r.missingContext?.length || 0}`);
          break;
          
        case "code":
          console.log(`Language: ${r.language}`);
          console.log(`Code: ${r.code?.substring(0, 80)}...`);
          console.log(`Explanation: ${r.codeExplanation?.substring(0, 80)}...`);
          break;
          
        case "terminalCommand":
          console.log(`Command: ${r.command}`);
          console.log(`Reasoning: ${r.reasoning?.substring(0, 80)}...`);
          console.log(`Requires approval: ${r.requiresApproval}`);
          break;
      }
      
      console.log(`Continue: ${r.continue}`);
    });
    
    return result;
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

// Test 1: Conversation (should choose "response")
await testLumen("What is SmartLedger Technology?", "response");

// Test 2: Code generation (should choose "code")
await testLumen("Write a function to reverse a string", "code");

// Test 3: Terminal command (should choose "terminalCommand")
await testLumen("Show me my package.json file", "terminalCommand");

// Test 4: File listing (should choose "terminalCommand")
await testLumen("List all JavaScript files in the lib directory", "terminalCommand");

console.log("\n\n" + "=".repeat(60));
console.log("✅ Universal Agent Tests Complete");
