// Ingest Claude Code sessions into agent_runs + agent_tool_calls
// Usage: npx tsx scripts/ingest-sessions.ts [--since 24h]

import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

// Load env
const envContent = readFileSync(join(__dirname, "../.env.local"), "utf-8");
for (const line of envContent.split("\n")) {
  const match = line.match(/^([A-Z_]+)=(.+)$/);
  if (match) process.env[match[1]] = match[2];
}

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SESSIONS_DIR = join(
  process.env.HOME!,
  ".claude/projects/-Users-benlevi"
);

interface SessionSummary {
  session_id: string;
  entrypoint: string | null;
  model: string | null;
  started_at: string | null;
  ended_at: string | null;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  tool_calls: { tool_name: string; called_at: string }[];
}

function parseSession(filePath: string): SessionSummary | null {
  const lines = readFileSync(filePath, "utf-8").split("\n").filter(Boolean);
  if (lines.length < 3) return null;

  let sessionId: string | null = null;
  let entrypoint: string | null = null;
  let model: string | null = null;
  let firstTs: string | null = null;
  let lastTs: string | null = null;
  let totalIn = 0;
  let totalOut = 0;
  let cacheRead = 0;
  const toolCalls: { tool_name: string; called_at: string }[] = [];

  for (const line of lines) {
    try {
      const d = JSON.parse(line);
      const ts = d.timestamp;
      if (ts) {
        if (!firstTs) firstTs = ts;
        lastTs = ts;
      }
      if (!sessionId) sessionId = d.sessionId;
      if (!entrypoint) entrypoint = d.entrypoint;

      const msg = d.message;
      if (msg && typeof msg === "object") {
        if (!model) model = msg.model;
        const usage = msg.usage;
        if (usage) {
          totalIn += (usage.input_tokens || 0);
          totalOut += (usage.output_tokens || 0);
          cacheRead += (usage.cache_read_input_tokens || 0);
        }
        const content = msg.content;
        if (Array.isArray(content)) {
          for (const c of content) {
            if (c && c.type === "tool_use") {
              toolCalls.push({ tool_name: c.name, called_at: ts || lastTs || "" });
            }
          }
        }
      }
    } catch {
      // skip unparseable
    }
  }

  if (!sessionId) return null;

  return {
    session_id: sessionId,
    entrypoint,
    model,
    started_at: firstTs,
    ended_at: lastTs,
    input_tokens: totalIn,
    output_tokens: totalOut,
    cache_read_tokens: cacheRead,
    tool_calls: toolCalls,
  };
}

// Pricing (Opus 4.6)
function estimateCost(input: number, output: number, cacheRead: number): number {
  // $15/M input, $75/M output, $1.875/M cache read
  return (input * 15 + output * 75 + cacheRead * 1.875) / 1_000_000;
}

async function main() {
  const sinceArg = process.argv.find((a) => a === "--since");
  const sinceIdx = process.argv.indexOf("--since");
  const sinceHours = sinceIdx >= 0 ? parseInt(process.argv[sinceIdx + 1]) || 24 : 24;
  const cutoff = Date.now() - sinceHours * 3600 * 1000;

  // Find JSONL files modified since cutoff
  const files = readdirSync(SESSIONS_DIR)
    .filter((f) => f.endsWith(".jsonl"))
    .map((f) => ({ name: f, path: join(SESSIONS_DIR, f), mtime: statSync(join(SESSIONS_DIR, f)).mtimeMs }))
    .filter((f) => f.mtime > cutoff)
    .sort((a, b) => b.mtime - a.mtime);

  console.log(`Found ${files.length} sessions since ${sinceHours}h ago`);

  let ingested = 0;
  let skipped = 0;

  for (const file of files) {
    const summary = parseSession(file.path);
    if (!summary || !summary.started_at) {
      skipped++;
      continue;
    }

    // Check if already ingested
    const { data: existing } = await supabase
      .from("agent_runs")
      .select("id")
      .eq("trace_id", summary.session_id)
      .limit(1);

    if (existing && existing.length > 0) {
      skipped++;
      continue;
    }

    const durationMs = summary.ended_at && summary.started_at
      ? new Date(summary.ended_at).getTime() - new Date(summary.started_at).getTime()
      : null;

    const costUsd = estimateCost(summary.input_tokens, summary.output_tokens, summary.cache_read_tokens);

    // Determine agent_slug from entrypoint
    const agentSlug = summary.entrypoint === "sdk-py"
      ? "jarvis-bot"
      : summary.entrypoint === "claude-vscode"
        ? "claude-code-vscode"
        : "claude-code-cli";

    // Insert run
    const { data: run, error: runErr } = await supabase
      .from("agent_runs")
      .insert({
        agent_slug: agentSlug,
        trace_id: summary.session_id,
        started_at: summary.started_at,
        ended_at: summary.ended_at,
        duration_ms: durationMs,
        input_tokens: summary.input_tokens,
        output_tokens: summary.output_tokens,
        cost_usd: Math.round(costUsd * 10000) / 10000,
        status: "success",
        metadata: {
          model: summary.model,
          entrypoint: summary.entrypoint,
          tool_call_count: summary.tool_calls.length,
          cache_read_tokens: summary.cache_read_tokens,
        },
      })
      .select("id")
      .single();

    if (runErr) {
      console.error(`Error inserting run ${summary.session_id}:`, runErr.message);
      continue;
    }

    // Insert tool calls (batch, max 50)
    if (run && summary.tool_calls.length > 0) {
      const toolRows = summary.tool_calls.slice(0, 200).map((tc) => ({
        run_id: run.id,
        tool_name: tc.tool_name,
        success: true,
        called_at: tc.called_at,
      }));

      const { error: tcErr } = await supabase.from("agent_tool_calls").insert(toolRows);
      if (tcErr) console.error(`Tool calls error for ${summary.session_id}:`, tcErr.message);
    }

    ingested++;
    console.log(`  ✓ ${summary.session_id.slice(0, 8)} — ${summary.model} — ${summary.tool_calls.length} tools — $${costUsd.toFixed(4)}`);
  }

  console.log(`\nDone: ${ingested} ingested, ${skipped} skipped`);
}

main().catch(console.error);
