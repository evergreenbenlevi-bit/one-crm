"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface RetentionCustomer {
  id: string;
  name: string;
  program_end_date: string;
  days_remaining: number;
  satisfaction_rating: number | null;
  upsell_status: string;
}

interface RetentionData {
  approaching: RetentionCustomer[];
  avg_satisfaction: number | null;
  upsell_pipeline: {
    candidate: number;
    offered: number;
    accepted: number;
    declined: number;
  };
  total: number;
}

const upsellLabels: Record<string, string> = {
  candidate: "מועמד",
  offered: "הוצע",
  accepted: "אישר",
  declined: "דחה",
};

export function RetentionWidget() {
  const { data, isLoading, error } = useSWR<RetentionData>(
    "/api/customers/retention",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm dark:shadow-gray-900/20">
        <div className="text-sm text-gray-400 dark:text-gray-500">טוען נתוני שימור...</div>
      </div>
    );
  }

  if (error || !data) return null;

  const { approaching, avg_satisfaction, upsell_pipeline } = data;
  const upsellKeys = ["candidate", "offered", "accepted", "declined"] as const;
  const hasUpsell = upsellKeys.some((k) => upsell_pipeline[k] > 0);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm dark:shadow-gray-900/20 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">שימור לקוחות</h2>
      </div>

      <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x rtl:divide-x-reverse divide-gray-100 dark:divide-gray-700">
        {/* Section 1: Approaching end */}
        <div className="p-5">
          <div className="text-xs text-gray-400 dark:text-gray-500 mb-3 font-medium uppercase tracking-wide">
            מתקרבים לסיום
          </div>
          {approaching.length === 0 ? (
            <div className="text-sm text-gray-400 dark:text-gray-500">אין לקוחות בתקופה הקרובה</div>
          ) : (
            <div className="space-y-2">
              {approaching.map((c) => (
                <div key={c.id} className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium dark:text-gray-200">{c.name}</div>
                    {c.satisfaction_rating != null && (
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        שביעות: {c.satisfaction_rating}/10
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap shrink-0">
                    {c.days_remaining === 0
                      ? "היום"
                      : `${c.days_remaining} ימים`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Avg satisfaction */}
        <div className="p-5">
          <div className="text-xs text-gray-400 dark:text-gray-500 mb-3 font-medium uppercase tracking-wide">
            ממוצע שביעות רצון
          </div>
          {avg_satisfaction == null ? (
            <div className="text-sm text-gray-400 dark:text-gray-500">אין דירוגים עדיין</div>
          ) : (
            <div>
              <div className="text-4xl font-bold dark:text-gray-100 tabular-nums">
                {avg_satisfaction}
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">מתוך 10</div>
            </div>
          )}
        </div>

        {/* Section 3: Upsell pipeline */}
        <div className="p-5">
          <div className="text-xs text-gray-400 dark:text-gray-500 mb-3 font-medium uppercase tracking-wide">
            pipeline upsell
          </div>
          {!hasUpsell ? (
            <div className="text-sm text-gray-400 dark:text-gray-500">אין הזדמנויות upsell</div>
          ) : (
            <div className="space-y-2">
              {upsellKeys.map((k) =>
                upsell_pipeline[k] > 0 ? (
                  <div key={k} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-300">{upsellLabels[k]}</span>
                    <span className="text-sm font-medium dark:text-gray-200 tabular-nums">
                      {upsell_pipeline[k]}
                    </span>
                  </div>
                ) : null
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
