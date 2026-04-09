// Sync Engine: scans filesystem for agents, bots, skills, crons → upserts to Supabase

import { parseAgentMd } from "./parse-agent-md";
import { parsePlistXml } from "./parse-plist";
import type { AgentType } from "@/lib/types/agents";
import { createAdminClient } from "@/lib/supabase/admin";
import { readdir, readFile } from "fs/promises";
import { join } from "path";

const AGENTS_DIR = process.env.HOME + "/.claude/agents";
const SKILLS_DIR = process.env.HOME + "/.claude/skills";
const LAUNCH_AGENTS_DIR = process.env.HOME + "/Library/LaunchAgents";

// Team members (have personality, telegram bots)
const TEAM_SLUGS = new Set(["jarvis", "ruti", "cmo", "cto", "sales", "mike"]);

// Advisor slugs
const ADVISOR_SLUGS = new Set(["tom-young", "spiritual-team", "bull-bear-judge", "devils-advocate"]);

interface SyncResult {
  agents_synced: number;
  skills_synced: number;
  crons_synced: number;
  edges_synced: number;
  errors: string[];
}

export async function runSync(): Promise<SyncResult> {
  const supabase = createAdminClient();
  const result: SyncResult = { agents_synced: 0, skills_synced: 0, crons_synced: 0, edges_synced: 0, errors: [] };

  // 1. Scan agent .md files
  try {
    const files = await readdir(AGENTS_DIR);
    const mdFiles = files.filter((f) => f.endsWith(".md") && !f.startsWith("_") && !f.includes("deprecated") && f !== "REGISTRY.md");

    for (const file of mdFiles) {
      try {
        const content = await readFile(join(AGENTS_DIR, file), "utf-8");
        const parsed = parseAgentMd(content, join(AGENTS_DIR, file));
        if (!parsed) continue;

        let type: AgentType = "agent";
        if (TEAM_SLUGS.has(parsed.slug)) type = "team";
        else if (ADVISOR_SLUGS.has(parsed.slug)) type = "advisor";

        const channel = TEAM_SLUGS.has(parsed.slug) ? "telegram" : "claude-code";

        await supabase.from("agent_registry").upsert(
          {
            slug: parsed.slug,
            name: parsed.name,
            type,
            model: parsed.model,
            channel,
            description: parsed.description || null,
            file_path: parsed.file_path,
            config: { tools: parsed.tools, color: parsed.color },
            is_active: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "slug" }
        );
        result.agents_synced++;
      } catch (e) {
        result.errors.push(`agent ${file}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  } catch (e) {
    result.errors.push(`agents dir: ${e instanceof Error ? e.message : String(e)}`);
  }

  // 2. Scan skills
  try {
    const skillDirs = await readdir(SKILLS_DIR);
    for (const dir of skillDirs) {
      try {
        const skillFile = join(SKILLS_DIR, dir, "SKILL.md");
        const content = await readFile(skillFile, "utf-8").catch(() => null);
        if (!content) continue;

        const nameMatch = content.match(/^#\s+(.+)/m);
        const descMatch = content.match(/(?:^|\n)(?:description|>)\s*[:\-]?\s*(.+)/im);

        await supabase.from("agent_registry").upsert(
          {
            slug: `skill-${dir}`,
            name: nameMatch ? nameMatch[1].trim() : dir,
            type: "skill" as AgentType,
            model: null,
            channel: "internal",
            description: descMatch ? descMatch[1].trim().slice(0, 200) : null,
            file_path: skillFile,
            config: {},
            is_active: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "slug" }
        );
        result.skills_synced++;
      } catch {
        // Skip unreadable skill dirs
      }
    }
  } catch (e) {
    result.errors.push(`skills dir: ${e instanceof Error ? e.message : String(e)}`);
  }

  // 3. Scan LaunchAgent plists (com.ben.* only)
  try {
    const files = await readdir(LAUNCH_AGENTS_DIR);
    const plists = files.filter((f) => f.startsWith("com.ben.") && f.endsWith(".plist"));

    for (const file of plists) {
      try {
        const content = await readFile(join(LAUNCH_AGENTS_DIR, file), "utf-8");
        const parsed = parsePlistXml(content);
        if (!parsed) continue;

        await supabase.from("agent_registry").upsert(
          {
            slug: `cron-${parsed.label.replace(/^com\.ben\./, "")}`,
            name: parsed.label.replace(/^com\.ben\.claude\./, "").replace(/-/g, " "),
            type: "cron" as AgentType,
            model: null,
            channel: "cron",
            description: `${parsed.schedule} → ${parsed.script_path.split("/").pop()}`,
            file_path: join(LAUNCH_AGENTS_DIR, file),
            config: {
              label: parsed.label,
              script_path: parsed.script_path,
              schedule: parsed.schedule,
              stdout_path: parsed.stdout_path,
              stderr_path: parsed.stderr_path,
            },
            is_active: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "slug" }
        );
        result.crons_synced++;
      } catch (e) {
        result.errors.push(`plist ${file}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  } catch (e) {
    result.errors.push(`launch agents dir: ${e instanceof Error ? e.message : String(e)}`);
  }

  // 4. Parse REGISTRY.md for edges
  try {
    const registryContent = await readFile(join(AGENTS_DIR, "REGISTRY.md"), "utf-8");
    const edges = parseRegistryEdges(registryContent);

    // Clear existing edges and re-insert
    await supabase.from("agent_edges").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    for (const edge of edges) {
      // Verify both slugs exist
      const { data: source } = await supabase.from("agent_registry").select("slug").eq("slug", edge.source).single();
      const { data: target } = await supabase.from("agent_registry").select("slug").eq("slug", edge.target).single();

      if (source && target) {
        await supabase.from("agent_edges").upsert(
          { source_slug: edge.source, target_slug: edge.target, relation: edge.relation },
          { onConflict: "source_slug,target_slug,relation" }
        );
        result.edges_synced++;
      }
    }
  } catch (e) {
    result.errors.push(`registry edges: ${e instanceof Error ? e.message : String(e)}`);
  }

  return result;
}

interface RawEdge {
  source: string;
  target: string;
  relation: "dispatches" | "uses_skill" | "triggers_cron" | "monitors" | "feeds";
}

function parseRegistryEdges(content: string): RawEdge[] {
  const edges: RawEdge[] = [];

  // Parse "Sub-agents" column from team table: | **Jarvis** | ... | agent1, agent2 |
  const teamRows = content.matchAll(/\|\s*\*\*(\w+)\*\*\s*\|[^|]*\|[^|]*\|\s*([^|]+)\|/g);
  for (const row of teamRows) {
    const parent = row[1].toLowerCase();
    const children = row[2]
      .split(",")
      .map((s) => s.trim().replace(/[*]/g, "").toLowerCase())
      .filter((s) => s && s !== "—" && s.length > 1);

    for (const child of children) {
      edges.push({ source: parent, target: child, relation: "dispatches" });
    }
  }

  // Parse "כלים שקטים" table: | Research | agent1, agent2, ... |
  const toolRows = content.matchAll(/\|\s*\w[\w\s]*\|\s*([^|]+)\|/g);
  for (const row of toolRows) {
    const agents = row[1]
      .split(",")
      .map((s) => s.trim().toLowerCase().replace(/\s+/g, "-"))
      .filter((s) => s && s.length > 1 && !s.includes("---"));

    // These are standalone agents, no parent edge needed here
    // (parent edges come from the team table above)
  }

  return edges;
}
