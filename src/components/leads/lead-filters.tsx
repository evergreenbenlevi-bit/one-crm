"use client";

import { Search } from "lucide-react";

interface LeadFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  source: string;
  onSourceChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
}

const sourceOptions = [
  { value: "", label: "כל המקורות" },
  { value: "campaign", label: "קמפיין" },
  { value: "organic", label: "אורגני" },
  { value: "youtube", label: "יוטיוב" },
  { value: "referral", label: "הפנייה" },
];

const statusOptions = [
  { value: "", label: "כל הסטטוסים" },
  { value: "new", label: "ליד חדש" },
  { value: "watched_vsl", label: "צפה בסרטון" },
  { value: "got_wa", label: "קיבל וואטסאפ" },
  { value: "filled_questionnaire", label: "מילא שאלון" },
  { value: "sales_call", label: "שיחת מכירה" },
  { value: "closed", label: "סגר" },
  { value: "lost", label: "אבוד" },
];

export function LeadFilters({ search, onSearchChange, source, onSourceChange, status, onStatusChange }: LeadFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <div className="relative flex-1 min-w-[200px]">
        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="חיפוש לפי שם, מייל או טלפון..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pr-10 pl-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
      </div>
      <select
        value={source}
        onChange={(e) => onSourceChange(e.target.value)}
        className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        {sourceOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
      <select
        value={status}
        onChange={(e) => onStatusChange(e.target.value)}
        className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        {statusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </div>
  );
}
