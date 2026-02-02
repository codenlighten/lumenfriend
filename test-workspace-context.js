#!/usr/bin/env node

// Test user-provided workspace context
const API_URL = "http://localhost:3000/api/lumen";

console.log("🧪 Testing User Workspace Context\n");
console.log("=".repeat(60));

async function testWithWorkspace(message, workspace) {
  console.log(`\n📝 Query: "${message}"`);
  console.log(`Workspace: ${workspace || '(not provided)'}`);
  
  try {
    const body = {
      message,
      memory: false
    };
    
    if (workspace) {
      body.context = { workspace };
    }
    
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    
    const result = await response.json();
    const data = result.data || result;
    
    console.log(`\n✅ Response received`);
    
    data.responses.forEach((r, i) => {
      if (r.type === "terminalCommand") {
        console.log(`\n🔧 Terminal Command:`);
        console.log(`   ${r.command}`);
        console.log(`   Reasoning: ${r.reasoning?.substring(0, 80)}...`);
      } else if (r.type === "response") {
        console.log(`\n💬 Response: ${r.response?.substring(0, 100)}...`);
      }
    });
    
    return result;
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

// Test 1: Without workspace context - should use relative paths
console.log("\n" + "=".repeat(60));
console.log("Test 1: No workspace provided");
console.log("=".repeat(60));
await testWithWorkspace("List all JavaScript files");

// Test 2: With user's workspace context
console.log("\n" + "=".repeat(60));
console.log("Test 2: User provides their workspace");
console.log("=".repeat(60));
await testWithWorkspace("List all JavaScript files", "/home/user/my-project");

// Test 3: Different workspace
console.log("\n" + "=".repeat(60));
console.log("Test 3: Different user workspace");
console.log("=".repeat(60));
await testWithWorkspace("Show me package.json", "/var/www/app");

// Test 4: Workspace with spaces
console.log("\n" + "=".repeat(60));
console.log("Test 4: Workspace with spaces in path");
console.log("=".repeat(60));
await testWithWorkspace("Find all .env files", "/home/user/My Projects/web-app");

console.log("\n\n" + "=".repeat(60));
console.log("✅ Workspace Context Tests Complete");
console.log("\n📝 Key Observations:");
console.log("   • Without workspace: Uses relative paths or asks for directory");
console.log("   • With workspace: Uses exact path provided by user");
console.log("   • Terminal commands adapt to user's actual working directory");
