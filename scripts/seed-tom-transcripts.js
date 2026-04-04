// Seed Tom's transcripts into course_modules
// Maps each ONE™ module's source_refs (e.g. "T01+T04") to actual transcript files
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const supabase = createClient(
  "https://yrurlhjpzkztfwntgpzn.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlydXJsaGpwemt6dGZ3bnRncHpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzk5NzA1MSwiZXhwIjoyMDg5NTczMDUxfQ.-Xf4C6ibFzR4zUmWkVfvG8FXoVCSMwtsl5PvwtFwi4Y"
);

const VAULT_BASE = "/Users/benlevi/Library/Mobile Documents/iCloud~md~obsidian/Documents/NEW OBSIDIAN/04_KNOWLEDGE/Courses/Scale-20";

// Map ONE™ level_id → Tom's folder name
const LEVEL_TO_TOM_FOLDER = {
  L0: "L01-START HERE - 0️⃣",
  L1: "L02-LEVEL 1️⃣ - VISION 🔴",
  L2: "L03-LEVEL 2️⃣ - MODEL 🟠",
  L3: "L04-LEVEL 3️⃣ - TRANSFORM 🟡",
  SPRINT: "L05-THE $20K SPRINT",
  L4: "L06-LEVEL 4️⃣ - COMMUNITY 🟢",
  L5: "L07-LEVEL 5️⃣ - FASCINATE 🔵",
  L6: "L08-LEVEL 6️⃣ - INVITE 🎟️",
  L7: "L09-LEVEL 7️⃣ - EDUCATE 🟣",
  L8: "L10-LEVEL 8️⃣ - AI + SYSTEMS ⚡️",
};

// Parse source_refs like "T01+T04" or "T05+T06" or "Sprint T01"
function parseSourceRefs(sourceRefs, levelId) {
  if (!sourceRefs) return [];

  // Handle "Sprint T01" format
  const refs = sourceRefs
    .replace(/Sprint\s*/gi, "")
    .split("+")
    .map(r => r.trim())
    .filter(Boolean);

  return refs;
}

// Find the transcript file for a given T-number in a Tom folder
function findTranscriptFile(tomFolder, tNumber) {
  const folderPath = path.join(VAULT_BASE, tomFolder);
  if (!fs.existsSync(folderPath)) return null;

  const files = fs.readdirSync(folderPath);
  // tNumber is like "T01", "T04" etc
  // Files are like "T01-🙏 Welcome to The Scale20 Crew!.md"
  const num = tNumber.replace("T", "").padStart(2, "0");
  const match = files.find(f => f.startsWith(`T${num}-`) && f.endsWith(".md"));

  if (!match) return null;
  return path.join(folderPath, match);
}

// Read transcript from a file
function readTranscript(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;

  const content = fs.readFileSync(filePath, "utf-8");
  // Extract transcript section
  const transcriptMatch = content.match(/## Transcript\n([\s\S]*?)(?=\n## |\n---|\Z)/);
  if (transcriptMatch) return transcriptMatch[1].trim();

  // If no transcript header, return content after frontmatter
  const afterFrontmatter = content.replace(/^---[\s\S]*?---\n/, "");
  return afterFrontmatter.trim();
}

// Get relative vault path for obsidian URI
function toVaultPath(absPath) {
  const vaultRoot = "/Users/benlevi/Library/Mobile Documents/iCloud~md~obsidian/Documents/NEW OBSIDIAN/";
  return absPath.replace(vaultRoot, "");
}

async function seedTranscripts() {
  // Fetch all modules
  const { data: modules, error } = await supabase
    .from("course_modules")
    .select("id, level_id, number, name, source_refs, source")
    .order("level_id")
    .order("position");

  if (error) { console.error("Fetch error:", error); return; }

  let updated = 0;
  let skipped = 0;

  for (const mod of modules) {
    const tomFolder = LEVEL_TO_TOM_FOLDER[mod.level_id];
    if (!tomFolder) { skipped++; continue; }

    const refs = parseSourceRefs(mod.source_refs, mod.level_id);
    if (refs.length === 0) { skipped++; continue; }

    const transcripts = [];
    const filePaths = [];

    for (const ref of refs) {
      const filePath = findTranscriptFile(tomFolder, ref);
      if (filePath) {
        const transcript = readTranscript(filePath);
        const vaultPath = toVaultPath(filePath);
        filePaths.push(vaultPath);
        if (transcript) {
          const fileName = path.basename(filePath, ".md");
          transcripts.push(`### ${ref}: ${fileName}\n\n${transcript}`);
        }
      }
    }

    if (transcripts.length > 0) {
      const combinedTranscript = transcripts.join("\n\n---\n\n");
      const { error: updateErr } = await supabase
        .from("course_modules")
        .update({
          tom_transcript: combinedTranscript,
          tom_file_paths: filePaths,
        })
        .eq("id", mod.id);

      if (updateErr) {
        console.error(`Error updating ${mod.number} ${mod.name}:`, updateErr.message);
      } else {
        console.log(`✅ ${mod.number} ${mod.name} — ${filePaths.length} source(s), ${combinedTranscript.length} chars`);
        updated++;
      }
    } else {
      skipped++;
    }
  }

  console.log(`\nDone: ${updated} updated, ${skipped} skipped`);
}

seedTranscripts().catch(console.error);
