import { clsx } from "clsx";

interface TimelineItem {
  date: string;
  type: "event" | "meeting" | "transaction";
  label: string;
  details?: Record<string, unknown>;
}

const typeColors: Record<string, string> = {
  event: "bg-blue-500",
  meeting: "bg-purple-500",
  transaction: "bg-green-500",
};

export function CustomerTimeline({ items }: { items: TimelineItem[] }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <h3 className="text-sm font-bold text-gray-700 mb-4">ציר זמן</h3>

      {items.length === 0 ? (
        <p className="text-sm text-gray-400">אין אירועים</p>
      ) : (
        <div className="relative">
          <div className="absolute right-[7px] top-2 bottom-2 w-0.5 bg-gray-100" />
          <div className="space-y-4">
            {items.map((item, i) => (
              <div key={i} className="flex gap-3 relative">
                <div className={clsx("w-3.5 h-3.5 rounded-full mt-1 flex-shrink-0 z-10 ring-2 ring-white", typeColors[item.type] || "bg-gray-400")} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-400">
                    {new Date(item.date).toLocaleDateString("he-IL", { day: "numeric", month: "short", year: "2-digit" })}
                  </div>
                  <div className="text-sm font-medium mt-0.5">{item.label}</div>
                  {item.details && typeof item.details === "object" && "summary" in item.details && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{String(item.details.summary)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
