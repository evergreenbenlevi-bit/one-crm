import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { calculateSettlement, createSettlement, markSettlementSettled, getSettlementHistory } from "@/lib/queries/settlement";

export const preferredRegion = ["fra1", "arn1", "cdg1"];

// GET /api/settlements — history of settlements
export async function GET(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const history = await getSettlementHistory();
  return NextResponse.json(history);
}

// POST /api/settlements — create settlement for a period
export async function POST(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { period_start, period_end, notes } = body;

  if (!period_start || !period_end) {
    return NextResponse.json({ error: "period_start and period_end required" }, { status: 400 });
  }

  const settlement = await calculateSettlement(period_start, period_end);
  const record = await createSettlement(period_start, period_end, settlement, notes);

  return NextResponse.json(record, { status: 201 });
}

// PATCH /api/settlements?id=<uuid>&action=settle — mark as settled
export async function PATCH(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  await markSettlementSettled(id);
  return NextResponse.json({ ok: true });
}
