#!/usr/bin/env node

// Test /api/lumen with tool router
const baseUrl = "http://localhost:3000";

async function testLumen(message, sessionId = null) {
  try {
    console.log(`\n🔍 Testing: "${message}"`);
    const response = await fetch(`${baseUrl}/api/lumen`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        message, 
        sessionId,
        memory: false 
      })
    });
    
    const result = await response.json();
    console.log(`Status: ${response.status}`);
    
    if (result.needsApproval) {
      console.log(`⚠️  Needs approval: ${result.command}`);
      console.log(`Reasoning: ${result.reasoning}`);
    } else if (result.data) {
      console.log(`Response:`, JSON.stringify(result.data, null, 2).substring(0, 300));
    } else if (result.responses) {
      const firstResponse = result.responses[0];
      console.log(`Response: ${firstResponse?.response?.substring(0, 200)}`);
      if (firstResponse?.toolUsed) {
        console.log(`✅ Tool used: ${firstResponse.toolUsed}`);
      }
    } else {
      console.log(`Raw result:`, JSON.stringify(result, null, 2).substring(0, 300));
    }
    
    return result;
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

console.log("🚀 Testing /api/lumen with Tool Router\n");

// Test 1: Should use terminal tool
await testLumen("list all files in my workspace");

// Test 2: Should use code generator
await testLumen("write a function to reverse a string");

// Test 3: Should be direct conversation
await testLumen("hello, how are you?");

console.log("\n✅ Tests complete");
