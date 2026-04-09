import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { runSync } from "@/lib/agents/sync-engine";

export const preferredRegion = ["fra1", "arn1", "cdg1"];
export const maxDuration = 30;

// POST /api/agents/sync — scan filesystem and upsert all agents to DB
export async function POST(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await runSync();
  return NextResponse.json(result);
}
