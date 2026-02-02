#!/usr/bin/env node

/**
 * Shadow Deployment Test: Simulated Memory Consolidation
 * 
 * Tests the Phase 1 consolidation system without needing 25 real interactions.
 * Validates gpt-4o synthesis quality and pillar structure.
 */

import fs from 'fs';
import path from 'path';
import { consolidateLongTermMemory } from './lib/personalityEvolver.js';
import { lumenPersonality } from './lib/lumenPersonality.js';

// Mock realistic summaries simulating ~25 interactions worth of conversation
const mockSummaries = [
  {
    range: { startId: 1, endId: 5 },
    text: "Gregory asked about deployment strategies for the Universal Agent. We discussed CapRover deployment, tarball creation, and version management. He prefers automated deployments but wants manual approval for database changes."
  },
  {
    range: { startId: 6, endId: 10 },
    text: "Deep dive into knowledge consolidation architecture. Gregory shared Gemini's 'Cliff Notes' proposal. We designed hybrid memory system with summaries + pillars. Gregory emphasized importance of preventing 'rolling window amnesia' and maintaining context continuity."
  },
  {
    range: { startId: 11, endId: 15 },
    text: "Implemented Phase 1 consolidation system. Modified personalitySchema, personalityEvolver, memoryStore. Gregory wanted gpt-4o for synthesis (not mini). Committed changes to GitHub (cc17745). He values clean git history with emoji commits."
  },
  {
    range: { startId: 16, endId: 20 },
    text: "Discussed workspace context feature. Gregory needed Lumen to adapt terminal commands to user paths (not just lumenfriend). We implemented context.workspace parameter. He works on multiple projects: lumenfriend, personal sites, client work."
  },
  {
    range: { startId: 21, endId: 25 },
    text: "Gregory prefers direct technical responses over flowery language. He appreciates concise explanations with code examples. Values testing before production. Interested in Phase 2 user profiling. Uses VS Code, Linux environment, prefers functional programming style."
  }
];

async function runSimulation() {
  console.log("🧪 Phase 1 Consolidation Simulation Test\n");
  console.log("=" .repeat(60));
  
  // Start with fresh Lumen personality (empty pillars)
  const testPersonality = {
    ...lumenPersonality,
    pillars: [],
    audit: {
      ...lumenPersonality.audit,
      changeLog: []
    }
  };
  
  console.log("\n📊 BEFORE CONSOLIDATION:");
  console.log(`Summaries: ${mockSummaries.length}`);
  console.log(`Pillars: ${testPersonality.pillars.length}`);
  
  console.log("\n📝 Input Summaries:");
  mockSummaries.forEach((s, i) => {
    console.log(`  ${i + 1}. [${s.range.startId}-${s.range.endId}]: ${s.text.slice(0, 80)}...`);
  });
  
  console.log("\n⚙️  Running consolidation with gpt-4o...\n");
  
  try {
    const startTime = Date.now();
    const evolvedPersonality = await consolidateLongTermMemory(testPersonality, mockSummaries);
    const duration = Date.now() - startTime;
    
    console.log("=" .repeat(60));
    console.log("\n✅ CONSOLIDATION SUCCESS\n");
    console.log(`⏱️  Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log(`📊 Pillars Created: ${evolvedPersonality.pillars.length}`);
    
    if (evolvedPersonality.pillars.length > 0) {
      console.log("\n🏛️  SYNTHESIZED PILLARS:\n");
      
      // Sort by importance for display
      const sortedPillars = [...evolvedPersonality.pillars]
        .sort((a, b) => b.importance - a.importance);
      
      sortedPillars.forEach((pillar, i) => {
        console.log(`  ${i + 1}. [${pillar.category}] (Importance: ${pillar.importance}/10)`);
        console.log(`     ${pillar.details}`);
        console.log(`     Updated: ${pillar.lastUpdated}\n`);
      });
    }
    
    // Check changelog
    if (evolvedPersonality.audit?.changeLog?.length > 0) {
      const latestChange = evolvedPersonality.audit.changeLog[evolvedPersonality.audit.changeLog.length - 1];
      console.log("📋 Changelog Entry:");
      console.log(`   ${latestChange.change}\n`);
    }
    
    // Quality checks
    console.log("=" .repeat(60));
    console.log("\n🔍 QUALITY VALIDATION:\n");
    
    const checks = {
      "Pillars created": evolvedPersonality.pillars.length > 0,
      "Under 15 pillar cap": evolvedPersonality.pillars.length <= 15,
      "All have categories": evolvedPersonality.pillars.every(p => p.category),
      "All have details": evolvedPersonality.pillars.every(p => p.details),
      "All have importance": evolvedPersonality.pillars.every(p => p.importance >= 1 && p.importance <= 10),
      "All have timestamps": evolvedPersonality.pillars.every(p => p.lastUpdated),
      "Changelog updated": evolvedPersonality.audit?.changeLog?.length > testPersonality.audit?.changeLog?.length
    };
    
    Object.entries(checks).forEach(([check, passed]) => {
      console.log(`   ${passed ? '✅' : '❌'} ${check}`);
    });
    
    const allPassed = Object.values(checks).every(v => v);
    
    console.log("\n" + "=" .repeat(60));
    
    if (allPassed) {
      console.log("\n🎉 All validation checks passed!");
      console.log("\n💡 RECOMMENDATION: System is ready for production deployment.");
      console.log("   Run: npm run create-tarball (or similar) to generate v4.1.0\n");
      
      // Save result for inspection
      const outputPath = '/tmp/consolidation-test-result.json';
      fs.writeFileSync(outputPath, JSON.stringify(evolvedPersonality, null, 2));
      console.log(`📄 Full result saved to: ${outputPath}\n`);
      
      return true;
    } else {
      console.log("\n⚠️  Some validation checks failed. Review output above.\n");
      return false;
    }
    
  } catch (error) {
    console.error("\n❌ CONSOLIDATION FAILED:");
    console.error(`   ${error.message}`);
    console.error("\nStack trace:");
    console.error(error.stack);
    return false;
  }
}

// Check if existing session should be used instead
const sessionDir = './sessions/lumen';
if (process.argv.includes('--use-real-session') && fs.existsSync(sessionDir)) {
  console.log("🔍 Looking for real session data...\n");
  const files = fs.readdirSync(sessionDir);
  if (files.length > 0) {
    const sessionFile = path.join(sessionDir, files[0]);
    const sessionData = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
    
    if (sessionData.summaries && sessionData.summaries.length >= 3) {
      console.log(`Found session with ${sessionData.summaries.length} summaries. Using real data.\n`);
      mockSummaries.splice(0, mockSummaries.length, ...sessionData.summaries);
    }
  }
}

runSimulation().then(success => {
  process.exit(success ? 0 : 1);
});
