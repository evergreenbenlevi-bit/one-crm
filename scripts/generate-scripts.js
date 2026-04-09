/**
 * generate-scripts.js
 * Generates Hebrew teaching scripts for all 77 ONE™ course modules.
 * - Modules WITH tom_transcript → extract key teaching points, write in Ben's voice
 * - Modules WITHOUT (source=original) → create outline with [placeholder] markers
 */

const Anthropic = require("@anthropic-ai/sdk");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  "https://yrurlhjpzkztfwntgpzn.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlydXJsaGpwemt6dGZ3bnRncHpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzk5NzA1MSwiZXhwIjoyMDg5NTczMDUxfQ.-Xf4C6ibFzR4zUmWkVfvG8FXoVCSMwtsl5PvwtFwi4Y"
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ─── Prompts ────────────────────────────────────────────────────────────────

function buildTranscriptPrompt(module) {
  return `אתה Ben Levi — מרצה ישיר, שיחתי, מערבב אנגלית בצורה טבעית. כותב כמו שמדבר לחבר.

יש לך transcript של Tom Young מהמודול הבא:
- שם מודול: ${module.name} (מספר ${module.number})
- מה הלקוח מרוויח: ${module.client_benefit}
- פורמט: ${module.format}

Transcript:
${module.tom_transcript}

כתוב script הוראה בעברית במבנה הבא בדיוק:

## Hook (0-15 שניות)
[משפט פתיחה אחד — ישיר, punchy, מבוסס על מה שTom מלמד. לא שאלה רטורית. לא "ברוכים הבאים".]

## Main
[5-8 bullet points של הנקודות המרכזיות מהtranscript. כל bullet = משפט אחד-שניים. שמור על frameworks/methodologies באנגלית (Flywheel, Offer Doc, Peak Week Method, וכו'). כתוב בגוף ראשון ("תבנה", "תגדיר", "תשתמש"). אין פילר. אין הקדמות.]

## CTA
"עכשיו פתח את הPlaybook ועשה [פעולה ספציפית אחת בדיוק מהחומר — מה Tom מבקש שיעשו]"

חוקים:
- עברית בלבד (חוץ מterms טכניים)
- אין "בהחלט", "ניתן לראות כי", "על מנת ל", "אשמח לסייע"
- משפטים קצרים. ישיר. בלי padding.
- CTA = פעולה ספציפית, לא "תחשוב על זה"`;
}

function buildOutlinePrompt(module) {
  return `אתה Ben Levi — מרצה ישיר, שיחתי, מערבב אנגלית בצורה טבעית.

יש לך מודול ללא transcript. צריך ליצור outline לscript:
- שם מודול: ${module.name} (מספר ${module.number})
- מה הלקוח מרוויח: ${module.client_benefit}
- פורמט: ${module.format}

כתוב script outline בעברית במבנה הבא בדיוק:

## Hook (0-15 שניות)
[placeholder: פתיחה על הנושא "${module.name}" — מה הכאב שהמודול פותר]

## Main
- [placeholder: נקודה עיקרית 1 — הגדרה/concept מרכזי של ${module.name}]
- [placeholder: נקודה עיקרית 2 — איך זה עובד בפועל]
- [placeholder: נקודה עיקרית 3 — הטעות הנפוצה שאנשים עושים]
- [placeholder: נקודה עיקרית 4 — הפתרון / הmethod]
- [placeholder: נקודה עיקרית 5 — תוצאה — מה קורה אחרי שמיישמים]

## CTA
"[placeholder: פעולה ספציפית שהלקוח יעשה אחרי המודול הזה בהתאם ל: ${module.client_benefit}]"

חוקים:
- [placeholder] markers בתוך הטקסט — ברור איפה צריך לכתוב תוכן אמיתי
- המבנה צריך להיות ברור ומוכן לכתיבה
- אין לכתוב "ניתן לראות" וכו'`;
}

// ─── Generate script via Claude ──────────────────────────────────────────────

async function generateScript(module) {
  const hasTranscript =
    module.tom_transcript && module.tom_transcript.trim().length > 50;
  const prompt = hasTranscript
    ? buildTranscriptPrompt(module)
    : buildOutlinePrompt(module);

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  return message.content[0].text.trim();
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("📚 Fetching modules from Supabase...");

  const { data: modules, error } = await supabase
    .from("course_modules")
    .select("id, number, name, source, format, client_benefit, tom_transcript")
    .neq("source", "removed")
    .order("number");

  if (error) {
    console.error("Failed to fetch modules:", error);
    process.exit(1);
  }

  console.log(`Found ${modules.length} modules to process\n`);

  const results = { success: 0, failed: 0, errors: [] };

  for (let i = 0; i < modules.length; i++) {
    const module = modules[i];
    const hasTranscript =
      module.tom_transcript && module.tom_transcript.trim().length > 50;
    const type = hasTranscript ? "transcript" : "outline";

    process.stdout.write(
      `[${i + 1}/${modules.length}] ${module.number} ${module.name} (${type})... `
    );

    try {
      const script = await generateScript(module);

      const { error: updateError } = await supabase
        .from("course_modules")
        .update({ script })
        .eq("id", module.id);

      if (updateError) {
        console.log("✗ DB error");
        results.failed++;
        results.errors.push(`${module.number} ${module.name}: ${updateError.message}`);
      } else {
        console.log("✓");
        results.success++;
      }

      // Rate limit: ~3 req/sec to stay safe
      await new Promise((r) => setTimeout(r, 350));
    } catch (err) {
      console.log("✗ API error");
      results.failed++;
      results.errors.push(`${module.number} ${module.name}: ${err.message}`);
    }
  }

  console.log("\n─────────────────────────────────");
  console.log(`✅ Success: ${results.success}/${modules.length}`);
  if (results.failed > 0) {
    console.log(`❌ Failed: ${results.failed}`);
    results.errors.forEach((e) => console.log("  •", e));
  }
  console.log("Done.");
}

main().catch(console.error);
