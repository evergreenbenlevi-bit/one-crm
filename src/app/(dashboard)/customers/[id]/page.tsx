import { getCustomerById } from "@/lib/queries/customers";
import { notFound } from "next/navigation";
import { CustomerCardHeader } from "@/components/customers/customer-card-header";
import { CustomerTimeline } from "@/components/customers/timeline";
import { CustomerTabs } from "@/components/customers/customer-tabs";

const eventLabels: Record<string, string> = {
  registered: "נרשם כליד",
  watched_vsl: "צפה בסרטון מכירה",
  got_wa: "קיבל הודעות וואטסאפ",
  replied_watched: "ענה ״צפיתי״",
  filled_questionnaire: "מילא שאלון התאמה",
  sales_call: "שיחת מכירה",
  purchased: "רכש",
};

const meetingLabels: Record<string, string> = {
  sales_call: "שיחת מכירה",
  onboarding: "פגישת Onboarding",
  monthly_1on1: "פגישה 1:1 חודשית",
  group_zoom: "זום קבוצתי",
};

const productLabels: Record<string, string> = {
  freedom: "החופש לשווק",
  simply_grow: "פשוט לצמוח",
};

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await getCustomerById(id);

  if (!customer) notFound();

  // Build timeline from events, meetings, transactions, notes
  const timelineItems = [
    ...customer.events.map((e: { timestamp: string; event_type: string; metadata: Record<string, unknown> }) => ({
      date: e.timestamp,
      type: "event" as const,
      label: eventLabels[e.event_type] || e.event_type,
      details: e.metadata,
    })),
    ...customer.meetings.map((m: { date: string; type: string; summary: string | null }) => ({
      date: m.date,
      type: "meeting" as const,
      label: meetingLabels[m.type] || m.type,
      details: m.summary ? { summary: m.summary } : undefined,
    })),
    ...customer.transactions.map((t: { date: string; product: string; amount: number }) => ({
      date: t.date,
      type: "transaction" as const,
      label: `רכש ${productLabels[t.product] || t.product} — ₪${Number(t.amount).toLocaleString("he-IL")}`,
    })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1 space-y-6">
        <CustomerCardHeader customer={customer} />
        <CustomerTabs customer={customer} />
      </div>
      <div className="lg:w-80 lg:sticky lg:top-6 lg:self-start">
        <CustomerTimeline items={timelineItems} />
      </div>
    </div>
  );
}
