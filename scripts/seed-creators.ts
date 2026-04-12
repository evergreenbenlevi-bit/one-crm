/**
 * Seed Creator Intel V2 — all 13 creators from Creator-Modeling-Registry.md
 * Run: npx tsx scripts/seed-creators.ts
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

// Load .env.local manually (pattern used by all CRM scripts)
const envContent = readFileSync(".env.local", "utf-8");
for (const line of envContent.split("\n")) {
  const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/);
  if (match) process.env[match[1]] = match[2];
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CREATORS = [
  // Manifesto domain
  {
    handle: "hayleygracepoetry",
    platform: "instagram",
    display_name: "Hayley Grace",
    domain: "manifesto",
    niche: "confessional",
    format_type: "short_form",
    analysis_status: "full",
    vault_path: "04_KNOWLEDGE/Creators/manifesto/hayleygracepoetry/",
    profile_url: "https://www.instagram.com/hayleygracepoetry/",
    instagram_username: "hayleygracepoetry",
    notes: "Voice DNA complete. 50 reels analyzed. Primary manifesto model.",
  },
  {
    handle: "thomasisntreal",
    platform: "instagram",
    display_name: "Thomas",
    domain: "manifesto",
    niche: "confessional",
    format_type: "short_form",
    analysis_status: "partial",
    vault_path: "04_KNOWLEDGE/Creators/manifesto/thomasisntreal/",
    profile_url: "https://www.instagram.com/thomasisntreal/",
    instagram_username: "thomasisntreal",
    notes: "Priority 1 — manifesto format critical for viral content.",
  },
  // AI/Tech domain
  {
    handle: "keshavsuki",
    platform: "instagram",
    display_name: "Keshav Sukirya",
    domain: "ai_tech",
    niche: "ai_creator",
    format_type: "short_form",
    analysis_status: "partial",
    vault_path: "04_KNOWLEDGE/Creators/AI/keshavsuki/",
    profile_url: "https://www.instagram.com/keshavsuki/",
    instagram_username: "keshavsuki",
    notes: "AI consulting, Claude workflows. Benchmark creator.",
  },
  {
    handle: "sergegatari",
    platform: "instagram",
    display_name: "Serge Gatari",
    domain: "ai_tech",
    niche: "ai_creator",
    format_type: "short_form",
    analysis_status: "partial",
    vault_path: "04_KNOWLEDGE/Creators/AI/sergegatari/",
    profile_url: "https://www.instagram.com/sergegatari/",
    instagram_username: "sergegatari",
    notes: "Also on YouTube. AI agency building.",
  },
  {
    handle: "wassimyounes_",
    platform: "instagram",
    display_name: "Wassim Younes",
    domain: "ai_tech",
    niche: "ai_creator",
    format_type: "short_form",
    analysis_status: "partial",
    vault_path: "04_KNOWLEDGE/Creators/AI/wassimyounes_/",
    profile_url: "https://www.instagram.com/wassimyounes_/",
    instagram_username: "wassimyounes_",
    notes: "Corpus exists. Missing full DNA analysis.",
  },
  {
    handle: "zodchiii",
    platform: "instagram",
    display_name: "Zodchi",
    domain: "ai_tech",
    niche: "ai_creator",
    format_type: "short_form",
    analysis_status: "none",
    vault_path: "04_KNOWLEDGE/Creators/AI/zodchiii/",
    profile_url: "https://www.instagram.com/zodchiii/",
    instagram_username: "zodchiii",
    notes: null,
  },
  {
    handle: "andreapalacio_ai",
    platform: "instagram",
    display_name: "Andrea Palacio",
    domain: "ai_tech",
    niche: "ai_creator",
    format_type: "short_form",
    analysis_status: "none",
    vault_path: "04_KNOWLEDGE/Creators/AI/andreapalacio/",
    profile_url: "https://www.instagram.com/andreapalacio_ai/",
    instagram_username: "andreapalacio_ai",
    notes: null,
  },
  {
    handle: "michellescomputer",
    platform: "instagram",
    display_name: "Michelle's Computer",
    domain: "ai_tech",
    niche: "ai_creator",
    format_type: "short_form",
    analysis_status: "none",
    vault_path: "04_KNOWLEDGE/Creators/AI/michellescomputer/",
    profile_url: "https://www.instagram.com/michellescomputer/",
    instagram_username: "michellescomputer",
    notes: null,
  },
  {
    handle: "the.rachelwoods",
    platform: "instagram",
    display_name: "Rachel Woods",
    domain: "ai_tech",
    niche: "ai_creator",
    format_type: "short_form",
    analysis_status: "none",
    vault_path: "04_KNOWLEDGE/Creators/AI/the.rachelwoods/",
    profile_url: "https://www.instagram.com/the.rachelwoods/",
    instagram_username: "the.rachelwoods",
    notes: null,
  },
  {
    handle: "angus.sewell",
    platform: "instagram",
    display_name: "Angus Sewell",
    domain: "ai_tech",
    niche: "ai_creator",
    format_type: "short_form",
    analysis_status: "partial",
    vault_path: "04_KNOWLEDGE/Creators/AI/angus.sewell/",
    profile_url: "https://www.instagram.com/angus.sewell/",
    instagram_username: "angus.sewell",
    notes: "Marketing copy + AI prompts. Ben loves his style.",
  },
  // Business domain
  {
    handle: "codiesanchez",
    platform: "instagram",
    display_name: "Codie Sanchez",
    domain: "business",
    niche: "business_coach",
    format_type: "short_form",
    analysis_status: "none",
    vault_path: "04_KNOWLEDGE/Creators/business/codiesanchez/",
    profile_url: "https://www.instagram.com/codiesanchez/",
    instagram_username: "codiesanchez",
    notes: null,
  },
  // Personal domain
  {
    handle: "emonthebrain",
    platform: "instagram",
    display_name: "Emon the Brain",
    domain: "personal",
    niche: "other",
    format_type: "short_form",
    analysis_status: "none",
    vault_path: "04_KNOWLEDGE/Creators/adhd/emonthebrain/",
    profile_url: "https://www.instagram.com/emonthebrain/",
    instagram_username: "emonthebrain",
    notes: "Highlights first. ADHD/personal format.",
  },
  {
    handle: "mikhailnadeson",
    platform: "instagram",
    display_name: "Mikhail Nadeson",
    domain: "personal",
    niche: "other",
    format_type: "short_form",
    analysis_status: "none",
    vault_path: "04_KNOWLEDGE/Creators/adhd/mikhailnadeson/",
    profile_url: "https://www.instagram.com/mikhailnadeson/",
    instagram_username: "mikhailnadeson",
    notes: null,
  },
];

async function seed() {
  console.log(`Seeding ${CREATORS.length} creators...`);

  for (const creator of CREATORS) {
    const { data, error } = await supabase
      .from("creators")
      .upsert(creator, {
        onConflict: "handle,platform",
        ignoreDuplicates: false,
      })
      .select("id, handle")
      .single();

    if (error) {
      console.error(`ERROR: ${creator.handle} — ${error.message}`);
    } else {
      console.log(`OK: ${data.handle} (${data.id})`);
    }
  }

  console.log("Done.");
}

seed().catch(console.error);
