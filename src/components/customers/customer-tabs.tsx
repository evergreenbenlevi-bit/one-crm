"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui/tabs";
import type { Customer, Transaction, Meeting, FileRecord, Note, FunnelEvent } from "@/lib/types/database";
import { FileText, ClipboardList, MessageSquare, CreditCard } from "lucide-react";

interface CustomerWithRelations extends Customer {
  transactions: Transaction[];
  meetings: Meeting[];
  files: FileRecord[];
  notes: Note[];
  events: FunnelEvent[];
}

const tabs = [
  { key: "overview", label: "סקירה" },
  { key: "financial", label: "כספי" },
  { key: "files", label: "קבצים" },
  { key: "questionnaire", label: "שאלון" },
  { key: "notes", label: "הערות" },
];

export function CustomerTabs({ customer }: { customer: CustomerWithRelations }) {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="space-y-4">
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === "overview" && <OverviewTab customer={customer} />}
      {activeTab === "financial" && <FinancialTab customer={customer} />}
      {activeTab === "files" && <FilesTab files={customer.files} />}
      {activeTab === "questionnaire" && <QuestionnaireTab events={customer.events} />}
      {activeTab === "notes" && <NotesTab notes={customer.notes} customerId={customer.id} />}
    </div>
  );
}

function OverviewTab({ customer }: { customer: CustomerWithRelations }) {
  const productLabels: Record<string, string> = { one_core: "ONE™ Core", one_vip: "ONE™ VIP" };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700 space-y-4">
      <h3 className="font-medium dark:text-gray-200">פרטים כלליים</h3>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-400 dark:text-gray-500">תוכניות שרכש</span>
          <div className="mt-1">{customer.products_purchased?.map(p => productLabels[p] || p).join(", ") || "—"}</div>
        </div>
        <div>
          <span className="text-gray-400 dark:text-gray-500">סה״כ שילם</span>
          <div className="mt-1 font-medium">₪{Number(customer.total_paid).toLocaleString("he-IL")}</div>
        </div>
        {customer.program_start_date && (
          <div>
            <span className="text-gray-400 dark:text-gray-500">תחילת תוכנית</span>
            <div className="mt-1">{new Date(customer.program_start_date).toLocaleDateString("he-IL")}</div>
          </div>
        )}
        {customer.program_end_date && (
          <div>
            <span className="text-gray-400 dark:text-gray-500">סיום תוכנית</span>
            <div className="mt-1">{new Date(customer.program_end_date).toLocaleDateString("he-IL")}</div>
          </div>
        )}
        <div>
          <span className="text-gray-400 dark:text-gray-500">הצטרף</span>
          <div className="mt-1">{new Date(customer.created_at).toLocaleDateString("he-IL")}</div>
        </div>
        {customer.occupation && (
          <div>
            <span className="text-gray-400 dark:text-gray-500">עיסוק</span>
            <div className="mt-1">{customer.occupation}</div>
          </div>
        )}
      </div>

      {customer.meetings.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-4 mb-2">פגישות</h4>
          <div className="space-y-2">
            {customer.meetings.slice(0, 5).map(m => {
              const meetingLabels: Record<string, string> = {
                strategy_session: "סשן אסטרטגי", onboarding: "Onboarding", monthly_1on1: "1:1 חודשי", group_zoom: "זום קבוצתי"
              };
              return (
                <div key={m.id} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 dark:border-gray-700/50">
                  <span>{meetingLabels[m.type] || m.type}</span>
                  <span className="text-gray-400 dark:text-gray-500">{new Date(m.date).toLocaleDateString("he-IL")}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function FinancialTab({ customer }: { customer: CustomerWithRelations }) {
  const methodLabels: Record<string, string> = { cardcom: "Cardcom", upay: "Upay", other: "אחר" };
  const productLabels: Record<string, string> = { one_core: "ONE™ Core", one_vip: "ONE™ VIP" };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium dark:text-gray-200 flex items-center gap-2"><CreditCard size={18} /> סיכום כספי</h3>
        <span className="text-xl font-bold">₪{Number(customer.total_paid).toLocaleString("he-IL")}</span>
      </div>

      {customer.transactions.length > 0 && (
        <div className="space-y-2">
          {customer.transactions.map(t => (
            <div key={t.id} className="flex items-center justify-between text-sm py-2 border-b border-gray-50 dark:border-gray-700/50">
              <div>
                <span className="font-medium">{productLabels[t.program] || t.program}</span>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {methodLabels[t.payment_method] || t.payment_method}
                  {t.installments_total > 1 && ` · ${t.installments_paid}/${t.installments_total} תשלומים`}
                </div>
              </div>
              <div className="text-left">
                <span className="font-medium">₪{Number(t.amount).toLocaleString("he-IL")}</span>
                <div className="text-xs text-gray-400 dark:text-gray-500">{new Date(t.date).toLocaleDateString("he-IL")}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FilesTab({ files }: { files: FileRecord[] }) {
  const typeLabels: Record<string, string> = {
    contract: "הסכם", meeting_summary: "סיכום פגישה", transcript: "תמלול", other: "אחר"
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700">
      <h3 className="font-medium dark:text-gray-200 flex items-center gap-2 mb-3"><FileText size={18} /> קבצים</h3>
      {files.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">אין קבצים</p>
      ) : (
        <div className="space-y-2">
          {files.map(f => (
            <a key={f.id} href={f.url} target="_blank" className="flex items-center justify-between text-sm py-2 border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700 rounded px-2 -mx-2">
              <div>
                <span className="font-medium">{f.name}</span>
                <span className="text-xs text-gray-400 mr-2">{typeLabels[f.type] || f.type}</span>
              </div>
              <span className="text-xs text-gray-400">{new Date(f.uploaded_at).toLocaleDateString("he-IL")}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function QuestionnaireTab({ events }: { events: FunnelEvent[] }) {
  const questionnaireEvent = events.find(e => e.event_type === "applied");

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700">
      <h3 className="font-medium dark:text-gray-200 flex items-center gap-2 mb-3"><ClipboardList size={18} /> שאלון התאמה</h3>
      {!questionnaireEvent ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">לא מילא שאלון</p>
      ) : (
        <div className="space-y-3">
          {Object.entries(questionnaireEvent.metadata || {}).map(([key, value]) => (
            <div key={key} className="text-sm">
              <span className="text-gray-400 dark:text-gray-500">{key}</span>
              <div className="mt-0.5 font-medium">{String(value)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NotesTab({ notes, customerId }: { notes: Note[]; customerId: string }) {
  const [newNote, setNewNote] = useState("");
  const [allNotes, setAllNotes] = useState(notes);
  const [saving, setSaving] = useState(false);

  async function handleAddNote() {
    if (!newNote.trim()) return;
    setSaving(true);

    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customer_id: customerId, content: newNote }),
    });

    if (res.ok) {
      const note = await res.json();
      setAllNotes(prev => [note, ...prev]);
      setNewNote("");
    }
    setSaving(false);
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700">
      <h3 className="font-medium dark:text-gray-200 flex items-center gap-2 mb-3"><MessageSquare size={18} /> הערות</h3>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="הוסף הערה..."
          className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
          onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
        />
        <button
          onClick={handleAddNote}
          disabled={saving || !newNote.trim()}
          className="px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
        >
          {saving ? "..." : "הוסף"}
        </button>
      </div>

      {allNotes.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">אין הערות</p>
      ) : (
        <div className="space-y-3">
          {allNotes.map(note => (
            <div key={note.id} className="text-sm py-2 border-b border-gray-50 dark:border-gray-700/50">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400 dark:text-gray-500">{note.author}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500">{new Date(note.created_at).toLocaleDateString("he-IL")}</span>
              </div>
              <p>{note.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
