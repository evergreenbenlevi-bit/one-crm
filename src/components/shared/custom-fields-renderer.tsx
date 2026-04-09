"use client";

import { useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

interface CustomField {
  id: string;
  entity_type: string;
  field_name: string;
  field_label: string;
  field_type: "text" | "number" | "select" | "date" | "boolean";
  options_json: string[] | null;
  sort_order: number;
  is_active: boolean;
}

interface CustomFieldValue {
  id: string;
  field_id: string;
  entity_id: string;
  value: string | null;
}

interface Props {
  entityType: "lead" | "expense" | "task";
  entityId: string;
}

export function CustomFieldsRenderer({ entityType, entityId }: Props) {
  const { data: fields } = useSWR<CustomField[]>(`/api/custom-fields?entity_type=${entityType}`, fetcher);
  const { data: rawValues, mutate: mutateValues } = useSWR<CustomFieldValue[]>(`/api/custom-field-values?entity_id=${entityId}`, fetcher);
  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  // Sync fetched values to local state
  useEffect(() => {
    if (rawValues) {
      const map: Record<string, string> = {};
      for (const v of rawValues) {
        map[v.field_id] = v.value || "";
      }
      setLocalValues(map);
    }
  }, [rawValues]);

  const activeFields = (fields || []).filter(f => f.is_active);

  const saveValue = useCallback(async (fieldId: string, value: string) => {
    setSaving(fieldId);
    await fetch("/api/custom-field-values", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field_id: fieldId, entity_id: entityId, value }),
    });
    mutateValues();
    setSaving(null);
  }, [entityId, mutateValues]);

  if (!activeFields.length) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700">
      <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">שדות מותאמים</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {activeFields.map(field => {
          const val = localValues[field.id] || "";

          return (
            <div key={field.id}>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{field.field_label}</label>

              {field.field_type === "text" && (
                <input
                  type="text"
                  value={val}
                  onChange={e => setLocalValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                  onBlur={() => saveValue(field.id, val)}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200 dark:focus:ring-brand-700"
                />
              )}

              {field.field_type === "number" && (
                <input
                  type="number"
                  value={val}
                  onChange={e => setLocalValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                  onBlur={() => saveValue(field.id, val)}
                  dir="ltr"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200 dark:focus:ring-brand-700"
                />
              )}

              {field.field_type === "select" && (
                <select
                  value={val}
                  onChange={e => {
                    const newVal = e.target.value;
                    setLocalValues(prev => ({ ...prev, [field.id]: newVal }));
                    saveValue(field.id, newVal);
                  }}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
                >
                  <option value="">בחר...</option>
                  {(field.options_json || []).map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              )}

              {field.field_type === "date" && (
                <input
                  type="date"
                  value={val}
                  onChange={e => {
                    const newVal = e.target.value;
                    setLocalValues(prev => ({ ...prev, [field.id]: newVal }));
                    saveValue(field.id, newVal);
                  }}
                  dir="ltr"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
                />
              )}

              {field.field_type === "boolean" && (
                <button
                  onClick={() => {
                    const newVal = val === "true" ? "false" : "true";
                    setLocalValues(prev => ({ ...prev, [field.id]: newVal }));
                    saveValue(field.id, newVal);
                  }}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    val === "true"
                      ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {val === "true" ? "כן" : "לא"}
                </button>
              )}

              {saving === field.id && (
                <span className="text-xs text-gray-400 mt-1">שומר...</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
