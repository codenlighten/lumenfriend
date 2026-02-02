#!/usr/bin/env node

// Test /api/chat with universal agent
const API_URL = "http://localhost:3000/api/chat";

console.log("🧪 Testing /api/chat with Universal Agent\n");
console.log("=".repeat(60));

async function testChat(message, expectedChoice) {
  console.log(`\n📝 Query: "${message}"`);
  console.log(`Expected choice: ${expectedChoice}`);
  
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    
    const result = await response.json();
    const data = result.data || result;
    
    console.log(`\n✅ Response received (${data.totalIterations} iteration${data.totalIterations > 1 ? 's' : ''})`);
    console.log(`Session ID: ${data.sessionId}`);
    
    data.responses.forEach((r, i) => {
      console.log(`\n--- Response ${i + 1} (Order: ${r.order}) ---`);
      console.log(`Type: ${r.type}`);
      console.log(`Choice: ${r.choice}`);
      
      switch (r.type) {
        case "response":
          console.log(`Response: ${r.response?.substring(0, 80)}...`);
          console.log(`Has questions: ${r.questionsForUser}`);
          break;
        case "code":
          console.log(`Language: ${r.language}`);
          console.log(`Code preview: ${r.code?.substring(0, 60)}...`);
          break;
        case "terminalCommand":
          console.log(`Command: ${r.command}`);
          console.log(`Requires approval: ${r.requiresApproval}`);
          break;
      }
    });
    
    return result;
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

// Test 1: Conversation
await testChat("Hello! What can you help me with?", "response");

// Test 2: Code generation
await testChat("Create a function to sort an array", "code");

// Test 3: System command
await testChat("Show me the contents of package.json", "terminalCommand");

console.log("\n\n" + "=".repeat(60));
console.log("✅ /api/chat Universal Agent Tests Complete");
