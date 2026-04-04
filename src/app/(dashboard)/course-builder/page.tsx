"use client";

import { useEffect, useState, useCallback } from "react";
import {
  GripVertical, Plus, Trash2, Eye, EyeOff, ChevronDown, ChevronRight,
  Check, X, Edit3, Save, Film, FileText, Image, Upload, BookOpen
} from "lucide-react";

// ─── Types ───
interface CourseLevel {
  id: string;
  number: number;
  name: string;
  subtitle: string | null;
  color: string;
  hex: string;
  total_modules: number;
  phase: string | null;
  weeks: string | null;
  posi: string | null;
  position: number;
}

interface CourseModule {
  id: string;
  level_id: string;
  number: string;
  name: string;
  description: string | null;
  script: string | null;
  teacher: "ben" | "avitar" | "both";
  source: "tom" | "tom_modified" | "original" | "removed";
  source_refs: string | null;
  format: string | null;
  posi: string | null;
  client_benefit: string | null;
  script_ready: boolean;
  playbook_ready: boolean;
  banner_ready: boolean;
  filmed: boolean;
  edited: boolean;
  uploaded: boolean;
  posi_defined: boolean;
  status: "draft" | "ready_to_film" | "filmed" | "edited" | "live" | "removed";
  playbook_url: string | null;
  gamma_url: string | null;
  video_url: string | null;
  position: number;
  visible: boolean;
}

type SourceFilter = "all" | "tom" | "tom_modified" | "original" | "removed";
type StatusFilter = "all" | "draft" | "ready_to_film" | "filmed" | "edited" | "live" | "removed";

const SOURCE_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  tom: { label: "מטום", emoji: "📘", color: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30" },
  tom_modified: { label: "מטום בשינוי", emoji: "✏️", color: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/30" },
  original: { label: "שלנו", emoji: "🆕", color: "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/30" },
  removed: { label: "הורד", emoji: "❌", color: "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30" },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "טיוטה", color: "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300" },
  ready_to_film: { label: "מוכן לצילום", color: "bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200" },
  filmed: { label: "צולם", color: "bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200" },
  edited: { label: "נערך", color: "bg-purple-200 text-purple-800 dark:bg-purple-800 dark:text-purple-200" },
  live: { label: "באוויר", color: "bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200" },
  removed: { label: "הורד", color: "bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200" },
};

const TEACHER_LABELS: Record<string, string> = { ben: "בן", avitar: "אביתר", both: "שניהם" };

// ─── Main Component ───
export default function CourseBuilderPage() {
  const [levels, setLevels] = useState<CourseLevel[]>([]);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLevels, setExpandedLevels] = useState<Set<string>>(new Set());
  const [editingModule, setEditingModule] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showHidden, setShowHidden] = useState(false);

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/course");
    const data = await res.json();
    setLevels(data.levels || []);
    setModules(data.modules || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── API helpers ───
  const updateModule = async (id: string, updates: Partial<CourseModule>) => {
    setModules(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
    await fetch("/api/course", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "course_modules", id, updates }),
    });
  };

  const addModule = async (levelId: string) => {
    const levelModules = modules.filter(m => m.level_id === levelId);
    const levelNum = levels.find(l => l.id === levelId)?.number ?? 0;
    const nextPos = levelModules.length;
    const prefix = levelId === "SPRINT" ? "S" : String(levelNum);
    const newNum = `${prefix}.${nextPos + 1}`;

    const res = await fetch("/api/course", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table: "course_modules",
        data: {
          level_id: levelId,
          number: newNum,
          name: "מודול חדש",
          teacher: "ben",
          source: "original",
          position: nextPos,
          status: "draft",
          visible: true,
        },
      }),
    });
    const newMod = await res.json();
    setModules(prev => [...prev, newMod]);
  };

  const deleteModule = async (id: string) => {
    setModules(prev => prev.filter(m => m.id !== id));
    await fetch(`/api/course?id=${id}`, { method: "DELETE" });
  };

  // ─── Filtering ───
  const getFilteredModules = (levelId: string) => {
    return modules
      .filter(m => m.level_id === levelId)
      .filter(m => showHidden || m.visible)
      .filter(m => sourceFilter === "all" || m.source === sourceFilter)
      .filter(m => statusFilter === "all" || m.status === statusFilter)
      .sort((a, b) => a.position - b.position);
  };

  // ─── Stats ───
  const totalModules = modules.filter(m => m.visible && m.source !== "removed").length;
  const readyToFilm = modules.filter(m => m.script_ready && m.playbook_ready).length;
  const filmedCount = modules.filter(m => m.filmed).length;
  const liveCount = modules.filter(m => m.status === "live").length;

  const toggleLevel = (id: string) => {
    setExpandedLevels(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ONE™ Course Builder</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {totalModules} מודולים פעילים · {readyToFilm} מוכנים לצילום · {filmedCount} צולמו · {liveCount} באוויר
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={sourceFilter}
          onChange={e => setSourceFilter(e.target.value as SourceFilter)}
          className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
        >
          <option value="all">כל המקורות</option>
          <option value="tom">📘 מטום</option>
          <option value="tom_modified">✏️ מטום בשינוי</option>
          <option value="original">🆕 שלנו</option>
          <option value="removed">❌ הורד</option>
        </select>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as StatusFilter)}
          className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
        >
          <option value="all">כל הסטטוסים</option>
          <option value="draft">טיוטה</option>
          <option value="ready_to_film">מוכן לצילום</option>
          <option value="filmed">צולם</option>
          <option value="edited">נערך</option>
          <option value="live">באוויר</option>
          <option value="removed">הורד</option>
        </select>

        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={showHidden}
            onChange={e => setShowHidden(e.target.checked)}
            className="rounded"
          />
          הצג מוסתרים
        </label>

        <button
          onClick={() => setExpandedLevels(new Set(levels.map(l => l.id)))}
          className="text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400"
        >
          פתח הכל
        </button>
        <button
          onClick={() => setExpandedLevels(new Set())}
          className="text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400"
        >
          סגור הכל
        </button>
      </div>

      {/* Levels */}
      <div className="space-y-3">
        {levels.map(level => {
          const levelModules = getFilteredModules(level.id);
          const allModulesCount = modules.filter(m => m.level_id === level.id).length;
          const isExpanded = expandedLevels.has(level.id);
          const completedChecks = modules
            .filter(m => m.level_id === level.id && m.visible)
            .reduce((sum, m) => sum + (m.script_ready ? 1 : 0) + (m.playbook_ready ? 1 : 0) + (m.filmed ? 1 : 0) + (m.uploaded ? 1 : 0), 0);
          const totalChecks = modules.filter(m => m.level_id === level.id && m.visible).length * 4;
          const pct = totalChecks > 0 ? Math.round((completedChecks / totalChecks) * 100) : 0;

          return (
            <div key={level.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Level Header */}
              <button
                onClick={() => toggleLevel(level.id)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ backgroundColor: level.hex + "20", color: level.hex === "#F5F5F5" || level.hex === "#1A1A1A" ? "#666" : level.hex }}
                >
                  {level.id === "SPRINT" ? "💰" : `L${level.number}`}
                </div>
                <div className="flex-1 text-right">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 dark:text-white">{level.name}</span>
                    {level.subtitle && (
                      <span className="text-sm text-gray-500 dark:text-gray-400">— {level.subtitle}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-gray-400">{allModulesCount} מודולים</span>
                    {level.phase && <span className="text-xs text-gray-400">· {level.phase}</span>}
                    {level.weeks && <span className="text-xs text-gray-400">· שבועות {level.weeks}</span>}
                    <div className="flex items-center gap-1.5">
                      <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: level.hex === "#F5F5F5" ? "#999" : level.hex }}
                        />
                      </div>
                      <span className="text-xs text-gray-400">{pct}%</span>
                    </div>
                  </div>
                </div>
                {isExpanded ? <ChevronDown size={20} className="text-gray-400" /> : <ChevronRight size={20} className="text-gray-400" />}
              </button>

              {/* Modules */}
              {isExpanded && (
                <div className="border-t border-gray-100 dark:border-gray-700">
                  {levelModules.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-gray-400">אין מודולים (בדוק פילטרים)</div>
                  ) : (
                    <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                      {levelModules.map(mod => (
                        <ModuleRow
                          key={mod.id}
                          module={mod}
                          isEditing={editingModule === mod.id}
                          onStartEdit={() => setEditingModule(mod.id)}
                          onStopEdit={() => setEditingModule(null)}
                          onUpdate={updateModule}
                          onDelete={deleteModule}
                          levelHex={level.hex}
                        />
                      ))}
                    </div>
                  )}
                  <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700">
                    <button
                      onClick={() => addModule(level.id)}
                      className="flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400 py-1"
                    >
                      <Plus size={16} />
                      הוסף מודול
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Module Row ───
function ModuleRow({
  module: mod,
  isEditing,
  onStartEdit,
  onStopEdit,
  onUpdate,
  onDelete,
  levelHex,
}: {
  module: CourseModule;
  isEditing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onUpdate: (id: string, updates: Partial<CourseModule>) => void;
  onDelete: (id: string) => void;
  levelHex: string;
}) {
  const [editName, setEditName] = useState(mod.name);
  const [editDescription, setEditDescription] = useState(mod.description || "");
  const [editScript, setEditScript] = useState(mod.script || "");
  const [editBenefit, setEditBenefit] = useState(mod.client_benefit || "");
  const [showScript, setShowScript] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const src = SOURCE_LABELS[mod.source];
  const sts = STATUS_LABELS[mod.status];

  const handleSave = () => {
    onUpdate(mod.id, {
      name: editName,
      description: editDescription || null,
      script: editScript || null,
      client_benefit: editBenefit || null,
    });
    onStopEdit();
  };

  const checklistItems: { key: keyof CourseModule; label: string; icon: React.ReactNode }[] = [
    { key: "script_ready", label: "Script", icon: <FileText size={14} /> },
    { key: "playbook_ready", label: "Playbook", icon: <BookOpen size={14} /> },
    { key: "banner_ready", label: "Banner", icon: <Image size={14} /> },
    { key: "filmed", label: "צולם", icon: <Film size={14} /> },
    { key: "edited", label: "נערך", icon: <Edit3 size={14} /> },
    { key: "uploaded", label: "הועלה", icon: <Upload size={14} /> },
  ];

  return (
    <div className={`px-4 py-3 ${!mod.visible ? "opacity-50" : ""} ${mod.source === "removed" ? "bg-red-50/50 dark:bg-red-900/10" : ""}`}>
      {/* Main row */}
      <div className="flex items-start gap-3">
        <GripVertical size={16} className="text-gray-300 mt-1 cursor-grab shrink-0" />

        {/* Module number */}
        <span
          className="text-xs font-mono font-bold mt-0.5 shrink-0 w-8"
          style={{ color: levelHex === "#F5F5F5" || levelHex === "#1A1A1A" ? "#666" : levelHex }}
        >
          {mod.number}
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-2">
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600"
                autoFocus
              />
              <textarea
                value={editDescription}
                onChange={e => setEditDescription(e.target.value)}
                placeholder="תיאור המודול..."
                className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600"
                rows={2}
              />
              <textarea
                value={editBenefit}
                onChange={e => setEditBenefit(e.target.value)}
                placeholder="תועלת ללקוח..."
                className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600"
                rows={2}
              />
              <textarea
                value={editScript}
                onChange={e => setEditScript(e.target.value)}
                placeholder="Script..."
                className="w-full px-2 py-1 border rounded text-sm font-mono dark:bg-gray-700 dark:border-gray-600"
                rows={6}
              />
              <div className="flex gap-2">
                <button onClick={handleSave} className="flex items-center gap-1 px-3 py-1 bg-brand-600 text-white rounded text-sm hover:bg-brand-700">
                  <Save size={14} /> שמור
                </button>
                <button onClick={onStopEdit} className="flex items-center gap-1 px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded text-sm hover:bg-gray-300 dark:hover:bg-gray-600">
                  <X size={14} /> ביטול
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-gray-900 dark:text-white text-sm">{mod.name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${src.color}`}>
                  {src.emoji} {src.label}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${sts.color}`}>
                  {sts.label}
                </span>
                {mod.source_refs && (
                  <span className="text-[10px] text-gray-400">({mod.source_refs})</span>
                )}
              </div>
              {mod.client_benefit && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{mod.client_benefit}</p>
              )}
              {mod.format && (
                <p className="text-[10px] text-gray-400 mt-0.5">{mod.format}</p>
              )}

              {/* Script preview toggle */}
              {mod.script && (
                <button
                  onClick={() => setShowScript(!showScript)}
                  className="text-[10px] text-brand-500 hover:text-brand-600 mt-1"
                >
                  {showScript ? "הסתר script" : "הצג script"}
                </button>
              )}
              {showScript && mod.script && (
                <pre className="mt-1 p-2 bg-gray-50 dark:bg-gray-900 rounded text-[11px] whitespace-pre-wrap max-h-40 overflow-auto">
                  {mod.script}
                </pre>
              )}
            </>
          )}
        </div>

        {/* Teacher */}
        <select
          value={mod.teacher}
          onChange={e => onUpdate(mod.id, { teacher: e.target.value as CourseModule["teacher"] })}
          className="text-xs px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shrink-0"
        >
          <option value="ben">בן</option>
          <option value="avitar">אביתר</option>
          <option value="both">שניהם</option>
        </select>

        {/* Source */}
        <select
          value={mod.source}
          onChange={e => onUpdate(mod.id, { source: e.target.value as CourseModule["source"] })}
          className="text-xs px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shrink-0"
        >
          <option value="tom">📘 מטום</option>
          <option value="tom_modified">✏️ שינוי</option>
          <option value="original">🆕 שלנו</option>
          <option value="removed">❌ הורד</option>
        </select>

        {/* Status */}
        <select
          value={mod.status}
          onChange={e => onUpdate(mod.id, { status: e.target.value as CourseModule["status"] })}
          className="text-xs px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shrink-0"
        >
          <option value="draft">טיוטה</option>
          <option value="ready_to_film">מוכן לצילום</option>
          <option value="filmed">צולם</option>
          <option value="edited">נערך</option>
          <option value="live">באוויר</option>
          <option value="removed">הורד</option>
        </select>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {!isEditing && (
            <button onClick={onStartEdit} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="ערוך">
              <Edit3 size={14} className="text-gray-400" />
            </button>
          )}
          <button
            onClick={() => onUpdate(mod.id, { visible: !mod.visible })}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            title={mod.visible ? "הסתר" : "הצג"}
          >
            {mod.visible ? <Eye size={14} className="text-gray-400" /> : <EyeOff size={14} className="text-gray-400" />}
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button onClick={() => { onDelete(mod.id); setConfirmDelete(false); }} className="p-1 bg-red-100 dark:bg-red-900/30 rounded">
                <Check size={14} className="text-red-600" />
              </button>
              <button onClick={() => setConfirmDelete(false)} className="p-1 bg-gray-100 dark:bg-gray-700 rounded">
                <X size={14} className="text-gray-400" />
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded" title="מחק">
              <Trash2 size={14} className="text-gray-400 hover:text-red-500" />
            </button>
          )}
        </div>
      </div>

      {/* Checklist row */}
      <div className="flex items-center gap-3 mt-2 mr-11">
        {checklistItems.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => onUpdate(mod.id, { [key]: !mod[key as keyof CourseModule] })}
            className={`flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded transition-colors ${
              mod[key as keyof CourseModule]
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500"
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
