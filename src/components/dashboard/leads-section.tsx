import { StatCard } from "@/components/ui/stat-card";
import { Users, Target, TrendingUp, DollarSign, BarChart3 } from "lucide-react";
import type { Campaign } from "@/lib/types/database";

interface LeadsSectionProps {
  leadsCount: number;
  costPerLead: number;
  cac: number;
  conversionRate: number;
  roi: number;
  topAds: Campaign[];
}

export function LeadsSection({ leadsCount, costPerLead, cac, conversionRate, roi, topAds }: LeadsSectionProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2">
        <BarChart3 size={20} className="text-brand-600" />
        לידים וקמפיינים
      </h2>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="לידים" value={String(leadsCount)} icon={Users} />
        <StatCard label="עלות ליד" value={`₪${costPerLead}`} icon={Target} />
        <StatCard label="עלות גיוס לקוח" value={`₪${cac}`} icon={DollarSign} />
        <StatCard label="אחוז המרה" value={`${conversionRate}%`} icon={TrendingUp} />
        <StatCard label="ROI" value={`${roi}%`} icon={TrendingUp} />
      </div>

      {topAds.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-3">🏆 מודעות מנצחות</h3>
          <div className="space-y-3">
            {topAds.map((ad, i) => {
              const cpl = ad.leads_count > 0 ? (Number(ad.daily_spend) / ad.leads_count).toFixed(1) : "—";
              const conv = ad.leads_count > 0 && ad.clicks > 0 ? ((ad.leads_count / ad.clicks) * 100).toFixed(1) : "—";
              return (
                <div key={ad.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-brand-600">{i + 1}.</span>
                    <span className="text-sm truncate max-w-[200px]">{ad.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>₪{cpl}/ליד</span>
                    <span>{conv}% המרה</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
