import { getMeetings } from "@/lib/queries/meetings";
import { MeetingsList } from "@/components/meetings/meetings-list";
import { Calendar } from "lucide-react";
import { startOfWeek, endOfWeek, format } from "date-fns";

export default async function MeetingsPage() {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 0 });

  const meetings = await getMeetings(
    format(weekStart, "yyyy-MM-dd"),
    format(weekEnd, "yyyy-MM-dd")
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
          <Calendar size={20} className="text-brand-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">פגישות</h1>
          <p className="text-sm text-gray-400">תצוגת שבוע נוכחי</p>
        </div>
      </div>

      <MeetingsList meetings={meetings} />
    </div>
  );
}
