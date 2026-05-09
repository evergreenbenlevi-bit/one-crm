/**
 * Seed BENLEVI-MASTER hierarchy into ONE-CRM projects + tasks tables.
 *
 * Usage: npx tsx scripts/seed-master-plan.ts
 * Requires: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 *
 * Creates:
 *   - 1 parent project: BENLEVI-MASTER
 *   - 4 child projects: BEN-BRAND, BEN-TRAININGS, EDEN, CONTENT
 *   - Tasks from dispatch-queue.md with phase field set
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DISPATCH_QUEUE_PATH = resolve(
  "/Users/benlevi/Projects/BENLEVI-MASTER/_reference/dispatch-queue.md"
);

// ─── Project definitions ───────────────────────────────────────────────────

const PARENT_PROJECT = {
  title: "BENLEVI-MASTER",
  description: "האב של כל העסקים — portfolio parent",
  status: "active" as const,
  priority: "p1" as const,
  portfolio: "benlevi-master",
  owner: "ben" as const,
  position: 0,
};

const CHILD_PROJECTS = [
  {
    title: "BEN-BRAND",
    description: "Positioning, identity, persona, brand IP",
    status: "active" as const,
    priority: "p1" as const,
    portfolio: "benlevi-master",
    owner: "ben" as const,
    position: 1,
  },
  {
    title: "BEN-TRAININGS",
    description: "הדרכות דגל — ADHD-IP, courses solo",
    status: "active" as const,
    priority: "p1" as const,
    portfolio: "benlevi-master",
    owner: "ben" as const,
    position: 2,
  },
  {
    title: "EDEN",
    description: "שותפות עם אביתר — Course, CRM, Portal, Launch",
    status: "active" as const,
    priority: "p1" as const,
    portfolio: "benlevi-master",
    owner: "both" as const,
    position: 3,
  },
  {
    title: "CONTENT",
    description: "YouTube, Reels, Instagram, production",
    status: "active" as const,
    priority: "p2" as const,
    portfolio: "benlevi-master",
    owner: "ben" as const,
    position: 4,
  },
];

// ─── Parse dispatch queue for tasks ───────────────────────────────────────

function parseDispatchQueue(): Array<{
  title: string;
  phase: string;
  priority: "p1" | "p2" | "p3";
  projectKey: "BEN-BRAND" | "BEN-TRAININGS" | "EDEN" | "CONTENT" | "BENLEVI-MASTER";
  status: "todo" | "in_progress";
}> {
  try {
    const content = readFileSync(DISPATCH_QUEUE_PATH, "utf-8");
    const tasks: ReturnType<typeof parseDispatchQueue> = [];

    // Parse STATUS table rows
    const tableMatch = content.match(/\| # \| משימה \|.*?\n\|[-|]+\|\n([\s\S]*?)(?=\n---|\n##|$)/);
    if (!tableMatch) return tasks;

    const rows = tableMatch[1].split("\n").filter((l) => l.startsWith("| ") && !l.startsWith("| #"));

    for (const row of rows) {
      const cols = row.split("|").map((c) => c.trim()).filter(Boolean);
      if (cols.length < 5) continue;

      const [num, title, status, priority, workspace] = cols;

      // Map priority
      const p: "p1" | "p2" | "p3" =
        priority === "P1" ? "p1" : priority === "P2" ? "p2" : "p3";

      // Map status
      const s: "todo" | "in_progress" =
        status === "IN-PROGRESS" ? "in_progress" : "todo";

      // Map workspace → project
      const ws = workspace.toUpperCase();
      let projectKey: ReturnType<typeof parseDispatchQueue>[0]["projectKey"] = "BENLEVI-MASTER";
      if (ws.includes("BEN-BRAND")) projectKey = "BEN-BRAND";
      else if (ws.includes("BEN-TRAININGS")) projectKey = "BEN-TRAININGS";
      else if (ws.includes("EDEN") || ws.includes("ONE-COURSE") || ws.includes("EDEN-CRM")) projectKey = "EDEN";
      else if (ws.includes("CONTENT")) projectKey = "CONTENT";

      // Phase from priority
      const phase = p === "p1" ? "P1 — Active" : p === "p2" ? "P2 — Next" : "P3 — Backlog";

      tasks.push({ title, phase, priority: p, projectKey, status: s });
    }

    return tasks;
  } catch (e) {
    console.warn("Could not parse dispatch queue:", e);
    return [];
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding BENLEVI-MASTER hierarchy...\n");

  // 1. Check if parent already exists
  const { data: existing } = await supabase
    .from("projects")
    .select("id, title")
    .eq("portfolio", "benlevi-master")
    .limit(1);

  if (existing && existing.length > 0) {
    console.log("⚠️  benlevi-master projects already exist. Run with --force to overwrite.");
    const forceFlag = process.argv.includes("--force");
    if (!forceFlag) {
      console.log("Exiting. Use: npx tsx scripts/seed-master-plan.ts --force");
      process.exit(0);
    }
    console.log("--force detected. Deleting existing benlevi-master projects...");
    await supabase.from("projects").delete().eq("portfolio", "benlevi-master");
  }

  // 2. Insert parent project
  const { data: parent, error: parentErr } = await supabase
    .from("projects")
    .insert(PARENT_PROJECT)
    .select()
    .single();

  if (parentErr || !parent) {
    console.error("❌ Failed to create parent project:", parentErr);
    process.exit(1);
  }
  console.log(`✅ Parent: ${parent.title} (${parent.id})`);

  // 3. Insert child projects
  const childInserts = CHILD_PROJECTS.map((c) => ({
    ...c,
    parent_project_id: parent.id,
  }));

  const { data: children, error: childErr } = await supabase
    .from("projects")
    .insert(childInserts)
    .select();

  if (childErr || !children) {
    console.error("❌ Failed to create child projects:", childErr);
    process.exit(1);
  }
  console.log(`✅ Children: ${children.map((c) => c.title).join(", ")}`);

  // Build project ID map
  const projectMap: Record<string, string> = {
    "BENLEVI-MASTER": parent.id,
  };
  for (const child of children) {
    projectMap[child.title] = child.id;
  }

  // 4. Parse dispatch queue + insert tasks
  const dispatchTasks = parseDispatchQueue();
  console.log(`\n📋 Found ${dispatchTasks.length} tasks from dispatch queue`);

  if (dispatchTasks.length > 0) {
    const taskInserts = dispatchTasks.map((t, i) => ({
      title: t.title,
      description: null,
      priority: t.priority,
      status: t.status,
      owner: "ben" as const,
      category: "infrastructure" as const,
      phase: t.phase,
      project_id: projectMap[t.projectKey] ?? parent.id,
      position: i,
    }));

    const { data: insertedTasks, error: taskErr } = await supabase
      .from("tasks")
      .insert(taskInserts)
      .select();

    if (taskErr) {
      console.error("❌ Failed to insert tasks:", taskErr);
    } else {
      console.log(`✅ Tasks inserted: ${insertedTasks?.length ?? 0}`);
    }
  }

  console.log("\n🎉 Seed complete!");
  console.log(`   Parent: ${parent.id}`);
  console.log(`   Children: ${children.length}`);
  console.log(`   Tasks: ${dispatchTasks.length}`);
  console.log("\nVerify: GET /api/projects?portfolio=benlevi-master");
}

main().catch(console.error);
