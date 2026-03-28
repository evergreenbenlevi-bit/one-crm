"use client";

import { useState } from "react";
import { X, Upload, FileText, Check, AlertCircle } from "lucide-react";
import { clsx } from "clsx";
import type { TaskPriority, TaskOwner, TaskCategory, TaskStatus } from "@/lib/types/tasks";
import { ownerIcons, categoryLabels, priorityLabels } from "@/lib/types/tasks";

interface ParsedTask {
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  owner: TaskOwner;
  category: TaskCategory;
  source: string;
  selected: boolean;
}

interface TaskImportModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (count: number) => void;
}

// Map Obsidian KANBAN sections to CRM categories (3-pillar system)
const SECTION_TO_CATEGORY: Record<string, TaskCategory> = {
  "ONE™": "one_tm",
  "ONE": "one_tm",
  "דחוף": "one_tm",
  "מציאת העצמי": "self",
  "פרופיל": "brand",
  "תוכן": "brand",
  "מחקר": "research",
  "זמני": "temp",
};

function detectCategory(sectionTitle: string): TaskCategory {
  for (const [key, cat] of Object.entries(SECTION_TO_CATEGORY)) {
    if (sectionTitle.includes(key)) return cat;
  }
  return "one_tm";
}

function detectOwner(line: string): TaskOwner {
  if (line.includes("🤖")) return "claude";
  if (line.includes("🙋")) return "ben";
  if (line.includes("🤝")) return "both";
  if (line.includes("👤")) return "avitar";
  return "claude";
}

function detectPriority(line: string, sectionTitle: string): TaskPriority {
  if (sectionTitle.includes("דחוף")) return "p1";
  if (line.includes("#p1") || line.includes("P1")) return "p1";
  if (line.includes("#p3") || line.includes("P3")) return "p3";
  return "p2";
}

function parseObsidianKanban(text: string): ParsedTask[] {
  const tasks: ParsedTask[] = [];
  let currentSection = "";

  const lines = text.split("\n");

  for (const line of lines) {
    // Detect section headers
    const headerMatch = line.match(/^##\s+.?\s*(.+)/);
    if (headerMatch) {
      currentSection = headerMatch[1].trim();
      continue;
    }

    // Skip completed tasks and non-task lines
    if (!line.match(/^-\s+\[\s\]/)) continue;
    // Skip checked tasks
    if (line.match(/^-\s+\[x\]/i)) continue;

    // Extract title — handle **bold** format
    let title = line.replace(/^-\s+\[\s\]\s*/, "").trim();
    // Remove owner emojis
    title = title.replace(/[🤖🙋🤝👤]\s*/, "").trim();
    // Remove tags like #claude #ben
    title = title.replace(/#\w+/g, "").trim();

    // Split on " — " for title vs description
    let description = "";
    const dashSplit = title.split(" — ");
    if (dashSplit.length > 1) {
      title = dashSplit[0].trim();
      description = dashSplit.slice(1).join(" — ").trim();
    }

    // Clean bold markers
    title = title.replace(/\*\*/g, "").trim();
    description = description.replace(/\*\*/g, "").trim();

    if (!title) continue;

    tasks.push({
      title,
      description,
      priority: detectPriority(line, currentSection),
      status: currentSection.includes("דחוף") ? "todo" : "backlog",
      owner: detectOwner(line),
      category: detectCategory(currentSection),
      source: "obsidian-kanban",
      selected: true,
    });
  }

  return tasks;
}

export function TaskImportModal({ open, onClose, onImport }: TaskImportModalProps) {
  const [step, setStep] = useState<"paste" | "preview" | "importing" | "done">("paste");
  const [rawText, setRawText] = useState("");
  const [parsedTasks, setParsedTasks] = useState<ParsedTask[]>([]);
  const [importResult, setImportResult] = useState({ imported: 0, error: "" });

  if (!open) return null;

  function handleParse() {
    const tasks = parseObsidianKanban(rawText);
    setParsedTasks(tasks);
    setStep("preview");
  }

  function toggleTask(index: number) {
    setParsedTasks((prev) =>
      prev.map((t, i) => (i === index ? { ...t, selected: !t.selected } : t))
    );
  }

  function toggleAll() {
    const allSelected = parsedTasks.every((t) => t.selected);
    setParsedTasks((prev) => prev.map((t) => ({ ...t, selected: !allSelected })));
  }

  async function handleImport() {
    setStep("importing");
    const selected = parsedTasks
      .filter((t) => t.selected)
      .map(({ selected: _, ...task }) => ({
        ...task,
        position: 0,
        source_date: new Date().toISOString().split("T")[0],
      }));

    try {
      const res = await fetch("/api/tasks/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: selected }),
      });
      const data = await res.json();
      if (res.ok) {
        setImportResult({ imported: data.imported, error: "" });
      } else {
        setImportResult({ imported: 0, error: data.error || "שגיאה בייבוא" });
      }
    } catch {
      setImportResult({ imported: 0, error: "שגיאת חיבור" });
    }
    setStep("done");
  }

  function handleClose() {
    if (step === "done" && importResult.imported > 0) {
      onImport(importResult.imported);
    }
    setStep("paste");
    setRawText("");
    setParsedTasks([]);
    setImportResult({ imported: 0, error: "" });
    onClose();
  }

  const selectedCount = parsedTasks.filter((t) => t.selected).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Upload size={18} className="text-brand-600" />
            <h2 className="text-lg font-bold dark:text-gray-100">ייבוא מ-Obsidian</h2>
          </div>
          <button onClick={handleClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        {/* Step: Paste */}
        {step === "paste" && (
          <div className="p-4 space-y-3 flex-1">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              הדבק את תוכן ה-KANBAN.md מ-Obsidian. הפורמט מזוהה אוטומטית.
            </p>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={`## 🔴 דחוף — צ'אט הבא\n- [ ] 🤖 **CRM Tasks UI** — השלמת /tasks page\n- [ ] 🙋 **shadcn/ui RTL** — התקנה\n\n## 🟠 ONE™\n- [ ] 🤖 **AI Brand Bible** — מסמך זהות מותג`}
              rows={12}
              className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-brand-400 focus:border-transparent font-mono resize-none"
              dir="rtl"
              autoFocus
            />
            <button
              onClick={handleParse}
              disabled={!rawText.trim()}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 disabled:dark:bg-gray-600 text-white rounded-xl text-sm font-bold transition-colors"
            >
              <FileText size={16} className="inline ml-1" />
              פענח משימות
            </button>
          </div>
        )}

        {/* Step: Preview */}
        {step === "preview" && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-4 pb-2 flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                נמצאו <span className="font-bold text-brand-600">{parsedTasks.length}</span> משימות · נבחרו{" "}
                <span className="font-bold">{selectedCount}</span>
              </p>
              <button onClick={toggleAll} className="text-xs text-brand-600 hover:underline">
                {parsedTasks.every((t) => t.selected) ? "בטל הכל" : "בחר הכל"}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-1.5">
              {parsedTasks.map((task, i) => (
                <div
                  key={i}
                  onClick={() => toggleTask(i)}
                  className={clsx(
                    "flex items-start gap-2 p-2.5 rounded-xl cursor-pointer border transition-all text-sm",
                    task.selected
                      ? "border-brand-200 dark:border-brand-800 bg-brand-50/50 dark:bg-brand-900/10"
                      : "border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 opacity-50"
                  )}
                >
                  <div
                    className={clsx(
                      "w-4 h-4 mt-0.5 rounded border flex-shrink-0 flex items-center justify-center",
                      task.selected ? "bg-brand-600 border-brand-600" : "border-gray-300 dark:border-gray-600"
                    )}
                  >
                    {task.selected && <Check size={10} className="text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="dark:text-gray-200 font-medium truncate">{task.title}</span>
                      <span className="text-[10px] opacity-60">{ownerIcons[task.owner]}</span>
                    </div>
                    {task.description && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{task.description}</p>
                    )}
                    <div className="flex items-center gap-1.5 mt-1">
                      <span
                        className={clsx(
                          "text-[10px] px-1.5 py-0.5 rounded",
                          task.priority === "p1"
                            ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300"
                            : task.priority === "p3"
                            ? "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                            : "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-300"
                        )}
                      >
                        {task.priority.toUpperCase()}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                        {categoryLabels[task.category]}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 pt-2 border-t border-gray-100 dark:border-gray-700 flex gap-2">
              <button
                onClick={() => setStep("paste")}
                className="flex-1 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-bold transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                חזרה
              </button>
              <button
                onClick={handleImport}
                disabled={selectedCount === 0}
                className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 text-white rounded-xl text-sm font-bold transition-colors"
              >
                ייבא {selectedCount} משימות
              </button>
            </div>
          </div>
        )}

        {/* Step: Importing */}
        {step === "importing" && (
          <div className="p-8 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500 dark:text-gray-400">מייבא {selectedCount} משימות...</p>
          </div>
        )}

        {/* Step: Done */}
        {step === "done" && (
          <div className="p-8 flex flex-col items-center justify-center gap-3">
            {importResult.error ? (
              <>
                <AlertCircle size={32} className="text-red-500" />
                <p className="text-sm text-red-500 font-medium">{importResult.error}</p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Check size={24} className="text-green-600 dark:text-green-400" />
                </div>
                <p className="text-sm dark:text-gray-200 font-medium">
                  יובאו <span className="text-brand-600 font-bold">{importResult.imported}</span> משימות בהצלחה!
                </p>
              </>
            )}
            <button
              onClick={handleClose}
              className="mt-2 px-6 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-bold transition-colors"
            >
              סגור
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
