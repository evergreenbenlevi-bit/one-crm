// Run sync engine locally (has filesystem access)
// Usage: npx tsx scripts/run-sync.ts

import { readFileSync } from "fs";
// Load .env.local manually
const envContent = readFileSync(".env.local", "utf-8");
for (const line of envContent.split("\n")) {
  const match = line.match(/^([A-Z_]+)=(.+)$/);
  if (match) process.env[match[1]] = match[2];
}

import { runSync } from "../src/lib/agents/sync-engine";

async function main() {
  console.log("Starting local sync...");
  const result = await runSync();
  console.log("\nSync Results:");
  console.log(`  Agents: ${result.agents_synced}`);
  console.log(`  Skills: ${result.skills_synced}`);
  console.log(`  Crons: ${result.crons_synced}`);
  console.log(`  Edges: ${result.edges_synced}`);
  if (result.errors.length > 0) {
    console.log(`\n  Errors (${result.errors.length}):`);
    result.errors.forEach((e) => console.log(`    - ${e}`));
  }
}

main().catch(console.error);
