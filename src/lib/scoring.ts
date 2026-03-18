export type ScoreLevel = "cold" | "warm" | "hot" | "ready";

export interface LeadScore {
  fitScore: number;
  engagementScore: number;
  totalScore: number;
  level: ScoreLevel;
}

interface ScoringLead {
  occupation?: string | null;
  has_existing_clients?: boolean;
  monthly_revenue?: number | null;
  current_status?: string;
  visited_offer_doc?: boolean;
  downloaded_lead_magnet?: boolean;
  last_activity_at?: string | null;
}

function getLevel(score: number): ScoreLevel {
  if (score >= 51) return "ready";
  if (score >= 36) return "hot";
  if (score >= 16) return "warm";
  return "cold";
}

export function calculateLeadScore(lead: ScoringLead): LeadScore {
  let fitScore = 0;
  let engagementScore = 0;

  // --- Fit scoring ---
  const occupation = (lead.occupation || "").toLowerCase();
  if (["expert", "consultant", "coach", "מומחה", "יועץ", "מאמן"].some(k => occupation.includes(k))) {
    fitScore += 15;
  }
  if (lead.has_existing_clients) {
    fitScore += 10;
  }
  if (lead.monthly_revenue && lead.monthly_revenue > 10000) {
    fitScore += 10;
  }

  // --- Engagement scoring ---
  const status = lead.current_status || "";
  if (status === "consumed_content") engagementScore += 1;
  if (status === "engaged") engagementScore += 8;
  if (status === "applied") engagementScore += 20;

  if (lead.visited_offer_doc) engagementScore += 10;
  if (lead.downloaded_lead_magnet) engagementScore += 5;

  // --- Decay ---
  if (lead.last_activity_at) {
    const daysSince = Math.floor(
      (Date.now() - new Date(lead.last_activity_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSince >= 30) {
      engagementScore = Math.max(0, engagementScore - 10);
    }
  }

  const totalScore = fitScore + engagementScore;

  return {
    fitScore,
    engagementScore,
    totalScore,
    level: getLevel(totalScore),
  };
}
