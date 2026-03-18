import { Greeting } from "@/components/dashboard/greeting";
import { GoalProgress } from "@/components/dashboard/goal-progress";
import { RevenueSection } from "@/components/dashboard/revenue-section";
import { LeadsSection } from "@/components/dashboard/leads-section";
import { ActionItems } from "@/components/dashboard/action-items";
import {
  getDashboardData,
  getTopAds,
  getHotLeads,
  getUpcomingMeetings,
  getEndingPrograms,
  getRevenueChart,
  getCurrentGoal,
} from "@/lib/queries/dashboard";

export default async function DashboardPage() {
  const [data, topAds, hotLeads, meetings, ending, chartData, goal] = await Promise.all([
    getDashboardData("month"),
    getTopAds(3),
    getHotLeads(),
    getUpcomingMeetings(),
    getEndingPrograms(),
    getRevenueChart(),
    getCurrentGoal(),
  ]);

  // Generate achievement sentence
  let achievement = "";
  if (data.revenue.oneVipCount > 0) {
    achievement = `החודש סגרת ${data.revenue.oneVipCount} לקוחות חדשים ל-ONE™ VIP`;
  } else if (data.revenue.oneCoreCount > 0) {
    achievement = `החודש ${data.revenue.oneCoreCount} אנשים רכשו ONE™ Core`;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
        <div className="flex-1">
          <Greeting achievement={achievement} />
        </div>
        <div className="lg:w-96">
          <GoalProgress goal={goal} />
        </div>
      </div>

      <RevenueSection revenue={data.revenue} chartData={chartData} />

      <LeadsSection
        leadsCount={data.leads.count}
        costPerLead={data.leads.costPerLead}
        cac={data.leads.cac}
        conversionRate={data.leads.conversionRate}
        roi={data.leads.roi}
        topAds={topAds}
      />

      <ActionItems
        hotLeads={hotLeads}
        upcomingMeetings={meetings}
        endingPrograms={ending}
      />
    </div>
  );
}
