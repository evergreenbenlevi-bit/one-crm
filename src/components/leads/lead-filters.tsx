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
  { value: "instagram", label: "אינסטגרם" },
  { value: "linkedin", label: "לינקדאין" },
  { value: "content", label: "תוכן" },
  { value: "webinar", label: "וובינר" },
  { value: "skool", label: "Skool" },
  { value: "other", label: "אחר" },
];

const statusOptions = [
  { value: "", label: "כל הסטטוסים" },
  { value: "new", label: "חדש" },
  { value: "consumed_content", label: "צרך תוכן" },
  { value: "engaged", label: "ביצע אינטראקציה" },
  { value: "applied", label: "הגיש בקשה" },
  { value: "qualified", label: "מתאים" },
  { value: "onboarding", label: "בתהליך קליטה" },
  { value: "active_client", label: "לקוח פעיל" },
  { value: "completed", label: "סיים תוכנית" },
  { value: "lost", label: "אבוד" },
];

export function LeadFilters({ search, onSearchChange, source, onSourceChange, status, onStatusChange }: LeadFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <div className="relative flex-1 min-w-[200px]">
        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
        <input
          type="text"
          placeholder="חיפוש לפי שם, מייל או טלפון..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pr-10 pl-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
      </div>
      <select
        value={source}
        onChange={(e) => onSourceChange(e.target.value)}
        className="px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        {sourceOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
      <select
        value={status}
        onChange={(e) => onStatusChange(e.target.value)}
        className="px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        {statusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </div>
  );
}
