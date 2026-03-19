"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Lead, LeadStatus } from "@/lib/types/database";
import { Phone, MessageCircle, StickyNote, Trash2 } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";
import { clsx } from "clsx";

const statusLabels: Record<string, string> = {
  new: "חדש",
  consumed_content: "צרך תוכן",
  engaged: "ביצע אינטראקציה",
  applied: "הגיש בקשה",
  qualified: "מתאים",
  onboarding: "בתהליך קליטה",
  active_client: "לקוח פעיל",
  completed: "סיים תוכנית",
  lost: "אבוד",
};

interface LeadsKanbanProps {
  columns: Record<string, Lead[]>;
  statuses: LeadStatus[];
  onStatusChange: (leadId: string, newStatus: LeadStatus) => void;
  onDelete?: (leadId: string) => void;
}

function KanbanCard({ lead, onDelete }: { lead: Lead; onDelete?: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lead.id });
  const [showNote, setShowNote] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  async function handleQuickNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteText.trim() || savingNote) return;
    setSavingNote(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: lead.id, content: noteText.trim(), author: "admin" }),
      });
      if (!res.ok) throw new Error();
      setNoteText("");
      setShowNote(false);
    } catch {
      // Keep the note text so user doesn't lose it
      alert("שגיאה בשמירת ההערה. נסה שוב.");
    } finally {
      setSavingNote(false);
    }
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const daysSinceUpdate = Math.floor((Date.now() - new Date(lead.updated_at).getTime()) / (1000 * 60 * 60 * 24));
  const isHot = daysSinceUpdate >= 3 && lead.current_status !== "new" && lead.current_status !== "active_client";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={clsx(
        "bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm dark:shadow-gray-900/20 border cursor-grab active:cursor-grabbing transition-shadow",
        isDragging ? "opacity-50 shadow-lg" : "hover:shadow-md",
        isHot ? "border-warning" : "border-gray-100 dark:border-gray-700"
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <Link href={`/leads/${lead.id}`} className="text-sm font-medium hover:text-brand-600 dark:text-gray-200 dark:hover:text-brand-400 truncate" onClick={(e) => e.stopPropagation()}>
          {isHot && "🔥 "}{lead.name}
        </Link>
        {lead.lead_score != null && (
          <span className={clsx(
            "text-xs font-bold px-1.5 py-0.5 rounded-md shrink-0 ml-1",
            lead.lead_score >= 80 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
            lead.lead_score >= 50 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
            "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
          )}>
            {lead.lead_score}
          </span>
        )}
      </div>
      <div className="text-xs text-gray-400 dark:text-gray-500">
        {formatDistanceToNow(new Date(lead.updated_at), { locale: he, addSuffix: true })}
      </div>
      <div className="flex items-center gap-1 mt-2">
        {lead.phone && (
          <a href={`tel:${lead.phone}`} onClick={(e) => e.stopPropagation()} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-300 dark:text-gray-500 hover:text-brand-600 dark:hover:text-brand-400">
            <Phone size={12} />
          </a>
        )}
        {lead.phone && (
          <a href={`https://wa.me/972${lead.phone.replace(/^0/, "")}`} target="_blank" onClick={(e) => e.stopPropagation()} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-300 dark:text-gray-500 hover:text-success">
            <MessageCircle size={12} />
          </a>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); setShowNote(v => !v); }}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-300 dark:text-gray-500 hover:text-amber-500 transition-colors mr-auto"
        >
          <StickyNote size={12} />
        </button>
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`למחוק את "${lead.name}"?`)) onDelete(lead.id);
            }}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-300 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
      {showNote && (
        <form onSubmit={handleQuickNote} onClick={e => e.stopPropagation()} className="mt-2">
          <input
            type="text"
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="הוסף הערה..."
            autoFocus
            className="w-full px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <div className="flex gap-1 mt-1">
            <button type="submit" disabled={savingNote || !noteText.trim()} className="flex-1 py-1 text-xs bg-brand-600 text-white rounded-lg disabled:opacity-50 hover:bg-brand-700 transition-colors">
              {savingNote ? "..." : "שמור"}
            </button>
            <button type="button" onClick={() => setShowNote(false)} className="px-2 py-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              ✕
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function KanbanColumn({ status, leads, onDelete }: { status: string; leads: Lead[]; onDelete?: (id: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex-shrink-0 w-64">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">{statusLabels[status] || status}</h3>
        <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">{leads.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={clsx(
          "space-y-2 min-h-[200px] p-2 rounded-xl transition-colors",
          isOver ? "bg-brand-50 dark:bg-brand-900/20" : "bg-gray-50/50 dark:bg-gray-800/50"
        )}
      >
        <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map(lead => <KanbanCard key={lead.id} lead={lead} onDelete={onDelete} />)}
        </SortableContext>
      </div>
    </div>
  );
}

export function LeadsKanban({ columns, statuses, onStatusChange, onDelete }: LeadsKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const activeLead = activeId
    ? Object.values(columns).flat().find(l => l.id === activeId)
    : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const leadId = String(active.id);

    // over.id could be a column status OR a card's lead ID — resolve to status
    const validStatuses = Object.keys(columns) as LeadStatus[];
    let newStatus: LeadStatus | undefined;

    if (validStatuses.includes(over.id as LeadStatus)) {
      // Dropped on column
      newStatus = over.id as LeadStatus;
    } else {
      // Dropped on a card — find which column that card belongs to
      newStatus = Object.entries(columns).find(([, leads]) =>
        leads.some(l => l.id === String(over.id))
      )?.[0] as LeadStatus | undefined;
    }

    if (!newStatus) return;

    const currentStatus = Object.entries(columns).find(([, leads]) =>
      leads.some(l => l.id === leadId)
    )?.[0];

    if (currentStatus && currentStatus !== newStatus) {
      onStatusChange(leadId, newStatus);
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {statuses.map(status => (
          <KanbanColumn key={status} status={status} leads={columns[status] || []} onDelete={onDelete} />
        ))}
      </div>
      <DragOverlay>
        {activeLead && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-lg border border-brand-200 dark:border-brand-700 w-64">
            <span className="text-sm font-medium dark:text-gray-200">{activeLead.name}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
