"use client";

import { useEffect, useState, useCallback } from "react";
import {
  GripVertical, Plus, Trash2, Eye, EyeOff, ChevronDown, ChevronRight,
  Check, X, Edit3, Save, Film, FileText, Image, Upload, BookOpen, BookMarked, MessageSquare,
  Columns, ChevronUp, Wand2, Copy, CheckCircle2
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
  tom_transcript: string | null;
  tom_file_paths: string[] | null;
  tom_notes: string | null;
  decision_reason: string | null;
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
  const [scriptEditorModule, setScriptEditorModule] = useState<string | null>(null);
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
  const withScript = modules.filter(m => m.visible && m.source !== "removed" && m.script).length;
  const scriptReady = modules.filter(m => m.script_ready).length;
  const readyToFilm = modules.filter(m => m.script_ready && m.playbook_ready).length;
  const filmedCount = modules.filter(m => m.filmed).length;
  const liveCount = modules.filter(m => m.status === "live").length;
  const withTom = modules.filter(m => m.tom_transcript).length;

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
            {totalModules} מודולים · {withTom} עם תמלול טום · {withScript} עם סקריפט · {scriptReady} מוכנים · {readyToFilm} לצילום · {filmedCount} צולמו · {liveCount} באוויר
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
                        <div key={mod.id}>
                          <ModuleRow
                            module={mod}
                            isEditing={editingModule === mod.id}
                            isScriptEditorOpen={scriptEditorModule === mod.id}
                            onStartEdit={() => setEditingModule(mod.id)}
                            onStopEdit={() => setEditingModule(null)}
                            onToggleScriptEditor={() => setScriptEditorModule(scriptEditorModule === mod.id ? null : mod.id)}
                            onUpdate={updateModule}
                            onDelete={deleteModule}
                            levelHex={level.hex}
                          />
                          {scriptEditorModule === mod.id && (
                            <ScriptEditor
                              module={mod}
                              onUpdate={updateModule}
                              onClose={() => setScriptEditorModule(null)}
                            />
                          )}
                        </div>
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
  isScriptEditorOpen,
  onStartEdit,
  onStopEdit,
  onToggleScriptEditor,
  onUpdate,
  onDelete,
  levelHex,
}: {
  module: CourseModule;
  isEditing: boolean;
  isScriptEditorOpen: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onToggleScriptEditor: () => void;
  onUpdate: (id: string, updates: Partial<CourseModule>) => void;
  onDelete: (id: string) => void;
  levelHex: string;
}) {
  const [editName, setEditName] = useState(mod.name);
  const [editDescription, setEditDescription] = useState(mod.description || "");
  const [editScript, setEditScript] = useState(mod.script || "");
  const [editBenefit, setEditBenefit] = useState(mod.client_benefit || "");
  const [editDecisionReason, setEditDecisionReason] = useState(mod.decision_reason || "");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const src = SOURCE_LABELS[mod.source];
  const sts = STATUS_LABELS[mod.status];

  const handleSave = () => {
    onUpdate(mod.id, {
      name: editName,
      description: editDescription || null,
      script: editScript || null,
      client_benefit: editBenefit || null,
      decision_reason: editDecisionReason || null,
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
                value={editDecisionReason}
                onChange={e => setEditDecisionReason(e.target.value)}
                placeholder="למה נכנס / לא נכנס / בשינוי..."
                className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 border-amber-300"
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

              {/* Decision reason */}
              {mod.decision_reason && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                  <MessageSquare size={12} />
                  {mod.decision_reason}
                </p>
              )}

              {/* Action buttons row */}
              <div className="flex items-center gap-3 mt-1">
                <button
                  onClick={onToggleScriptEditor}
                  className={`text-[10px] px-2 py-0.5 rounded flex items-center gap-1 transition-colors ${
                    isScriptEditorOpen
                      ? "bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400"
                      : "text-brand-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20"
                  }`}
                >
                  {isScriptEditorOpen ? <ChevronUp size={12} /> : <Columns size={12} />}
                  {isScriptEditorOpen ? "סגור עורך" : "עורך סקריפט"}
                  {mod.tom_transcript && !isScriptEditorOpen && (
                    <span className="text-blue-400 mr-1">({mod.tom_file_paths?.length || 0} מקורות טום)</span>
                  )}
                </button>
                {mod.script && !isScriptEditorOpen && (
                  <span className="text-[10px] text-green-500 flex items-center gap-1">
                    <CheckCircle2 size={10} />
                    {mod.script.split(/\s+/).length} מילים
                  </span>
                )}
                {!mod.script && !isScriptEditorOpen && (
                  <span className="text-[10px] text-gray-400">
                    אין סקריפט
                  </span>
                )}
              </div>
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

// ─── Script Editor (Side-by-Side) ───
function ScriptEditor({
  module: mod,
  onUpdate,
  onClose,
}: {
  module: CourseModule;
  onUpdate: (id: string, updates: Partial<CourseModule>) => void;
  onClose: () => void;
}) {
  const [script, setScript] = useState(mod.script || "");
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(mod.script ? new Date() : null);
  const [generating, setGenerating] = useState(false);
  const saveTimeoutRef = useCallback(() => {}, []);

  // Auto-save with debounce
  const debouncedSave = useCallback(
    (value: string) => {
      setSaving(true);
      onUpdate(mod.id, { script: value || null });
      setTimeout(() => {
        setSaving(false);
        setLastSaved(new Date());
      }, 300);
    },
    [mod.id, onUpdate]
  );

  const handleScriptChange = (value: string) => {
    setScript(value);
  };

  const handleSave = () => {
    debouncedSave(script);
  };

  const handleMarkReady = () => {
    onUpdate(mod.id, { script_ready: !mod.script_ready, script: script || null });
    if (!mod.script_ready) setLastSaved(new Date());
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/course/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleId: mod.id,
          moduleName: mod.name,
          moduleNumber: mod.number,
          description: mod.description,
          clientBenefit: mod.client_benefit,
          tomTranscript: mod.tom_transcript,
          source: mod.source,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setScript(data.script);
        onUpdate(mod.id, { script: data.script });
        setLastSaved(new Date());
      }
    } catch {
      // silent fail — user can retry
    } finally {
      setGenerating(false);
    }
  };

  const wordCount = script.trim() ? script.trim().split(/\s+/).length : 0;
  const tomWordCount = mod.tom_transcript?.trim().split(/\s+/).length || 0;

  return (
    <div className="border-t border-brand-200 dark:border-brand-800 bg-gray-50 dark:bg-gray-900/50">
      {/* Editor Header */}
      <div className="px-4 py-2 bg-brand-50 dark:bg-brand-900/20 flex items-center justify-between border-b border-brand-100 dark:border-brand-800">
        <div className="flex items-center gap-3">
          <Columns size={16} className="text-brand-600 dark:text-brand-400" />
          <span className="text-sm font-medium text-brand-700 dark:text-brand-300">
            {mod.number} — {mod.name}
          </span>
          {mod.source !== "original" && mod.tom_transcript && (
            <span className="text-[10px] text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
              {tomWordCount} מילים מטום
            </span>
          )}
          {wordCount > 0 && (
            <span className="text-[10px] text-green-600 bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded">
              {wordCount} מילים בסקריפט
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {saving && <span className="text-[10px] text-gray-400 animate-pulse">שומר...</span>}
          {lastSaved && !saving && (
            <span className="text-[10px] text-gray-400">
              נשמר {lastSaved.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button
            onClick={handleSave}
            className="flex items-center gap-1 px-2 py-1 text-[11px] bg-brand-600 text-white rounded hover:bg-brand-700 transition-colors"
          >
            <Save size={12} />
            שמור
          </button>
          <button
            onClick={handleMarkReady}
            className={`flex items-center gap-1 px-2 py-1 text-[11px] rounded transition-colors ${
              mod.script_ready
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600"
            }`}
          >
            <CheckCircle2 size={12} />
            {mod.script_ready ? "מוכן!" : "סמן מוכן"}
          </button>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
            <X size={14} className="text-gray-500" />
          </button>
        </div>
      </div>

      {/* Side-by-Side Panels */}
      <div className="flex" style={{ height: "500px" }}>
        {/* LEFT: Tom's Transcript */}
        {mod.tom_transcript ? (
          <div className="w-1/2 border-l border-gray-200 dark:border-gray-700 flex flex-col">
            <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800 flex items-center justify-between shrink-0">
              <span className="text-[11px] font-medium text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                <BookMarked size={13} />
                מה טום מלמד ({mod.tom_file_paths?.length || 0} מקורות)
              </span>
              {mod.tom_file_paths && mod.tom_file_paths.length > 0 && (
                <span className="text-[9px] text-blue-400">
                  {mod.tom_file_paths.map(p => p.split("/").pop()?.replace(".md", "")).join(" · ")}
                </span>
              )}
            </div>
            <div className="flex-1 overflow-auto p-4">
              <pre className="text-[12px] whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed font-sans" dir="ltr">
                {mod.tom_transcript}
              </pre>
            </div>
          </div>
        ) : (
          <div className="w-1/2 border-l border-gray-200 dark:border-gray-700 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <BookMarked size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">אין תמלול מטום</p>
              <p className="text-[10px]">מודול מקורי — כתוב מאפס</p>
            </div>
          </div>
        )}

        {/* RIGHT: Script Editor */}
        <div className="w-1/2 flex flex-col">
          <div className="px-3 py-2 bg-green-50 dark:bg-green-900/20 border-b border-green-100 dark:border-green-800 flex items-center justify-between shrink-0">
            <span className="text-[11px] font-medium text-green-700 dark:text-green-300 flex items-center gap-1.5">
              <FileText size={13} />
              סקריפט ONE
            </span>
            <div className="flex items-center gap-2">
              {mod.tom_transcript && (
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors disabled:opacity-50"
                >
                  <Wand2 size={11} className={generating ? "animate-spin" : ""} />
                  {generating ? "כותב..." : "Claude Copywriter"}
                </button>
              )}
              {mod.tom_transcript && script && (
                <button
                  onClick={() => { setScript(mod.tom_transcript || ""); }}
                  className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                  title="החלף סקריפט בתמלול של טום"
                >
                  <Copy size={11} />
                  העתק מטום
                </button>
              )}
              {!script && mod.tom_transcript && (
                <button
                  onClick={() => { setScript(mod.tom_transcript || ""); }}
                  className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                >
                  <Copy size={11} />
                  התחל מתמלול טום
                </button>
              )}
            </div>
          </div>
          <textarea
            value={script}
            onChange={e => handleScriptChange(e.target.value)}
            placeholder="כתוב את הסקריפט כאן...&#10;&#10;טיפ: לחץ &quot;Claude Copywriter&quot; ליצירת סקריפט אוטומטי מתמלול טום"
            className="flex-1 p-4 text-[13px] leading-relaxed resize-none bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none font-sans"
            dir="rtl"
          />
        </div>
      </div>
    </div>
  );
}
