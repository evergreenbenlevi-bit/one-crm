/**
 * Import tasks from Obsidian KANBAN.md + DASHBOARD.md into Supabase tasks table.
 *
 * Usage: npx tsx scripts/import-tasks.ts
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const VAULT_PATH = "/Users/benlevi/Library/Mobile Documents/iCloud~md~obsidian/Documents/NEW OBSIDIAN";
const KANBAN_PATH = resolve(VAULT_PATH, "08_TASKS/KANBAN.md");
const DASHBOARD_PATH = resolve(VAULT_PATH, "08_TASKS/DASHBOARD.md");

// Types matching the database
type TaskPriority = "p1" | "p2" | "p3";
type TaskStatus = "backlog" | "todo" | "in_progress" | "waiting_ben" | "done";
type TaskOwner = "claude" | "ben" | "both" | "avitar";
type TaskCategory = "one_tm" | "infrastructure" | "personal" | "research" | "content";

interface TaskInsert {
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  owner: TaskOwner;
  category: TaskCategory;
  due_date: string | null;
  source: string;
  source_date: string | null;
  position: number;
}

function parseKanban(): TaskInsert[] {
  const content = readFileSync(KANBAN_PATH, "utf-8");
  const tasks: TaskInsert[] = [];
  let currentCategory: TaskCategory = "one_tm";
  let position = 0;

  const lines = content.split("\n");

  for (const line of lines) {
    // Detect section headers
    if (line.startsWith("## 🟠 ONE")) currentCategory = "one_tm";
    else if (line.startsWith("## 🔧")) currentCategory = "infrastructure";
    else if (line.startsWith("## 🧘")) currentCategory = "personal";
    else if (line.startsWith("## 🔬")) currentCategory = "research";
    else if (line.startsWith("## ✅")) continue; // Skip completed section

    // Parse task lines
    const taskMatch = line.match(/^- \[([ x])\] (🙋|🤖|🤝|🌙) \*\*(.+?)\*\*(?:\s*—\s*(.+?))?(?:\s*#(\w+))?$/);
    if (taskMatch) {
      const [, done, ownerEmoji, title, description, tag] = taskMatch;

      if (done === "x") continue; // Skip completed

      const ownerMap: Record<string, TaskOwner> = {
        "🙋": "ben",
        "🤖": "claude",
        "🤝": "both",
        "🌙": "claude",
      };

      tasks.push({
        title: title.trim(),
        description: description?.trim() || null,
        priority: "p2",
        status: ownerEmoji === "🙋" ? "waiting_ben" : "todo",
        owner: ownerMap[ownerEmoji] || "claude",
        category: currentCategory,
        due_date: null,
        source: "kanban",
        source_date: "2026-03-18",
        position: position++,
      });
    }
  }

  return tasks;
}

function parseDashboard(): TaskInsert[] {
  const content = readFileSync(DASHBOARD_PATH, "utf-8");
  const tasks: TaskInsert[] = [];
  let currentCategory: TaskCategory = "one_tm";
  let currentOwner: TaskOwner = "claude";
  let position = 0;

  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect section headers
    if (line.includes("NEEDLE-MOVER") || line.includes("🟠 ONE")) currentCategory = "one_tm";
    else if (line.includes("🔧 תשתיות")) currentCategory = "infrastructure";
    else if (line.includes("🧘 אישי")) currentCategory = "personal";
    else if (line.includes("🔬 מחקר")) currentCategory = "research";
    else if (line.includes("✅ הושלם")) break; // Stop at completed section

    // Detect owner subsections
    if (line.includes("### ממתין לבן")) currentOwner = "ben";
    else if (line.includes("### Claude עושה")) currentOwner = "claude";

    // Parse blockquote tasks
    const blockMatch = line.match(/^>\s*(~~)?🅿️([123])\s*(?:⏰\s*(\d+\/\d+)\s*)?\*\*(.+?)\*\*(?:\s*—\s*(.+?))?$/);
    if (blockMatch) {
      const [, strikethrough, pLevel, deadline, title, description] = blockMatch;

      if (strikethrough) continue; // Skip completed (strikethrough)

      // Collect description from following lines
      let fullDesc = description?.trim() || "";
      let j = i + 1;
      while (j < lines.length && lines[j].startsWith(">") && !lines[j].match(/^>\s*🅿️/)) {
        const descLine = lines[j].replace(/^>\s*/, "").trim();
        if (descLine && !descLine.startsWith("—")) {
          fullDesc += (fullDesc ? " " : "") + descLine;
        }
        j++;
      }

      // Parse due date
      let dueDate: string | null = null;
      if (deadline) {
        const [day, month] = deadline.split("/");
        dueDate = `2026-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      }

      tasks.push({
        title: title.trim(),
        description: fullDesc || null,
        priority: `p${pLevel}` as TaskPriority,
        status: currentOwner === "ben" ? "waiting_ben" : "todo",
        owner: currentOwner,
        category: currentCategory,
        due_date: dueDate,
        source: "dashboard",
        source_date: "2026-03-18",
        position: position++,
      });
    }

    // Parse checkbox tasks
    const checkMatch = line.match(/^- \[([ x])\]\s*🅿️([123])\s*\*\*(.+?)\*\*(?:\s*—\s*(.+))?$/);
    if (checkMatch) {
      const [, done, pLevel, title, description] = checkMatch;
      if (done === "x") continue;

      tasks.push({
        title: title.trim(),
        description: description?.trim() || null,
        priority: `p${pLevel}` as TaskPriority,
        status: "todo",
        owner: "claude",
        category: currentCategory,
        due_date: null,
        source: "dashboard",
        source_date: "2026-03-18",
        position: position++,
      });
    }
  }

  return tasks;
}

function deduplicateTasks(tasks: TaskInsert[]): TaskInsert[] {
  const seen = new Set<string>();
  return tasks.filter(t => {
    const key = t.title.toLowerCase().replace(/\s+/g, " ").trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function importToSupabase(tasks: TaskInsert[]) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    // Output as JSON for manual import or API call
    console.log("No Supabase credentials found. Outputting JSON for manual import:\n");
    console.log(JSON.stringify(tasks, null, 2));
    console.log(`\nTotal: ${tasks.length} tasks`);
    return;
  }

  const supabase = createClient(url, key);

  // Clear existing imported tasks
  await supabase.from("tasks").delete().in("source", ["kanban", "dashboard"]);

  // Insert in batches of 50
  const batchSize = 50;
  let imported = 0;

  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    const { error } = await supabase.from("tasks").insert(batch);
    if (error) {
      console.error(`Error importing batch ${i / batchSize + 1}:`, error.message);
    } else {
      imported += batch.length;
    }
  }

  console.log(`Imported ${imported}/${tasks.length} tasks successfully.`);
}

async function main() {
  console.log("Parsing KANBAN.md...");
  const kanbanTasks = parseKanban();
  console.log(`  Found ${kanbanTasks.length} tasks from KANBAN.md`);

  console.log("Parsing DASHBOARD.md...");
  const dashboardTasks = parseDashboard();
  console.log(`  Found ${dashboardTasks.length} tasks from DASHBOARD.md`);

  console.log("Deduplicating...");
  const allTasks = deduplicateTasks([...dashboardTasks, ...kanbanTasks]); // Dashboard takes precedence (more metadata)
  console.log(`  ${allTasks.length} unique tasks after dedup`);

  console.log("\nBreakdown:");
  const byPriority = { p1: 0, p2: 0, p3: 0 };
  const byOwner = { claude: 0, ben: 0, both: 0, avitar: 0 };
  const byCategory = { one_tm: 0, infrastructure: 0, personal: 0, research: 0, content: 0 };

  allTasks.forEach(t => {
    byPriority[t.priority]++;
    byOwner[t.owner]++;
    byCategory[t.category]++;
  });

  console.log("  Priority:", byPriority);
  console.log("  Owner:", byOwner);
  console.log("  Category:", byCategory);

  await importToSupabase(allTasks);
}

main().catch(console.error);
