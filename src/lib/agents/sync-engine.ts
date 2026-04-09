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

  // 4. Discover edges from agent files, REGISTRY.md, and cron scripts
  try {
    const edges = await discoverEdges();

    // Clear existing edges and re-insert
    await supabase.from("agent_edges").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // Get all known slugs for validation
    const { data: allAgents } = await supabase.from("agent_registry").select("slug");
    const knownSlugs = new Set((allAgents || []).map((a) => a.slug));

    for (const edge of edges) {
      if (knownSlugs.has(edge.source) && knownSlugs.has(edge.target)) {
        await supabase.from("agent_edges").upsert(
          { source_slug: edge.source, target_slug: edge.target, relation: edge.relation },
          { onConflict: "source_slug,target_slug,relation" }
        );
        result.edges_synced++;
      }
    }
  } catch (e) {
    result.errors.push(`edge discovery: ${e instanceof Error ? e.message : String(e)}`);
  }

  return result;
}

interface RawEdge {
  source: string;
  target: string;
  relation: "dispatches" | "uses_skill" | "triggers_cron" | "monitors" | "feeds";
}

/**
 * Discover edges from multiple sources:
 * 1. Agent .md files → subagent_type="X" patterns → "dispatches"
 * 2. REGISTRY.md team table → parent→child → "dispatches"
 * 3. Cron plist scripts → agent references → "triggers_cron"
 */
async function discoverEdges(): Promise<RawEdge[]> {
  const edgeMap = new Map<string, RawEdge>(); // dedup key → edge
  const addEdge = (e: RawEdge) => {
    const key = `${e.source}→${e.target}→${e.relation}`;
    edgeMap.set(key, e);
  };

  // Source 1: Scan agent .md files for Agent(subagent_type="X") patterns
  try {
    const files = await readdir(AGENTS_DIR);
    const mdFiles = files.filter((f) => f.endsWith(".md") && !f.startsWith("_") && f !== "REGISTRY.md");

    for (const file of mdFiles) {
      try {
        const content = await readFile(join(AGENTS_DIR, file), "utf-8");
        const parentSlug = file.replace(/\.md$/, "");

        // Match: subagent_type="X", subagent_type: "X", Agent(subagent_type="X"
        const subagentMatches = content.matchAll(/subagent_type\s*[=:]\s*["']([a-z][\w-]*)["']/g);
        for (const m of subagentMatches) {
          const childSlug = m[1].toLowerCase();
          if (childSlug !== parentSlug) {
            addEdge({ source: parentSlug, target: childSlug, relation: "dispatches" });
          }
        }
      } catch {
        // Skip unreadable files
      }
    }
  } catch {
    // agents dir missing
  }

  // Source 2: REGISTRY.md team table — | **Name** | role | channel | sub-agents |
  try {
    const registryContent = await readFile(join(AGENTS_DIR, "REGISTRY.md"), "utf-8");

    const teamRows = registryContent.matchAll(/\|\s*\*\*(\w+)\*\*\s*\|[^|]*\|[^|]*\|\s*([^|]+)\|/g);
    for (const row of teamRows) {
      const parent = row[1].toLowerCase();
      const children = row[2]
        .split(/[,،]/)
        .map((s) => s.trim().replace(/[*[\]]/g, "").toLowerCase().replace(/\s+/g, "-"))
        .filter((s) => s && s !== "—" && s !== "הכל" && s.length > 1);

      for (const child of children) {
        addEdge({ source: parent, target: child, relation: "dispatches" });
      }
    }
  } catch {
    // No REGISTRY.md
  }

  // Source 3: Cron plist scripts → scan for agent slug references
  try {
    const files = await readdir(LAUNCH_AGENTS_DIR);
    const plists = files.filter((f) => f.startsWith("com.ben.") && f.endsWith(".plist"));

    for (const file of plists) {
      try {
        const content = await readFile(join(LAUNCH_AGENTS_DIR, file), "utf-8");
        const cronSlug = `cron-${file.replace(/^com\.ben\./, "").replace(/\.plist$/, "")}`;

        // Extract all script paths from plist
        const allStrings = [...content.matchAll(/<string>([^<]+)<\/string>/g)].map((m) => m[1]);
        const scriptPaths = allStrings.filter((s) => s.includes("/") && (s.endsWith(".sh") || s.endsWith(".py") || s.endsWith(".ts")));

        for (const scriptPath of scriptPaths) {
          const scriptName = scriptPath.split("/").pop()?.replace(/^run-/, "").replace(/\.\w+$/, "");
          if (scriptName) {
            addEdge({ source: cronSlug, target: scriptName, relation: "triggers_cron" });
          }

          // Read the actual script file to find agent references
          try {
            const scriptContent = await readFile(scriptPath, "utf-8");
            // Look for agent slugs in script: --agent X, subagent_type="X", Agent(..."X"...)
            const agentRefs = scriptContent.matchAll(/(?:--agent|subagent_type[=:]\s*["']|agents\/|agent=)([a-z][\w-]*)/g);
            for (const m of agentRefs) {
              addEdge({ source: cronSlug, target: m[1], relation: "triggers_cron" });
            }
          } catch {
            // Script not readable
          }
        }

        // Check for bot2 plist pattern: com.ben.bot2.cmo.plist → triggers "cmo"
        const bot2Match = file.match(/^com\.ben\.bot2\.([^.]+)\.plist$/);
        if (bot2Match) {
          addEdge({ source: cronSlug, target: bot2Match[1], relation: "triggers_cron" });
        }

        // Check for claude plist pattern: com.ben.claude.morning-briefer.plist → triggers "morning-briefer"
        const claudeMatch = file.match(/^com\.ben\.claude\.([^.]+)\.plist$/);
        if (claudeMatch) {
          addEdge({ source: cronSlug, target: claudeMatch[1], relation: "triggers_cron" });
        }
      } catch {
        // Skip unreadable plists
      }
    }
  } catch {
    // No launch agents dir
  }

  // Source 4: Skill .md files that dispatch to agents
  try {
    const skillDirs = await readdir(SKILLS_DIR);
    for (const dir of skillDirs) {
      try {
        const content = await readFile(join(SKILLS_DIR, dir, "SKILL.md"), "utf-8").catch(() => null);
        if (!content) continue;

        const skillSlug = `skill-${dir}`;
        const subagentMatches = content.matchAll(/subagent_type\s*[=:]\s*["']([a-z][\w-]*)["']/g);
        for (const m of subagentMatches) {
          addEdge({ source: skillSlug, target: m[1], relation: "dispatches" });
        }
      } catch {
        // Skip
      }
    }
  } catch {
    // Skills dir missing
  }

  // Source 5: Agent .md files referencing other known agent slugs in prose
  // (catches "routes to X", "spawns X agent", "delegates to X")
  try {
    const files = await readdir(AGENTS_DIR);
    const mdFiles = files.filter((f) => f.endsWith(".md") && !f.startsWith("_") && f !== "REGISTRY.md");
    const allSlugs = new Set(mdFiles.map((f) => f.replace(/\.md$/, "")));

    for (const file of mdFiles) {
      try {
        const content = await readFile(join(AGENTS_DIR, file), "utf-8");
        const parentSlug = file.replace(/\.md$/, "");

        // Look for references to other known agent slugs preceded by dispatch-like verbs
        for (const slug of allSlugs) {
          if (slug === parentSlug || slug.length < 3) continue;
          // Match "spawns researcher", "routes to researcher", "dispatches researcher"
          const pattern = new RegExp(`(?:spawns?|routes?\\s+to|dispatches?|delegates?\\s+to|calls?)\\s+${slug.replace(/-/g, "[- ]")}`, "i");
          if (pattern.test(content)) {
            addEdge({ source: parentSlug, target: slug, relation: "dispatches" });
          }
        }
      } catch {
        // Skip
      }
    }
  } catch {
    // agents dir missing
  }

  // Source 6: Agent .md files referencing skills via /skill-name or Skill("skill-name")
  try {
    const files = await readdir(AGENTS_DIR);
    const mdFiles = files.filter((f) => f.endsWith(".md") && !f.startsWith("_") && f !== "REGISTRY.md");
    const skillDirs = new Set(
      (await readdir(SKILLS_DIR).catch(() => [] as string[]))
    );

    for (const file of mdFiles) {
      try {
        const content = await readFile(join(AGENTS_DIR, file), "utf-8");
        const agentSlug = file.replace(/\.md$/, "");

        // Match /skill-name or Skill("skill-name") patterns
        const skillRefs = content.matchAll(/(?:\/|Skill\s*\(\s*["'])([a-z][\w-]*)["')\s]/g);
        for (const m of skillRefs) {
          const skillName = m[1];
          if (skillDirs.has(skillName)) {
            addEdge({ source: agentSlug, target: `skill-${skillName}`, relation: "uses_skill" });
          }
        }
      } catch {
        // Skip
      }
    }
  } catch {
    // dirs missing
  }

  // Source 7: Cron scripts that reference agent slugs by name (broader matching)
  try {
    const files = await readdir(AGENTS_DIR);
    const agentSlugs = new Set(
      files.filter((f) => f.endsWith(".md") && !f.startsWith("_") && f !== "REGISTRY.md")
        .map((f) => f.replace(/\.md$/, ""))
    );

    const cronFiles = await readdir(LAUNCH_AGENTS_DIR).catch(() => [] as string[]);
    const plists = cronFiles.filter((f) => f.startsWith("com.ben.") && f.endsWith(".plist"));

    for (const file of plists) {
      try {
        const content = await readFile(join(LAUNCH_AGENTS_DIR, file), "utf-8");
        const cronSlug = `cron-${file.replace(/^com\.ben\./, "").replace(/\.plist$/, "")}`;

        // Check if plist references any known agent slug in its strings
        for (const slug of agentSlugs) {
          if (slug.length < 4) continue;
          if (content.includes(slug) && slug !== cronSlug.replace("cron-", "")) {
            addEdge({ source: cronSlug, target: slug, relation: "triggers_cron" });
          }
        }
      } catch {
        // Skip
      }
    }
  } catch {
    // No launch agents dir
  }

  return Array.from(edgeMap.values());
}
