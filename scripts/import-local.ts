/**
 * Import tasks from KANBAN.md + DASHBOARD.md into local data/tasks.json
 * Usage: npx tsx scripts/import-local.ts
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, join } from "path";
import { randomUUID } from "crypto";

const VAULT_PATH = "/Users/benlevi/Library/Mobile Documents/iCloud~md~obsidian/Documents/NEW OBSIDIAN";
const KANBAN_PATH = resolve(VAULT_PATH, "08_TASKS/KANBAN.md");
const DASHBOARD_PATH = resolve(VAULT_PATH, "08_TASKS/DASHBOARD.md");
const OUTPUT_PATH = join(process.cwd(), "data", "tasks.json");

type TaskPriority = "p1" | "p2" | "p3";
type TaskStatus = "backlog" | "todo" | "in_progress" | "waiting_ben" | "done";
type TaskOwner = "claude" | "ben" | "both" | "avitar";
type TaskCategory = "one_tm" | "infrastructure" | "personal" | "research" | "content";

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  owner: TaskOwner;
  category: TaskCategory;
  due_date: string | null;
  depends_on: string | null;
  parent_id: string | null;
  source: string;
  source_date: string | null;
  completed_at: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

function parseKanban(): Omit<Task, "id" | "created_at" | "updated_at" | "completed_at" | "depends_on" | "parent_id">[] {
  const content = readFileSync(KANBAN_PATH, "utf-8");
  const tasks: ReturnType<typeof parseKanban> = [];
  let currentCategory: TaskCategory = "one_tm";
  let position = 100; // Start after dashboard tasks

  for (const line of content.split("\n")) {
    if (line.startsWith("## 🟠 ONE")) currentCategory = "one_tm";
    else if (line.startsWith("## 🔧")) currentCategory = "infrastructure";
    else if (line.startsWith("## 🧘")) currentCategory = "personal";
    else if (line.startsWith("## 🔬")) currentCategory = "research";
    else if (line.startsWith("## ✅")) continue;

    const m = line.match(/^- \[([ x])\] (🙋|🤖|🤝|🌙) \*\*(.+?)\*\*(?:\s*—\s*(.+?))?(?:\s*#\w+)?$/);
    if (m && m[1] !== "x") {
      const ownerMap: Record<string, TaskOwner> = { "🙋": "ben", "🤖": "claude", "🤝": "both", "🌙": "claude" };
      tasks.push({
        title: m[3].trim(),
        description: m[4]?.trim() || null,
        priority: "p2",
        status: m[2] === "🙋" ? "waiting_ben" : "todo",
        owner: ownerMap[m[2]] || "claude",
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

function parseDashboard(): Omit<Task, "id" | "created_at" | "updated_at" | "completed_at" | "depends_on" | "parent_id">[] {
  const content = readFileSync(DASHBOARD_PATH, "utf-8");
  const tasks: ReturnType<typeof parseDashboard> = [];
  let currentCategory: TaskCategory = "one_tm";
  let currentOwner: TaskOwner = "claude";
  let position = 0;

  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes("NEEDLE-MOVER") || line.includes("🟠 ONE")) currentCategory = "one_tm";
    else if (line.includes("🔧 תשתיות")) currentCategory = "infrastructure";
    else if (line.includes("🧘 אישי")) currentCategory = "personal";
    else if (line.includes("🔬 מחקר")) currentCategory = "research";
    else if (line.includes("✅ הושלם")) break;

    if (line.includes("### ממתין לבן")) currentOwner = "ben";
    else if (line.includes("### Claude עושה")) currentOwner = "claude";

    // Match priority lines - handle unicode emoji
    const pMatch = line.match(/^>\s*(~~)?.*?[🅿️P].*?([123])\s*(?:⏰\s*(\d+\/\d+)\s*)?\*\*(.+?)\*\*(?:\s*—\s*(.+?))?$/);
    if (pMatch && !pMatch[1]) {
      const [, , pLevel, deadline, title, desc] = pMatch;

      let fullDesc = desc?.trim() || "";
      let j = i + 1;
      while (j < lines.length && lines[j].startsWith(">") && !lines[j].match(/[🅿️P].*?[123]\s*\*\*/)) {
        const d = lines[j].replace(/^>\s*/, "").trim();
        if (d && !d.startsWith("—") && !d.startsWith("נוסף") && !d.startsWith("עודכן")) {
          fullDesc += (fullDesc ? " " : "") + d;
        }
        j++;
      }

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
  }
  return tasks;
}

// Run
const kanban = parseKanban();
const dashboard = parseDashboard();
console.log(`Kanban: ${kanban.length}, Dashboard: ${dashboard.length}`);

// Dedup: dashboard wins (more metadata)
const seen = new Set<string>();
const all = [...dashboard, ...kanban].filter(t => {
  const key = t.title.toLowerCase().replace(/\s+/g, " ").trim();
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

// Convert to full Task objects
const now = new Date().toISOString();
const tasks: Task[] = all.map(t => ({
  ...t,
  id: randomUUID(),
  depends_on: null,
  parent_id: null,
  completed_at: null,
  created_at: now,
  updated_at: now,
}));

writeFileSync(OUTPUT_PATH, JSON.stringify(tasks, null, 2), "utf-8");
console.log(`\nWritten ${tasks.length} tasks to ${OUTPUT_PATH}`);
console.log("Priority:", { p1: tasks.filter(t => t.priority === "p1").length, p2: tasks.filter(t => t.priority === "p2").length, p3: tasks.filter(t => t.priority === "p3").length });
console.log("Owner:", { claude: tasks.filter(t => t.owner === "claude").length, ben: tasks.filter(t => t.owner === "ben").length, both: tasks.filter(t => t.owner === "both").length });
