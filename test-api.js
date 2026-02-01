#!/usr/bin/env node

// Test tool routing system
import { routeToTool, executeTool, formatToolOutput, AVAILABLE_TOOLS } from "./lib/toolRouter.js";

console.log("🚀 Testing Tool Router System\n");
console.log("=" .repeat(60));

// Test 1: Route query to terminal
console.log("\n📍 TEST 1: Route 'show me my files' → should pick terminal");
try {
  const decision1 = await routeToTool("show me all the files in my workspace");
  console.log("✅ Routing decision:", JSON.stringify(decision1, null, 2));
  
  if (decision1.shouldInvokeTool) {
    const tool = AVAILABLE_TOOLS[decision1.chosenToolIndex];
    console.log(`\n🔧 Executing tool: ${tool.name}`);
    
    const result = await executeTool(tool, "List all files in workspace", {
      workspacePath: "/home/greg/dev/lumenfriend"
    });
    
    console.log("✅ Tool result:", JSON.stringify(result.data, null, 2).substring(0, 300));
  }
} catch (error) {
  console.error("❌ Test 1 failed:", error.message);
}

// Test 2: Route query to code generator
console.log("\n\n📍 TEST 2: Route 'write a function' → should pick code-generator");
try {
  const decision2 = await routeToTool("write me a function to calculate fibonacci");
  console.log("✅ Routing decision:", JSON.stringify(decision2, null, 2));
  
  if (decision2.shouldInvokeTool) {
    const tool = AVAILABLE_TOOLS[decision2.chosenToolIndex];
    console.log(`\n🔧 Executing tool: ${tool.name}`);
    
    const result = await executeTool(tool, "Write a function to calculate fibonacci");
    console.log("✅ Tool result:", JSON.stringify(result.data, null, 2).substring(0, 300));
  }
} catch (error) {
  console.error("❌ Test 2 failed:", error.message);
}

// Test 3: Direct response
console.log("\n\n📍 TEST 3: Route 'how are you' → should pick direct-response");
try {
  const decision3 = await routeToTool("how are you doing today?");
  console.log("✅ Routing decision:", JSON.stringify(decision3, null, 2));
} catch (error) {
  console.error("❌ Test 3 failed:", error.message);
}

console.log("\n\n" + "=".repeat(60));
console.log("✅ Tool Router Tests Complete");
