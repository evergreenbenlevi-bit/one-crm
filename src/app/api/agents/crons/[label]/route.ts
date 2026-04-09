import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { execSync } from "child_process";

export const preferredRegion = ["fra1", "arn1", "cdg1"];

const LAUNCH_AGENTS_DIR = process.env.HOME + "/Library/LaunchAgents";

// POST /api/agents/crons/[label] — toggle load/unload
export async function POST(request: NextRequest, { params }: { params: Promise<{ label: string }> }) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { label } = await params;
  const body = await request.json();
  const action = body.action as "load" | "unload";

  if (!["load", "unload"].includes(action)) {
    return NextResponse.json({ error: "action must be load or unload" }, { status: 400 });
  }

  // Sanitize label to prevent injection
  if (!/^com\.ben\.[a-z0-9._-]+$/.test(label)) {
    return NextResponse.json({ error: "Invalid label format" }, { status: 400 });
  }

  const plistPath = `${LAUNCH_AGENTS_DIR}/${label}.plist`;

  try {
    if (action === "load") {
      execSync(`launchctl load "${plistPath}" 2>&1`, { encoding: "utf-8" });
    } else {
      execSync(`launchctl unload "${plistPath}" 2>&1`, { encoding: "utf-8" });
    }
    return NextResponse.json({ ok: true, action, label });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    );
  }
}
