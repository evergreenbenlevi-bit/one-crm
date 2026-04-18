import { NextRequest, NextResponse } from "next/server";

// Prefer EU regions (Frankfurt/Stockholm) — closer to Israel than default US East
export const preferredRegion = ["fra1", "arn1", "cdg1"];

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api-auth";

const VALID_STATUSES = ["active", "paused", "done", "archived"] as const;
const VALID_PRIORITIES = ["p1", "p2", "p3"] as const;
const VALID_PORTFOLIOS = ["one", "solo", "harness", "exploratory"] as const;
const VALID_OWNERS = ["ben", "claude", "both", "avitar"] as const;

type ProjectStatus = typeof VALID_STATUSES[number];
type ProjectPriority = typeof VALID_PRIORITIES[number];

function validateProjectFields(body: Record<string, unknown>, requireTitle = false): string | null {
  if (requireTitle && (!body.title || typeof body.title !== "string" || !body.title.trim())) {
    return "title is required";
  }
  if (body.status !== undefined && !VALID_STATUSES.includes(body.status as ProjectStatus)) {
    return `status must be one of: ${VALID_STATUSES.join(", ")}`;
  }
  if (body.priority !== undefined && !VALID_PRIORITIES.includes(body.priority as ProjectPriority)) {
    return `priority must be one of: ${VALID_PRIORITIES.join(", ")}`;
  }
  if (body.portfolio !== undefined && body.portfolio !== null && !VALID_PORTFOLIOS.includes(body.portfolio as typeof VALID_PORTFOLIOS[number])) {
    return `portfolio must be one of: ${VALID_PORTFOLIOS.join(", ")}`;
  }
  if (body.owner !== undefined && !VALID_OWNERS.includes(body.owner as typeof VALID_OWNERS[number])) {
    return `owner must be one of: ${VALID_OWNERS.join(", ")}`;
  }
  if (body.deadline !== undefined && body.deadline !== null) {
    if (typeof body.deadline !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(body.deadline)) {
      return "deadline must be a valid date string (YYYY-MM-DD)";
    }
  }
  return null;
}

// ── GET /api/projects ──
export async function GET(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { searchParams } = new URL(request.url);

  let query = supabase.from("projects").select("*");

  const status = searchParams.get("status");
  const portfolio = searchParams.get("portfolio");
  const owner = searchParams.get("owner");

  if (status && VALID_STATUSES.includes(status as ProjectStatus)) {
    query = query.eq("status", status);
  } else if (!status) {
    // Default: exclude archived
    query = query.neq("status", "archived");
  }

  if (portfolio && VALID_PORTFOLIOS.includes(portfolio as typeof VALID_PORTFOLIOS[number])) {
    query = query.eq("portfolio", portfolio);
  }
  if (owner && VALID_OWNERS.includes(owner as typeof VALID_OWNERS[number])) {
    query = query.eq("owner", owner);
  }

  const { data, error } = await query.order("position").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// ── POST /api/projects ──
export async function POST(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const validationError = validateProjectFields(body, true);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  const supabase = createAdminClient();

  const sanitized = {
    title: (body.title as string).trim(),
    description: body.description?.trim() || null,
    status: body.status || "active",
    priority: body.priority || "p2",
    category: body.category?.trim() || null,
    portfolio: body.portfolio || null,
    owner: body.owner || "ben",
    position: typeof body.position === "number" ? body.position : 0,
    deadline: body.deadline || null,
    estimated_minutes: typeof body.estimated_minutes === "number" ? body.estimated_minutes : null,
    tags: Array.isArray(body.tags) ? body.tags.filter((t: unknown) => typeof t === "string").slice(0, 20) : [],
  };

  const { data, error } = await supabase.from("projects").insert([sanitized]).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
