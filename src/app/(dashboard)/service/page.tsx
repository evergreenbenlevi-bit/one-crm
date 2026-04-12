import { createAdminClient } from "@/lib/supabase/admin";
import { Phone } from "lucide-react";
import { ServiceCallsClient } from "@/components/service/service-calls-client";

async function getServiceCallsData() {
  const supabase = createAdminClient();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [allRes, monthRes] = await Promise.all([
    supabase
      .from("service_calls")
      .select("*, customers(name)")
      .order("call_date", { ascending: false })
      .limit(100),
    supabase
      .from("service_calls")
      .select("response_time_hours, satisfaction_rating, nps_score")
      .gte("call_date", monthStart),
  ]);

  const calls = allRes.data || [];
  const monthCalls = monthRes.data || [];

  const totalThisMonth = monthCalls.length;

  const withResponseTime = monthCalls.filter(c => c.response_time_hours != null);
  const avgResponseTime = withResponseTime.length
    ? withResponseTime.reduce((sum, c) => sum + Number(c.response_time_hours), 0) / withResponseTime.length
    : null;

  const withSatisfaction = monthCalls.filter(c => c.satisfaction_rating != null);
  const avgSatisfaction = withSatisfaction.length
    ? withSatisfaction.reduce((sum, c) => sum + Number(c.satisfaction_rating), 0) / withSatisfaction.length
    : null;

  const withNps = monthCalls.filter(c => c.nps_score != null);
  const avgNps = withNps.length
    ? Math.round(withNps.reduce((sum, c) => sum + Number(c.nps_score), 0) / withNps.length)
    : null;

  return { calls, totalThisMonth, avgResponseTime, avgSatisfaction, avgNps };
}

export default async function ServicePage() {
  const { calls, totalThisMonth, avgResponseTime, avgSatisfaction, avgNps } = await getServiceCallsData();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Phone size={24} className="text-gray-700 dark:text-gray-300" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">שיחות שירות</h1>
        </div>
        <ServiceCallsClient calls={calls} showAddButton />
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="text-xs text-gray-400 dark:text-gray-500 mb-1">שיחות החודש</div>
          <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{totalThisMonth}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="text-xs text-gray-400 dark:text-gray-500 mb-1">ממוצע זמן מענה (שעות)</div>
          <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {avgResponseTime != null ? avgResponseTime.toFixed(1) : "—"}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="text-xs text-gray-400 dark:text-gray-500 mb-1">ממוצע שביעות רצון</div>
          <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {avgSatisfaction != null ? `${avgSatisfaction.toFixed(1)}/10` : "—"}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="text-xs text-gray-400 dark:text-gray-500 mb-2">NPS ממוצע</div>
          <div className={`text-3xl font-bold ${
            avgNps == null ? "text-gray-400" :
            avgNps >= 50 ? "text-gray-900 dark:text-gray-100" :
            avgNps >= 0 ? "text-gray-600 dark:text-gray-300" :
            "text-gray-500 dark:text-gray-400"
          }`}>
            {avgNps != null ? avgNps : "—"}
          </div>
          {avgNps != null && (
            <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {avgNps >= 50 ? "מצוין (יעד >50)" : avgNps >= 0 ? "בינוני (יעד >50)" : "שלילי"}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <ServiceCallsClient calls={calls} />
    </div>
  );
}
