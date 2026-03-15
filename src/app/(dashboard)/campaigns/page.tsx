import { getCampaigns } from "@/lib/queries/campaigns";
import { CampaignsTable } from "@/components/campaigns/campaigns-table";
import { BarChart3 } from "lucide-react";

export default async function CampaignsPage() {
  const campaigns = await getCampaigns();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
          <BarChart3 size={20} className="text-brand-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">קמפיינים</h1>
          <p className="text-sm text-gray-400">ביצועי קמפיינים ממומנים</p>
        </div>
      </div>

      <CampaignsTable campaigns={campaigns} />
    </div>
  );
}
