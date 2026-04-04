// Seed course_levels + course_modules from ONE™ Program Logic
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  "https://yrurlhjpzkztfwntgpzn.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlydXJsaGpwemt6dGZ3bnRncHpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzk5NzA1MSwiZXhwIjoyMDg5NTczMDUxfQ.-Xf4C6ibFzR4zUmWkVfvG8FXoVCSMwtsl5PvwtFwi4Y"
);

const levels = [
  { id: "L0", number: 0, name: "START HERE", subtitle: "הגדרת המטרה", color: "gray", hex: "#F5F5F5", phase: "FOUNDATION", weeks: "1-2", posi: "שאלון מלא + KPIs מוגדרים + Roadmap אישי", position: 0 },
  { id: "L1", number: 1, name: "THE ARCHITECT", subtitle: "מי אתה?", color: "red", hex: "#C0392B", phase: "FOUNDATION", weeks: "2-4", posi: "Freedom Number + זהות חדשה כתובה + Peak Week plan", position: 1 },
  { id: "L2", number: 2, name: "THE BLUEPRINT", subtitle: "איך המכונה עובדת?", color: "orange", hex: "#E67E22", phase: "FOUNDATION", weeks: "4-6", posi: "Flywheel Roadmap + Client Journey + Next One Thing מוגדר", position: 2 },
  { id: "L3", number: 3, name: "THE ONE™", subtitle: "מה אתה מוכר?", color: "gold", hex: "#F1C40F", phase: "BUILD THE OFFER", weeks: "4-8", posi: "ONE Matrix™ + Offer Doc + תמחור מוגדר + 5 Page Playbook", position: 3 },
  { id: "SPRINT", number: 99, name: "QUICK CASH SPRINT", subtitle: "ולידציה", color: "green", hex: "#27AE60", phase: "FIRST MONEY", weeks: "8-10", posi: "לקוח ראשון + case study ראשון", position: 4 },
  { id: "L4", number: 4, name: "THE COMMUNITY", subtitle: "המנוע שגדל לבד", color: "emerald", hex: "#2ECC71", phase: "SCALE THE SYSTEM", weeks: "10-14", posi: "Email list + automation + Main Magnet", position: 5 },
  { id: "L5", number: 5, name: "THE TRIP™", subtitle: "המסע שלקוח עובר", color: "blue", hex: "#3498DB", phase: "SCALE THE SYSTEM", weeks: "14-18", posi: "90 ימי תוכן מתוכנן + Flywheel פעיל", position: 6 },
  { id: "L6", number: 6, name: "THE CLOSER™", subtitle: "סוגרים בלי לדחוף", color: "navy", hex: "#2C3E50", phase: "CLOSE & CONVERT", weeks: "14-20", posi: "Pipeline מנוהל + % המרה עולה", position: 7 },
  { id: "L7", number: 7, name: "THE ANCHOR™", subtitle: "עומק שבונה authority", color: "purple", hex: "#9B59B6", phase: "AUTHORITY & SCALE", weeks: "20-24", posi: "Long-form series + authority content", position: 8 },
  { id: "L8", number: 8, name: "THE OPERATOR™", subtitle: "מכונה שעובדת בלי שחיקה", color: "black", hex: "#1A1A1A", phase: "AUTHORITY & SCALE", weeks: "24-26", posi: "Systems + ONE AI™ → תוצאות לכמות", position: 9 },
];

const modules = [
  // Level 0
  { level_id: "L0", number: "0.1", name: "ברוכים הבאים", teacher: "both", source: "tom_modified", source_refs: "T01+T04", format: "📹 סרטון (בן+אביתר)", client_benefit: "מבין מה ONE™ ומה נדרש ממנו", position: 0 },
  { level_id: "L0", number: "0.2", name: "שאלון אונבורדינג", teacher: "ben", source: "tom_modified", source_refs: "T05", format: "📋 Google Form", client_benefit: "אנחנו מכירים אותו, הוא מכיר את עצמו", position: 1 },
  { level_id: "L0", number: "0.3", name: "הרמות — איך התהליך עובד", teacher: "ben", source: "tom_modified", source_refs: "T02+T03+T17", format: "📹 סרטון + 📊 Gamma", client_benefit: "יודע מה מחכה לו בכל שלב + POSI", position: 2 },
  { level_id: "L0", number: "0.4", name: "המדדים שלך — KPIs", teacher: "ben", source: "tom_modified", source_refs: "T16+T18", format: "📹 + 📈 KPI Tracker", client_benefit: "יודע מה למדוד ואיך לדעת שהוא מתקדם", position: 3 },
  { level_id: "L0", number: "0.5", name: "Roadmap אישי", teacher: "ben", source: "tom_modified", source_refs: "T07+T15", format: "📹 + 📊 Gamma Roadmap", client_benefit: "סדר עדיפויות ברור לרבעון הקרוב", position: 4 },

  // Level 1
  { level_id: "L1", number: "1.1", name: "The Freedom Number", teacher: "ben", source: "tom", source_refs: "T06", format: "📹 + 📊 Gamma worksheet", client_benefit: "יודע בדיוק כמה צריך להרוויח ולמה", position: 0 },
  { level_id: "L1", number: "1.2", name: "הזהות החדשה", teacher: "ben", source: "tom_modified", source_refs: "T02+T05+T07", format: "📹 + 📊 Gamma: Identity Script", client_benefit: "זהות יזמית ברורה + לוח חזון", position: 1 },
  { level_id: "L1", number: "1.3", name: "גרסת 10.0", teacher: "ben", source: "tom_modified", source_refs: "T04+T10", format: "📹 + 📊 Gamma: 10.0 Toolkit", client_benefit: "כלים לעבודה עמוקה, הגנה על קשב", position: 2 },
  { level_id: "L1", number: "1.4", name: "Peak Week", teacher: "ben", source: "tom", source_refs: "T09", format: "📹 + 📊 Gamma: Peak Week Method", client_benefit: "לוח שבועי שמגן על זמן יצירה", position: 3 },

  // Level 2
  { level_id: "L2", number: "2.1", name: "Infinite Client Loop", teacher: "ben", source: "tom", source_refs: "T03+T06", format: "📹 + גרפיקה (loop diagram)", client_benefit: "רואה איך כל שלב מזין את הבא", position: 0 },
  { level_id: "L2", number: "2.2", name: "ONE Flywheel™", teacher: "ben", source: "tom_modified", source_refs: "T07+T09", format: "📹 + 📊 Gamma: Flywheel Roadmap", client_benefit: "יודע מה לבנות: mini-series, VSL, case study, LF, SF", position: 1 },
  { level_id: "L2", number: "2.3", name: "Golden Client Journey", teacher: "ben", source: "tom", source_refs: "T09+T10", format: "📹 + 📊 Gamma: Journey Map", client_benefit: "רואה את כל הנתיב: randomer → case study", position: 2 },
  { level_id: "L2", number: "2.4", name: "The Next One Thing", teacher: "ben", source: "tom_modified", source_refs: "T04+T05+T08", format: "📹 + גרפיקה", client_benefit: "צעד אחד ברור לרבעון — לא 10 דברים", position: 3 },
  { level_id: "L2", number: "2.5", name: "The Leverage Trap", teacher: "ben", source: "tom", source_refs: "T11", format: "📹 + 📊 Gamma: Leverage Checklist", client_benefit: "מבין שלוקח 18 חודש לפני traction, וזה תקין", position: 4 },

  // Level 3
  { level_id: "L3", number: "3.1", name: "One Simple Offer Blueprint", teacher: "ben", source: "tom", source_refs: "T03", format: "📹 + 📊 Gamma", client_benefit: "מבנה ברור להצעה ב-8 שלבים", position: 0 },
  { level_id: "L3", number: "3.2", name: "The 5 P's", teacher: "ben", source: "tom", source_refs: "T04", format: "📹 + גרפיקה", client_benefit: "Person, Pain, Promise, Path, Platform — messaging חד", position: 1 },
  { level_id: "L3", number: "3.3", name: "Market Research", teacher: "avitar", source: "tom", source_refs: "T05+T06", format: "📹 + 📊 Gamma", client_benefit: "יודע מה מתחרים מציעים + מה חסר", position: 2 },
  { level_id: "L3", number: "3.4", name: "Perfect Future Client", teacher: "avitar", source: "tom", source_refs: "T07", format: "📹 + 📊 Gamma", client_benefit: "הבנה עמוקה של הלקוח האידיאלי", position: 3 },
  { level_id: "L3", number: "3.5", name: "ONE Matrix™", teacher: "ben", source: "tom_modified", source_refs: "T08", format: "📹 + 📊 Gamma", client_benefit: "מבנה ההצעה: 12 drivers, שמות ייחודיים", position: 4 },
  { level_id: "L3", number: "3.6", name: "Pricing + Payments", teacher: "ben", source: "tom_modified", source_refs: "T11+T12", format: "📹 + 📊 Gamma + Sheet", client_benefit: "יודע כמה לגבות ואיך", position: 5 },
  { level_id: "L3", number: "3.7", name: "The Offer Doc", teacher: "ben", source: "tom", source_refs: "T13+T14+T15", format: "📹 + 📊 Gamma template", client_benefit: "מסמך שמוכר לפני שיחה (24/7)", position: 6 },
  { level_id: "L3", number: "3.8", name: "Proof Collection", teacher: "avitar", source: "tom", source_refs: "T09", format: "📹 + גרפיקה", client_benefit: "case studies, עדויות, screenshots", position: 7 },
  { level_id: "L3", number: "3.9", name: "Onboarding Mastery", teacher: "ben", source: "tom_modified", source_refs: "T19+T20", format: "📹 + גרפיקה", client_benefit: "5 C's: Clarity, Certainty, Connection, Consistency, Celebration", position: 8 },
  { level_id: "L3", number: "3.10", name: "The 5 Page Playbook", teacher: "ben", source: "tom_modified", source_refs: "T10+T21", format: "📹 + 📊 Gamma", client_benefit: "IP ייחודי ומסמך מקצועי", position: 9 },

  // Sprint
  { level_id: "SPRINT", number: "S.1", name: "Cash Menu", teacher: "ben", source: "tom_modified", source_refs: "Sprint T01", format: "📹 + גרפיקה", client_benefit: "מפה של כל ה-plays לכסף מהיר", position: 0 },
  { level_id: "SPRINT", number: "S.2", name: "Revival DM Blitz", teacher: "ben", source: "tom_modified", source_refs: "Sprint T02", format: "📹 + templates", client_benefit: "DMs לאנשים שכבר הכרת", position: 1 },
  { level_id: "SPRINT", number: "S.3", name: "Hot List Email", teacher: "ben", source: "tom_modified", source_refs: "Sprint T03", format: "📹 + email templates", client_benefit: "אימייל לרשימה חמה", position: 2 },
  { level_id: "SPRINT", number: "S.4", name: "Flash 48", teacher: "ben", source: "tom_modified", source_refs: "Sprint T04", format: "📹 + scripts", client_benefit: "הצעה ל-48 שעות", position: 3 },
  { level_id: "SPRINT", number: "S.5", name: "Dream Client Invite", teacher: "ben", source: "tom_modified", source_refs: "Sprint T05", format: "📹 + templates", client_benefit: "הזמנה אישית ללקוח חלומות", position: 4 },
  { level_id: "SPRINT", number: "S.6", name: "Beta Cohort Launch", teacher: "ben", source: "tom_modified", source_refs: "Sprint T06", format: "📹 + playbook", client_benefit: "cohort ראשון — ולידציה", position: 5 },
  { level_id: "SPRINT", number: "S.7", name: "Founders Pricing Play", teacher: "ben", source: "tom_modified", source_refs: "Sprint T09", format: "📹 + pricing template", client_benefit: "מחיר מייסדים שיוצר urgency", position: 6 },
  { level_id: "SPRINT", number: "S.8", name: "Behind-The-Curtains Workshop", teacher: "ben", source: "tom_modified", source_refs: "Sprint T08", format: "📹 + workshop plan", client_benefit: "workshop פתוח שמושך לקוחות", position: 7 },
  { level_id: "SPRINT", number: "S.9", name: "Case Study Comeback", teacher: "ben", source: "tom_modified", source_refs: "Sprint T09", format: "📹 + outreach templates", client_benefit: "חזרה ללקוח ישן", position: 8 },

  // Level 4
  { level_id: "L4", number: "4.1", name: "Email = Community", teacher: "ben", source: "tom", source_refs: "T02", format: "📹", client_benefit: "email = הנכס היחיד שלך, 50% קונים אחרי 90 יום", position: 0 },
  { level_id: "L4", number: "4.2", name: "Email Fundamentals", teacher: "ben", source: "tom_modified", source_refs: "T03+T04+T05+T06+T07", format: "📹 + 📊 Gamma", client_benefit: "Kit/Beehive, sender reputation, DNS, deliverability", position: 1 },
  { level_id: "L4", number: "4.3", name: "Email Cadence", teacher: "ben", source: "tom", source_refs: "T12", format: "📹 + calendar template", client_benefit: "3x non-promo, 7x promo, PPPPP sequence", position: 2 },
  { level_id: "L4", number: "4.4", name: "Storytelling: 111 Framework", teacher: "ben", source: "tom", source_refs: "T10+T14", format: "📹 + templates", client_benefit: "Big Idea + Story + Action", position: 3 },
  { level_id: "L4", number: "4.5", name: "Main Magnet", teacher: "ben", source: "tom", source_refs: "T15", format: "📹 + 📊 Gamma", client_benefit: "4 סוגי magnets, YouTube CTAs", position: 4 },
  { level_id: "L4", number: "4.6", name: "Mini-Course Magnet", teacher: "ben", source: "tom", source_refs: "T16", format: "📹 + email sequence template", client_benefit: "8-email sequence, deep links", position: 5 },
  { level_id: "L4", number: "4.7", name: "Free Group Funnel", teacher: "ben", source: "tom_modified", source_refs: "T17", format: "📹 + 📊 Gamma", client_benefit: "funnel שמושך חברי קהילה", position: 6 },
  { level_id: "L4", number: "4.8", name: "ManyChat Automation", teacher: "ben", source: "original", source_refs: "", format: "📹 + walkthrough", client_benefit: "DM automation שחוסכת שעות", position: 7 },
  { level_id: "L4", number: "4.9", name: "Community Management", teacher: "ben", source: "original", source_refs: "", format: "📹 + SOP", client_benefit: "ניהול קהילה שגדלה לבד", position: 8 },
  { level_id: "L4", number: "4.10", name: "Retargeting with Email", teacher: "ben", source: "tom_modified", source_refs: "T08", format: "📹 + 📊 Gamma", client_benefit: "Meta retargeting, custom audiences", position: 9 },

  // Level 5
  { level_id: "L5", number: "5.1", name: "Content Philosophy", teacher: "ben", source: "original", source_refs: "", format: "📹", client_benefit: "הבנת התפקיד של תוכן במערכת", position: 0 },
  { level_id: "L5", number: "5.2", name: "Maturity Stairs™", teacher: "ben", source: "original", source_refs: "", format: "📹 + גרפיקה", client_benefit: "מ-Unaware ל-Ready לקנות", position: 1 },
  { level_id: "L5", number: "5.3", name: "Short Form Formula", teacher: "ben", source: "tom_modified", source_refs: "L05-SF", format: "📹 + templates", client_benefit: "נוסחה ליצירת reels שעובדים", position: 2 },
  { level_id: "L5", number: "5.4", name: "Hook Writing", teacher: "ben", source: "tom_modified", source_refs: "L05-Hooks", format: "📹 + hook bank", client_benefit: "הוקים שעוצרים את הגלילה", position: 3 },
  { level_id: "L5", number: "5.5", name: "Authority Content", teacher: "ben", source: "tom_modified", source_refs: "L05-Authority", format: "📹 + frameworks", client_benefit: "תוכן שבונה אמינות", position: 4 },
  { level_id: "L5", number: "5.6", name: "Storytelling for Reels", teacher: "ben", source: "tom_modified", source_refs: "L05-Story", format: "📹 + story templates", client_benefit: "סיפורים שמחברים ומוכרים", position: 5 },
  { level_id: "L5", number: "5.7", name: "Content Calendar", teacher: "ben", source: "tom_modified", source_refs: "L05-Calendar", format: "📹 + Notion template", client_benefit: "לוח תוכן חודשי מסודר", position: 6 },
  { level_id: "L5", number: "5.8", name: "Batch Production", teacher: "ben", source: "tom_modified", source_refs: "L05-Batch", format: "📹 + SOP", client_benefit: "ייצור תוכן ביום אחד לשבוע שלם", position: 7 },
  { level_id: "L5", number: "5.9", name: "Instagram Growth", teacher: "ben", source: "original", source_refs: "", format: "📹 + strategies", client_benefit: "צמיחה אורגנית באינסטגרם", position: 8 },
  { level_id: "L5", number: "5.10", name: "YouTube Foundations", teacher: "ben", source: "original", source_refs: "", format: "📹 + roadmap", client_benefit: "ערוץ YouTube שמביא לידים", position: 9 },
  { level_id: "L5", number: "5.11", name: "Repurpose Engine", teacher: "ben", source: "original", source_refs: "", format: "📹 + workflow", client_benefit: "LF → SF → Email → Stories — מתוכן אחד", position: 10 },
  { level_id: "L5", number: "5.12", name: "Creator OS", teacher: "ben", source: "tom_modified", source_refs: "T21", format: "📹 + Notion template", client_benefit: "מערכת ניהול תוכן מלאה", position: 11 },

  // Level 6
  { level_id: "L6", number: "6.1", name: "Chat-to-Close", teacher: "ben", source: "original", source_refs: "", format: "📹 + scripts", client_benefit: "שיטת מכירה בצ'אט — בלי שיחות", position: 0 },
  { level_id: "L6", number: "6.2", name: "DM Strategy", teacher: "ben", source: "tom_modified", source_refs: "L06-DM", format: "📹 + templates", client_benefit: "DMs שמרגישים טבעי ומוכרים", position: 1 },
  { level_id: "L6", number: "6.3", name: "Pipeline Management", teacher: "ben", source: "tom_modified", source_refs: "L06-Pipeline", format: "📹 + CRM template", client_benefit: "לדעת בדיוק איפה כל ליד", position: 2 },
  { level_id: "L6", number: "6.4", name: "Triage Call", teacher: "ben", source: "original", source_refs: "", format: "📹 + script", client_benefit: "שיחה קצרה שמסננת לקוחות בשלים", position: 3 },
  { level_id: "L6", number: "6.5", name: "Objection Handling", teacher: "ben", source: "tom_modified", source_refs: "L06-Objections", format: "📹 + playbook", client_benefit: "תשובות לכל התנגדות", position: 4 },
  { level_id: "L6", number: "6.6", name: "Follow-Up System", teacher: "ben", source: "tom_modified", source_refs: "L06-Follow", format: "📹 + automation", client_benefit: "מערכת follow-up שלא מפספסת אף ליד", position: 5 },
  { level_id: "L6", number: "6.7", name: "Social Proof in Sales", teacher: "ben", source: "original", source_refs: "", format: "📹 + examples", client_benefit: "הוכחות חברתיות שסוגרות עסקאות", position: 6 },
  { level_id: "L6", number: "6.8", name: "Pricing Psychology", teacher: "ben", source: "original", source_refs: "", format: "📹 + frameworks", client_benefit: "תמחור שמרגיש כמו עסקה", position: 7 },
  { level_id: "L6", number: "6.9", name: "VSL / Trust Deal", teacher: "ben", source: "tom_modified", source_refs: "T16", format: "📹 + VSL template", client_benefit: "סרטון שמוכר 24/7", position: 8 },
  { level_id: "L6", number: "6.10", name: "Launch Cycle", teacher: "ben", source: "tom_modified", source_refs: "L06-Launch", format: "📹 + launch plan", client_benefit: "מחזור השקה שגדל כל פעם", position: 9 },

  // Level 7
  { level_id: "L7", number: "7.1", name: "Long Form Strategy", teacher: "ben", source: "tom_modified", source_refs: "L07-Strategy", format: "📹 + roadmap", client_benefit: "YouTube/Podcast כערוץ #1 לאמון", position: 0 },
  { level_id: "L7", number: "7.2", name: "Mini-Series Method", teacher: "ben", source: "original", source_refs: "", format: "📹 + planning template", client_benefit: "סדרה שהופכת זר ל-believer", position: 1 },
  { level_id: "L7", number: "7.3", name: "Script Writing", teacher: "ben", source: "tom_modified", source_refs: "L07-Script", format: "📹 + script template", client_benefit: "כתיבת תסריט ליוטיוב שמחזיק צפייה", position: 2 },
  { level_id: "L7", number: "7.4", name: "Production Quality", teacher: "ben", source: "original", source_refs: "", format: "📹 + gear list", client_benefit: "איכות הפקה שבונה authority", position: 3 },
  { level_id: "L7", number: "7.5", name: "Podcast / Interviews", teacher: "ben", source: "original", source_refs: "", format: "📹 + playbook", client_benefit: "פודקאסט כמנוע network + authority", position: 4 },

  // Level 8
  { level_id: "L8", number: "8.1", name: "Systems Thinking", teacher: "ben", source: "original", source_refs: "", format: "📹 + frameworks", client_benefit: "חשיבה מערכתית — כל דבר מחובר", position: 0 },
  { level_id: "L8", number: "8.2", name: "Automation Stack", teacher: "ben", source: "original", source_refs: "", format: "📹 + walkthrough", client_benefit: "כלים שחוסכים 10+ שעות שבועיות", position: 1 },
  { level_id: "L8", number: "8.3", name: "Delegation Playbook", teacher: "ben", source: "original", source_refs: "", format: "📹 + SOP template", client_benefit: "העברת משימות לצוות / VA", position: 2 },
  { level_id: "L8", number: "8.4", name: "AI Systems", teacher: "ben", source: "original", source_refs: "", format: "📹 + tool demos", client_benefit: "AI שעובד בשבילך 24/7", position: 3 },
  { level_id: "L8", number: "8.5", name: "AI Coach for Clients", teacher: "ben", source: "tom_modified", source_refs: "T24", format: "📹 + GPT build", client_benefit: "GPT מותאם ללקוחות שלך", position: 4 },
  { level_id: "L8", number: "8.6", name: "Dashboard & KPIs", teacher: "ben", source: "original", source_refs: "", format: "📹 + Notion template", client_benefit: "דשבורד אחד שמראה הכל", position: 5 },
  { level_id: "L8", number: "8.7", name: "Scale Without Burnout", teacher: "ben", source: "original", source_refs: "", format: "📹 + framework", client_benefit: "הגדלה בלי שחיקה — המטרה הסופית", position: 6 },
];

async function seed() {
  // Upsert levels
  const { error: levelsErr } = await supabase.from("course_levels").upsert(levels, { onConflict: "id" });
  if (levelsErr) { console.error("Levels error:", levelsErr); return; }
  console.log(`✅ ${levels.length} levels seeded`);

  // Update total_modules per level
  for (const l of levels) {
    const count = modules.filter(m => m.level_id === l.id).length;
    await supabase.from("course_levels").update({ total_modules: count }).eq("id", l.id);
  }

  // Delete existing modules and re-insert
  await supabase.from("course_modules").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  // Insert modules in batches
  const batch = modules.map(m => ({ ...m, status: "draft", visible: true }));
  const { error: modsErr } = await supabase.from("course_modules").insert(batch);
  if (modsErr) { console.error("Modules error:", modsErr); return; }
  console.log(`✅ ${modules.length} modules seeded`);
}

seed().then(() => console.log("Done!")).catch(console.error);
