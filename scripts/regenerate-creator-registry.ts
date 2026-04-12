/**
 * Regenerate Creator-Modeling-Registry.md from DB
 * Phase 8: Vault ↔ CRM Sync (light)
 *
 * Run: npx tsx scripts/regenerate-creator-registry.ts
 * Cron: weekly Sunday (after instagram-sync completes)
 *
 * Output: vault/07_CONTENT/Creator-Modeling-Registry.md
 */

import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "fs";
import { join } from "path";

const VAULT_BASE = join(
  process.env.HOME!,
  "Library/Mobile Documents/iCloud~md~obsidian/Documents/NEW OBSIDIAN"
);
const REGISTRY_PATH = join(VAULT_BASE, "07_CONTENT/Creator-Modeling-Registry.md");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DOMAIN_LABELS: Record<string, string> = {
  manifesto: "Manifesto / Thought Leadership",
  ai_tech: "AI / Tech",
  business: "Business / Entrepreneurship",
  personal: "Personal Brand",
  production: "Production / Creative",
  other: "Other",
};

const STATUS_ICON: Record<string, string> = {
  full: "✅",
  partial: "🔶",
  none: "⬜",
};

function formatNum(n: number | null): string {
  if (!n) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

async function main() {
  const { data: creators, error } = await supabase
    .from("creators")
    .select(
      "id, handle, display_name, platform, domain, format_type, follower_count, avg_views, analysis_status, vault_path, last_synced_at, niche, pattern_notes, profile_url"
    )
    .eq("active", true)
    .order("domain")
    .order("follower_count", { ascending: false });

  if (error) {
    console.error("Supabase error:", error.message);
    process.exit(1);
  }

  if (!creators?.length) {
    console.log("No active creators found.");
    return;
  }

  // Group by domain
  const byDomain: Record<string, typeof creators> = {};
  for (const c of creators) {
    const d = c.domain ?? "other";
    if (!byDomain[d]) byDomain[d] = [];
    byDomain[d].push(c);
  }

  const now = new Date().toISOString().slice(0, 10);
  const lines: string[] = [
    "---",
    "type: registry",
    "source: auto-generated — DO NOT edit manually",
    `updated: ${now}`,
    "source_of_truth: ONE-CRM → creators table",
    "---",
    "",
    "# Creator Modeling Registry",
    "",
    `> Auto-generated ${now} from CRM database. Edit creators in ONE-CRM → /creator-intel, not here.`,
    `> Total active creators: ${creators.length}`,
    "",
  ];

  const domainOrder = ["manifesto", "ai_tech", "business", "personal", "production", "other"];
  for (const domain of domainOrder) {
    const group = byDomain[domain];
    if (!group?.length) continue;

    lines.push(`## ${DOMAIN_LABELS[domain] ?? domain}`);
    lines.push("");
    lines.push("| Status | Handle | Platform | Format | Followers | Avg Views | Vault |");
    lines.push("|--------|--------|----------|--------|-----------|-----------|-------|");

    for (const c of group) {
      const icon = STATUS_ICON[c.analysis_status ?? "none"] ?? "⬜";
      const handle = c.profile_url
        ? `[@${c.handle}](${c.profile_url})`
        : `@${c.handle}`;
      const platform = c.platform === "youtube" ? "YouTube" : "Instagram";
      const format = c.format_type === "short_form" ? "Short" : c.format_type === "long_form" ? "Long" : "Both";
      const vaultLink = c.vault_path ? `[→ vault](${c.vault_path})` : "—";

      lines.push(
        `| ${icon} | ${handle} | ${platform} | ${format} | ${formatNum(c.follower_count)} | ${formatNum(c.avg_views)} | ${vaultLink} |`
      );
    }

    lines.push("");

    // Pattern notes for creators who have them
    const withNotes = group.filter((c) => c.pattern_notes);
    if (withNotes.length > 0) {
      lines.push("### Pattern Notes");
      lines.push("");
      for (const c of withNotes) {
        lines.push(`**@${c.handle}:** ${c.pattern_notes}`);
        lines.push("");
      }
    }
  }

  lines.push("---");
  lines.push(`*Last sync: ${now} | Source: CRM creators table*`);

  writeFileSync(REGISTRY_PATH, lines.join("\n"), "utf8");
  console.log(`✅ Registry regenerated: ${REGISTRY_PATH}`);
  console.log(`   ${creators.length} creators across ${Object.keys(byDomain).length} domains`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
