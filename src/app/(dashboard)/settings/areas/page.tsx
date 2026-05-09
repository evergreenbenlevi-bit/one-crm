"use client";

import { useState, useCallback } from "react";
import useSWR, { mutate } from "swr";
import {
  Plus, Trash2, GripVertical, ChevronDown, ChevronRight,
  Pencil, Check, X, FolderPlus, Settings2,
} from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import type { AreaWithFolders, Folder } from "@/lib/types/areas";

// ── Inline editable text field ──
function InlineEdit({
  value,
  onSave,
  className = "",
}: {
  value: string;
  onSave: (next: string) => Promise<void>;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!draft.trim() || draft === value) {
      setEditing(false);
      setDraft(value);
      return;
    }
    setSaving(true);
    await onSave(draft.trim());
    setSaving(false);
    setEditing(false);
  }

  if (editing) {
    return (
      <span className="flex items-center gap-1">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") { setEditing(false); setDraft(value); }
          }}
          className={`bg-gray-700 border border-gray-600 rounded px-2 py-0.5 text-sm text-white outline-none focus:border-gray-400 ${className}`}
        />
        <button onClick={handleSave} disabled={saving} className="text-green-400 hover:text-green-300 p-0.5">
          <Check size={14} />
        </button>
        <button onClick={() => { setEditing(false); setDraft(value); }} className="text-gray-500 hover:text-gray-300 p-0.5">
          <X size={14} />
        </button>
      </span>
    );
  }

  return (
    <span
      className={`cursor-pointer group-hover:underline decoration-dotted underline-offset-2 ${className}`}
      onClick={() => { setEditing(true); setDraft(value); }}
    >
      {value}
      <Pencil size={11} className="inline ml-1.5 opacity-0 group-hover:opacity-40 transition-opacity" />
    </span>
  );
}

// ── Folder row ──
function FolderRow({ folder, onDelete }: { folder: Folder; onDelete: () => void }) {
  async function handleRename(name: string) {
    await fetch(`/api/folders/${folder.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    await mutate("/api/areas");
  }

  return (
    <div className="group flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/60 border border-gray-700/50 hover:border-gray-600 transition-colors">
      <GripVertical size={14} className="text-gray-600 cursor-grab flex-shrink-0" />
      <span className="text-gray-500 text-xs w-4 text-center">—</span>
      <div className="flex-1 min-w-0 group">
        <InlineEdit value={folder.name} onSave={handleRename} className="text-sm text-gray-300" />
      </div>
      {folder.href && (
        <span className="text-xs text-gray-600 font-mono truncate max-w-[100px]">{folder.href}</span>
      )}
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all p-0.5 flex-shrink-0"
        title="מחק תיקייה"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

// ── Add folder inline form ──
function AddFolderForm({ areaId, onDone }: { areaId: string; onDone: () => void }) {
  const [name, setName] = useState("");
  const [href, setHref] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const slug = name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ area_id: areaId, name: name.trim(), slug, href: href.trim() || null }),
    });
    await mutate("/api/areas");
    setSaving(false);
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/40 border border-dashed border-gray-700">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="שם תיקייה"
        className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 outline-none"
      />
      <input
        value={href}
        onChange={(e) => setHref(e.target.value)}
        placeholder="/path (אופציונלי)"
        className="w-32 bg-transparent text-xs text-gray-400 font-mono placeholder-gray-700 outline-none"
      />
      <button type="submit" disabled={saving || !name.trim()} className="text-green-400 hover:text-green-300 disabled:opacity-40 p-0.5">
        <Check size={14} />
      </button>
      <button type="button" onClick={onDone} className="text-gray-600 hover:text-gray-300 p-0.5">
        <X size={14} />
      </button>
    </form>
  );
}

// ── Area card ──
function AreaCard({ area }: { area: AreaWithFolders }) {
  const [expanded, setExpanded] = useState(true);
  const [addingFolder, setAddingFolder] = useState(false);

  async function handleRenameArea(name: string) {
    await fetch(`/api/areas/${area.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    await mutate("/api/areas");
  }

  async function handleDeleteArea() {
    if (!confirm(`למחוק את Area "${area.name}"? כל התיקיות שלו יימחקו גם.`)) return;
    await fetch(`/api/areas/${area.id}`, { method: "DELETE" });
    await mutate("/api/areas");
  }

  async function handleDeleteFolder(folderId: string, folderName: string) {
    if (!confirm(`למחוק את "${folderName}"?`)) return;
    await fetch(`/api/folders/${folderId}`, { method: "DELETE" });
    await mutate("/api/areas");
  }

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
      {/* Area header */}
      <div className="group flex items-center gap-3 px-5 py-4 border-b border-gray-800">
        <GripVertical size={16} className="text-gray-700 cursor-grab flex-shrink-0" />
        <button
          onClick={() => setExpanded((p) => !p)}
          className="text-gray-500 hover:text-gray-300 flex-shrink-0"
        >
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        <div className="flex-1 min-w-0 group">
          <InlineEdit
            value={area.name}
            onSave={handleRenameArea}
            className="text-base font-semibold text-white"
          />
        </div>

        <span className="text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded-full">
          {area.folders.length} תיקיות
        </span>

        <button
          onClick={() => setAddingFolder(true)}
          className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-gray-200 transition-all p-1 rounded"
          title="הוסף תיקייה"
        >
          <FolderPlus size={15} />
        </button>

        <button
          onClick={handleDeleteArea}
          className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all p-1 rounded"
          title="מחק Area"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {/* Folders */}
      {expanded && (
        <div className="p-3 space-y-2">
          {area.folders.map((folder) => (
            <FolderRow
              key={folder.id}
              folder={folder}
              onDelete={() => handleDeleteFolder(folder.id, folder.name)}
            />
          ))}

          {addingFolder && (
            <AddFolderForm areaId={area.id} onDone={() => setAddingFolder(false)} />
          )}

          {!addingFolder && (
            <button
              onClick={() => setAddingFolder(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 hover:text-gray-400 border border-dashed border-gray-800 hover:border-gray-700 transition-colors"
            >
              <Plus size={13} />
              הוסף תיקייה
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Add area form ──
function AddAreaForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const slug = name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    await fetch("/api/areas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), slug }),
    });
    await mutate("/api/areas");
    setSaving(false);
    onDone();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-gray-900 rounded-2xl border border-dashed border-gray-700 p-5 flex items-center gap-3"
    >
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="שם Area חדש..."
        className="flex-1 bg-transparent text-white placeholder-gray-600 text-sm outline-none"
      />
      <button
        type="submit"
        disabled={saving || !name.trim()}
        className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg disabled:opacity-40 transition-colors"
      >
        {saving ? "שומר..." : "צור"}
      </button>
      <button type="button" onClick={onDone} className="text-gray-600 hover:text-gray-300 p-1">
        <X size={16} />
      </button>
    </form>
  );
}

// ── Page ──
export default function AreasSettingsPage() {
  const { data: areas, isLoading } = useSWR<AreaWithFolders[]>("/api/areas", fetcher, {
    revalidateOnFocus: false,
  });
  const [addingArea, setAddingArea] = useState(false);

  const handleAddAreaDone = useCallback(() => setAddingArea(false), []);

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gray-800 rounded-xl flex items-center justify-center">
            <Settings2 size={18} className="text-gray-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Areas & Folders</h1>
            <p className="text-sm text-gray-500 mt-0.5">ניהול מבנה הסייד-בר — Areas + תיקיות</p>
          </div>
        </div>

        {!addingArea && (
          <button
            onClick={() => setAddingArea(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm rounded-xl transition-colors border border-gray-700"
          >
            <Plus size={15} />
            Area חדש
          </button>
        )}
      </div>

      {/* Add area form */}
      {addingArea && <AddAreaForm onDone={handleAddAreaDone} />}

      {/* Area cards */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-900 rounded-2xl border border-gray-800 animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && areas && areas.length === 0 && (
        <div className="text-center py-12 text-gray-600">
          <p className="text-sm">אין Areas עדיין.</p>
          <p className="text-xs mt-1">לחץ על "Area חדש" כדי להתחיל.</p>
        </div>
      )}

      {!isLoading && areas && (
        <div className="space-y-4">
          {areas.map((area) => (
            <AreaCard key={area.id} area={area} />
          ))}
        </div>
      )}

      {/* Info box */}
      <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-4 text-xs text-gray-600 space-y-1">
        <p className="font-medium text-gray-500">הערות</p>
        <p>• לחץ על שם Area או תיקייה כדי לשנות שם (inline edit)</p>
        <p>• תיקיות עם href ריק לא מוצגות כקישור בסייד-בר</p>
        <p>• מחיקה היא soft-delete — ניתן לשחזר מה-DB</p>
      </div>
    </div>
  );
}
