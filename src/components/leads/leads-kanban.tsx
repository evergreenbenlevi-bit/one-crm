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
import { Phone, MessageCircle } from "lucide-react";
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
}

function KanbanCard({ lead }: { lead: Lead }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lead.id });

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
      </div>
    </div>
  );
}

function KanbanColumn({ status, leads }: { status: string; leads: Lead[] }) {
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
          {leads.map(lead => <KanbanCard key={lead.id} lead={lead} />)}
        </SortableContext>
      </div>
    </div>
  );
}

export function LeadsKanban({ columns, statuses, onStatusChange }: LeadsKanbanProps) {
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
    const newStatus = String(over.id) as LeadStatus;

    // Find current status
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
          <KanbanColumn key={status} status={status} leads={columns[status] || []} />
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
