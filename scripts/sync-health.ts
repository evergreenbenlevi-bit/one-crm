// Load .env.local manually (same as run-sync.ts)
import { readFileSync } from "fs";
const envContent = readFileSync(".env.local", "utf-8");
for (const line of envContent.split("\n")) {
  const match = line.match(/^([A-Z_]+)=(.+)$/);
  if (match) process.env[match[1]] = match[2];
}

/**
 * sync-health.ts
 * Batch health check for all active agents in agent_registry.
 * Runs checks based on agent type and channel:
 *   - team/bot (telegram): check if process is running
 *   - cron: check if LaunchAgent is loaded
 *   - agent/advisor/skill: mark as healthy (on-demand, no process)
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { execSync } from "child_process";


interface AgentRecord {
  slug: string;
  type: string;
  channel: string;
  config: Record<string, unknown>;
}

interface HealthEvent {
  agent_slug: string;
  status: "healthy" | "degraded" | "down" | "unknown";
  message?: string;
  response_ms?: number;
}

// Bots that run on VPS (not local Mac) — can't check with ps aux locally
const VPS_BOT_SLUGS = new Set(["jarvis", "ruti", "cmo", "cto", "mike", "sales", "doc", "cassandra"]);

function checkBotProcess(slug: string): HealthEvent {
  const start = Date.now();

  // VPS bots can't be checked locally — mark as healthy (they're monitored by system-health bot)
  if (VPS_BOT_SLUGS.has(slug)) {
    return { agent_slug: slug, status: "healthy", message: "VPS bot (remote check skipped)", response_ms: 0 };
  }

  try {
    // Check if a python/node process matching the bot name is running
    const result = execSync(`ps aux | grep -i "${slug}" | grep -v grep | wc -l`, {
      encoding: "utf-8",
      timeout: 5000,
    }).trim();
    const count = parseInt(result, 10);
    const response_ms = Date.now() - start;

    if (count > 0) {
      return { agent_slug: slug, status: "healthy", message: `${count} process(es) running`, response_ms };
    } else {
      return { agent_slug: slug, status: "down", message: "no process found", response_ms };
    }
  } catch {
    return { agent_slug: slug, status: "unknown", message: "check failed", response_ms: Date.now() - start };
  }
}

function checkCronLaunchAgent(slug: string, config: Record<string, unknown>): HealthEvent {
  const start = Date.now();
  try {
    const label = (config.label as string) || slug.replace(/^cron-/, "com.ben.");
    // Use stdio:pipe and check exit code manually — grep exits 1 on no match (not an error)
    let result = "";
    try {
      result = execSync(`launchctl list 2>/dev/null | grep -F "${label}"`, {
        encoding: "utf-8",
        timeout: 5000,
        stdio: "pipe",
      }).trim();
    } catch {
      // grep exit code 1 = no match = not loaded
      result = "";
    }
    const response_ms = Date.now() - start;

    if (result) {
      // launchctl list shows: PID  Status  Label
      const parts = result.split(/\s+/);
      const exitCode = parts[1];
      if (exitCode === "0" || parts[0] !== "-") {
        return { agent_slug: slug, status: "healthy", message: "launchd loaded", response_ms };
      } else {
        return { agent_slug: slug, status: "degraded", message: `last exit code ${exitCode}`, response_ms };
      }
    } else {
      return { agent_slug: slug, status: "down", message: "not loaded in launchd", response_ms };
    }
  } catch (e) {
    return { agent_slug: slug, status: "unknown", message: `check error: ${e}`, response_ms: Date.now() - start };
  }
}

function checkOnDemandAgent(slug: string): HealthEvent {
  // on-demand agents (skills, agents, advisors) are always healthy — they run when called
  return {
    agent_slug: slug,
    status: "healthy",
    message: "on-demand (no persistent process)",
    response_ms: 0,
  };
}

export interface HealthSyncResult {
  healthy: number;
  degraded: number;
  down: number;
  total: number;
}

export async function runHealthSync(): Promise<HealthSyncResult> {
  const supabase = createAdminClient();

  const { data: agents, error } = await supabase
    .from("agent_registry")
    .select("slug,type,channel,config")
    .eq("is_active", true);

  if (error || !agents) {
    throw new Error(`Failed to fetch agents: ${error?.message}`);
  }

  console.log(`Running health checks for ${agents.length} agents...`);

  const events: HealthEvent[] = [];

  for (const agent of agents as AgentRecord[]) {
    let event: HealthEvent;

    if (agent.channel === "telegram" || agent.type === "team") {
      event = checkBotProcess(agent.slug);
    } else if (agent.type === "cron") {
      event = checkCronLaunchAgent(agent.slug, agent.config || {});
    } else {
      // agent, skill, advisor — on-demand
      event = checkOnDemandAgent(agent.slug);
    }

    events.push(event);
  }

  // Batch insert via direct Supabase (bypass auth)
  const { error: insertError } = await supabase.from("agent_health_events").insert(
    events.map((e) => ({
      agent_slug: e.agent_slug,
      status: e.status,
      message: e.message || null,
      response_ms: e.response_ms || 0,
      checked_at: new Date().toISOString(),
    }))
  );

  if (insertError) {
    throw new Error(`Failed to insert health events: ${insertError.message}`);
  }

  const healthy = events.filter((e) => e.status === "healthy").length;
  const degraded = events.filter((e) => e.status === "degraded").length;
  const down = events.filter((e) => e.status === "down").length;

  // Print any down agents to console
  const downAgents = events.filter((e) => e.status === "down");
  if (downAgents.length > 0 && process.env.HEALTH_VERBOSE === "1") {
    console.log("\nDown agents:");
    for (const a of downAgents) {
      console.log(`  ${a.agent_slug}: ${a.message}`);
    }
  }

  return { healthy, degraded, down, total: events.length };
}

// Allow running directly
if (process.argv[1]?.endsWith("sync-health.ts")) {
  runHealthSync().then((r) => {
    console.log(`Health sync complete: healthy=${r.healthy} degraded=${r.degraded} down=${r.down}`);
    if (process.env.HEALTH_VERBOSE === "1") {
      // Re-run with verbose
    }
  }).catch(console.error);
}
