import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api-auth";
import type { ExpenseCategory, ExpenseType, Partner } from "@/lib/types/database";

export const preferredRegion = ["fra1", "arn1", "cdg1"];

const VALID_CATEGORIES: ExpenseCategory[] = [
  "meta_ads", "ai_tools", "editing_design", "software",
  "content_creation", "coaching_tools", "education", "skool", "other",
  "haircut", "car_wash", "groceries", "personal_other", "fuel",
];
const VALID_EXPENSE_TYPES: ExpenseType[] = ["business", "personal"];
const PERSONAL_CATEGORIES: ExpenseCategory[] = [
  "haircut", "car_wash", "groceries", "personal_other",
];
const VALID_PARTNERS: Partner[] = ["ben", "avitar", "shared"];

// GET /api/expenses?from=2026-01-01&to=2026-04-30&paid_by=ben
export async function GET(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const paidBy = searchParams.get("paid_by") as Partner | null;
  const expType = searchParams.get("expense_type") as ExpenseType | null;

  const supabase = createAdminClient();
  let query = supabase
    .from("expenses")
    .select("*")
    .order("date", { ascending: false });

  if (from) query = query.gte("date", from);
  if (to) query = query.lte("date", to);
  if (paidBy && VALID_PARTNERS.includes(paidBy)) query = query.eq("paid_by", paidBy);
  if (expType && VALID_EXPENSE_TYPES.includes(expType)) query = query.eq("expense_type", expType);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

// POST /api/expenses
export async function POST(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  // Validate required fields
  if (!body.category || !VALID_CATEGORIES.includes(body.category)) {
    return NextResponse.json({ error: `category must be one of: ${VALID_CATEGORIES.join(", ")}` }, { status: 400 });
  }
  if (!body.amount || typeof body.amount !== "number" || body.amount <= 0) {
    return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
  }
  if (!body.date) {
    return NextResponse.json({ error: "date is required (YYYY-MM-DD)" }, { status: 400 });
  }

  // Auto-detect expense_type from category if not provided
  const isPersonalCategory = PERSONAL_CATEGORIES.includes(body.category);
  const expenseType: ExpenseType = body.expense_type || (isPersonalCategory ? "personal" : "business");
  if (!VALID_EXPENSE_TYPES.includes(expenseType)) {
    return NextResponse.json({ error: `expense_type must be one of: ${VALID_EXPENSE_TYPES.join(", ")}` }, { status: 400 });
  }

  // Personal expenses: force paid_by=ben, split_ratio=0
  const paidBy = expenseType === "personal" ? "ben" : (body.paid_by || "shared");
  if (!VALID_PARTNERS.includes(paidBy)) {
    return NextResponse.json({ error: `paid_by must be one of: ${VALID_PARTNERS.join(", ")}` }, { status: 400 });
  }

  const splitRatio = expenseType === "personal" ? 0 : (body.split_ratio ?? 0.5);
  if (splitRatio < 0 || splitRatio > 1) {
    return NextResponse.json({ error: "split_ratio must be between 0 and 1" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("expenses")
    .insert({
      category: body.category,
      amount: body.amount,
      date: body.date,
      description: body.description || null,
      paid_by: paidBy,
      split_ratio: splitRatio,
      expense_type: expenseType,
      receipt_url: body.receipt_url || null,
      is_recurring: body.is_recurring || false,
      notes: body.notes || null,
      external_id: body.external_id || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}

// PATCH /api/expenses?id=<uuid>
export async function PATCH(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const body = await request.json();

  if (body.category && !VALID_CATEGORIES.includes(body.category)) {
    return NextResponse.json({ error: `Invalid category` }, { status: 400 });
  }
  if (body.paid_by && !VALID_PARTNERS.includes(body.paid_by)) {
    return NextResponse.json({ error: `Invalid paid_by` }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("expenses")
    .update(body)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

// DELETE /api/expenses?id=<uuid>
export async function DELETE(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const supabase = createAdminClient();
  const { error } = await supabase.from("expenses").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
