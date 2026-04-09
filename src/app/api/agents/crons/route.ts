import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { parsePlistXml } from "@/lib/agents/parse-plist";
import { execSync } from "child_process";

export const preferredRegion = ["fra1", "arn1", "cdg1"];

const LAUNCH_AGENTS_DIR = process.env.HOME + "/Library/LaunchAgents";

// GET /api/agents/crons — list all com.ben.* LaunchAgents with status
export async function GET(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get loaded agents from launchctl
  let loadedLabels = new Set<string>();
  try {
    const output = execSync("launchctl list 2>/dev/null", { encoding: "utf-8" });
    for (const line of output.split("\n")) {
      const parts = line.trim().split(/\s+/);
      if (parts[2]?.startsWith("com.ben.")) loadedLabels.add(parts[2]);
    }
  } catch {
    // launchctl may not be available in server context
  }

  const files = await readdir(LAUNCH_AGENTS_DIR);
  const plists = files.filter((f) => f.startsWith("com.ben.") && f.endsWith(".plist"));

  const crons = [];
  for (const file of plists) {
    try {
      const content = await readFile(join(LAUNCH_AGENTS_DIR, file), "utf-8");
      const parsed = parsePlistXml(content);
      if (!parsed) continue;

      crons.push({
        ...parsed,
        is_loaded: loadedLabels.has(parsed.label),
        file_name: file,
      });
    } catch {
      // skip unreadable
    }
  }

  crons.sort((a, b) => a.label.localeCompare(b.label));
  return NextResponse.json(crons);
}
