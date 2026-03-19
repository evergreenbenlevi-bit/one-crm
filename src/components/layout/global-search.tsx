"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Users, Briefcase } from "lucide-react";
import { clsx } from "clsx";

interface SearchResult {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

interface SearchResults {
  leads: (SearchResult & { current_status: string; program: string })[];
  customers: (SearchResult & { status: string })[];
}

const statusLabels: Record<string, string> = {
  new: "חדש",
  consumed_content: "תוכן",
  engaged: "אינטראקציה",
  applied: "בקשה",
  qualified: "מתאים",
  onboarding: "קליטה",
  active_client: "לקוח פעיל",
  completed: "סיים",
  lost: "אבוד",
  active: "פעיל",
  churned: "נטש",
};

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({ leads: [], customers: [] });
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (query.length < 2) {
      setResults({ leads: [], customers: [] });
      setOpen(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasResults = results.leads.length > 0 || results.customers.length > 0;

  function navigate(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <div ref={wrapperRef} className="relative w-full max-w-sm">
      <div className="relative">
        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="חפש לידים ולקוחות..."
          className="w-full pr-9 pl-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:focus:ring-brand-700 focus:border-brand-400 dark:focus:border-brand-500 transition-colors"
        />
        {loading && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <div className="w-3.5 h-3.5 border-2 border-brand-300 border-t-brand-600 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {open && (
        <div className="absolute top-full mt-1 inset-x-0 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 z-50 overflow-hidden">
          {!hasResults && (
            <div className="px-4 py-3 text-sm text-gray-400 dark:text-gray-500">אין תוצאות</div>
          )}

          {results.leads.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/50 flex items-center gap-1.5">
                <Users size={12} />
                לידים
              </div>
              {results.leads.map((lead) => (
                <button
                  key={lead.id}
                  onClick={() => navigate(`/leads/${lead.id}`)}
                  className="w-full px-4 py-2.5 text-right hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{lead.name}</div>
                    {lead.email && <div className="text-xs text-gray-400 dark:text-gray-500 truncate">{lead.email}</div>}
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                    {statusLabels[lead.current_status] || lead.current_status}
                  </span>
                </button>
              ))}
            </div>
          )}

          {results.customers.length > 0 && (
            <div className={clsx(results.leads.length > 0 && "border-t border-gray-100 dark:border-gray-700")}>
              <div className="px-3 py-1.5 text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/50 flex items-center gap-1.5">
                <Briefcase size={12} />
                לקוחות
              </div>
              {results.customers.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => navigate(`/customers/${customer.id}`)}
                  className="w-full px-4 py-2.5 text-right hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{customer.name}</div>
                    {customer.email && <div className="text-xs text-gray-400 dark:text-gray-500 truncate">{customer.email}</div>}
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                    {statusLabels[customer.status] || customer.status}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
