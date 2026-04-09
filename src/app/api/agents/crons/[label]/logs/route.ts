import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { readFile } from "fs/promises";
import { join } from "path";
import { parsePlistXml } from "@/lib/agents/parse-plist";

export const preferredRegion = ["fra1", "arn1", "cdg1"];

const LAUNCH_AGENTS_DIR = process.env.HOME + "/Library/LaunchAgents";

// GET /api/agents/crons/[label]/logs — read stdout/stderr logs
export async function GET(request: NextRequest, { params }: { params: Promise<{ label: string }> }) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { label } = await params;
  if (!/^com\.ben\.[a-z0-9._-]+$/.test(label)) {
    return NextResponse.json({ error: "Invalid label format" }, { status: 400 });
  }

  const url = new URL(request.url);
  const lines = parseInt(url.searchParams.get("lines") || "100");

  try {
    const plistContent = await readFile(join(LAUNCH_AGENTS_DIR, `${label}.plist`), "utf-8");
    const parsed = parsePlistXml(plistContent);
    if (!parsed) return NextResponse.json({ error: "Failed to parse plist" }, { status: 500 });

    const stdout = parsed.stdout_path
      ? await readFile(parsed.stdout_path, "utf-8").catch(() => "")
      : "";
    const stderr = parsed.stderr_path
      ? await readFile(parsed.stderr_path, "utf-8").catch(() => "")
      : "";

    // Return last N lines
    const trimLines = (text: string, n: number) =>
      text.split("\n").slice(-n).join("\n");

    return NextResponse.json({
      label,
      stdout: trimLines(stdout, lines),
      stderr: trimLines(stderr, lines),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to read logs" },
      { status: 500 }
    );
  }
}
