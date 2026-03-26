-- Content Ideas Pipeline — Admin Only
-- Added: 2026-03-25
-- Purpose: Content ideas board (short-form, long-form, inspirations) migrated from Monday.com
-- Access: admin only (Ben)

-- ============================================================
-- 1. Fix existing content_metrics table (add title, rename post_date)
-- ============================================================
ALTER TABLE content_metrics ADD COLUMN IF NOT EXISTS title text;
-- post_date may already be renamed to published_at via Management API
DO $$ BEGIN
  ALTER TABLE content_metrics RENAME COLUMN post_date TO published_at;
EXCEPTION WHEN undefined_column THEN NULL; END $$;

-- ============================================================
-- 2. Content Ideas table
-- ============================================================
CREATE TYPE content_idea_type AS ENUM (
  'short_form',       -- רילסים וסרטונים קצרים
  'long_form',        -- YouTube ותוכן ארוך
  'inspiration'       -- לינקים והשראות
);

CREATE TYPE content_idea_status AS ENUM (
  'idea',             -- רעיון חדש
  'working',          -- בתהליך
  'scripted',         -- יש סקריפט
  'filmed',           -- צולם
  'published',        -- פורסם
  'parked'            -- לא עכשיו
);

CREATE TABLE content_ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  type content_idea_type NOT NULL,
  status content_idea_status NOT NULL DEFAULT 'idea',
  platform text,                         -- instagram, youtube, linkedin, tiktok
  format text,                           -- reel, short, long (15-30), long (30-60), series, documentary
  notes text,
  reference_url text,                    -- לינק השראה
  tags text[],                           -- תגיות חופשיות
  sort_order integer DEFAULT 0,          -- סדר תצוגה
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_content_ideas_type ON content_ideas(type);
CREATE INDEX idx_content_ideas_status ON content_ideas(status);
CREATE INDEX idx_content_ideas_type_status ON content_ideas(type, status);

-- RLS — admin only
ALTER TABLE content_ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin only — content_ideas" ON content_ideas
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
    )
  );

CREATE POLICY "Service role full access — content_ideas" ON content_ideas
  FOR ALL USING (auth.role() = 'service_role');

-- Updated_at trigger
DO $$ BEGIN
  CREATE TRIGGER set_content_ideas_updated_at
    BEFORE UPDATE ON content_ideas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 3. Seed data from Monday.com migration files
-- ============================================================

-- Short Form Ideas (from 07_CONTENT/short-form-ideas.md)
INSERT INTO content_ideas (title, type, status, notes, sort_order) VALUES
  ('Behind the scenes — גאון משוגע', 'short_form', 'working', NULL, 1),
  ('מה זה הסחת דעת', 'short_form', 'working', NULL, 2),
  ('Get back to what worked', 'short_form', 'working', NULL, 3),
  ('Counter Hormozi — פוקוס על משימה', 'short_form', 'working', NULL, 4),
  ('Relaxed people make more money', 'short_form', 'working', NULL, 5),
  ('סרטון 1 — The Morning Spiral', 'short_form', 'working', NULL, 6),
  ('סרטון 2 — The 80% Graveyard', 'short_form', 'working', NULL, 7),
  ('סרטון 3 — The 3-Hour Decision', 'short_form', 'working', NULL, 8),
  ('למה עידן ה-AI מסוכן', 'short_form', 'working', NULL, 9),
  ('Even knowing is not enough', 'short_form', 'working', NULL, 10),
  ('The cost of upgrading', 'short_form', 'working', NULL, 11),
  ('Why giving a f*ck is never good', 'short_form', 'working', NULL, 12),
  ('Longevity — נגד עצות יועצים', 'short_form', 'working', NULL, 13),
  ('סטרס שובר יצירתיות', 'short_form', 'working', NULL, 14),
  ('איך לבחור מודל עסקי', 'short_form', 'working', NULL, 15),
  ('3000 שיחות עם Claude', 'short_form', 'working', NULL, 16),
  ('שנה עם Obsidian', 'short_form', 'working', NULL, 17),
  ('הזמן הטוב ביותר להיכנס למדיה', 'short_form', 'working', NULL, 18),
  ('דברים שלמדתי מהמלחמה', 'short_form', 'working', NULL, 19),
  ('AI Leveraged Creator Academy', 'short_form', 'working', NULL, 20),
  ('מדריך אקספוננציאליות', 'short_form', 'working', NULL, 21),
  ('AI Simple Case Use — מתי להחליף מודל', 'short_form', 'working', NULL, 22),
  ('אין קל ואין קשה — יש מוכר ויש לא מוכר', 'short_form', 'idea', NULL, 23),
  ('המוח עובד טוב יותר כשאתה "משחק" ולא "שורד"', 'short_form', 'idea', 'Neuroscience — Ref: instagram reel DQE8xeRkerI', 24),
  ('10 הרגלים להישאר רלוונטי ב-5 שנים הבאות — AI', 'short_form', 'idea', 'Ref: instagram reel DVH1CG5DuHa', 25),
  ('סרטון נוירולוגיה/התפתחות אישית — האדם והעסק הם אחד', 'short_form', 'idea', NULL, 26);

-- Long Form Ideas (from 07_CONTENT/long-form-ideas.md)
INSERT INTO content_ideas (title, type, status, format, notes, sort_order) VALUES
  ('למה ניהול זמן לא עובד לכם', 'long_form', 'idea', 'long (15-30)', 'לא פותרים בעיות של אופטימיזציה לפני שהשורש נפתר', 1),
  ('Fake Productivity / OPI — למה אתם לא מתקדמים בקצב שאתם יכולים', 'long_form', 'idea', 'long (15-30)', 'המוח בוחר בשבילכם במשימה בעדיפות 3', 2),
  ('למה יזמים אנליטיים חייבים מנטור (לא מאמן)', 'long_form', 'idea', 'long (15-30)', NULL, 3),
  ('Loops של פגיעה בביטחון — מודעות עצמית שמובילה לשחיקה', 'long_form', 'idea', 'long (15-30)', NULL, 4),
  ('למה הסקיל היקר ביותר לא משנה (אם אין לך את היסודות)', 'long_form', 'idea', 'long (15-30)', NULL, 5),
  ('Context Switching — הרוצח השקט של פוקוס', 'long_form', 'idea', 'long (15-30)', NULL, 6),
  ('למה ללמוד את עצמכם היא התשובה (לא עוד AI courses)', 'long_form', 'idea', 'long (15-30)', 'AI כולם לומדים, הבידול זה אתם', 7),
  ('ספורטאי עילית vs יזמים — מה ניתן ללמוד', 'long_form', 'idea', 'long (15-30)', 'מדידת Volume של עבודה — מה שלמדתי כספורטאי עילית', 8),
  ('הסביבה הרעילה שלך (למה אף אחד לא אומר לך את זה)', 'long_form', 'idea', 'long (15-30)', NULL, 9),
  ('Get back to what worked — למה חזרתי ל-5 שנים אחורה', 'long_form', 'idea', 'long (15-30)', 'לפני 5 שנים הייתי מטורף — הבריאות הנפשית הכי טובה', 10),
  ('צפיתי במעל 1500 סרטונים — הפארטו של מה שצריך לדעת', 'long_form', 'idea', 'long (30-60)', NULL, 11),
  ('כרונוטייפ — סדרת 4 חלקים', 'long_form', 'idea', 'series', NULL, 12),
  ('3 Scene Video Series — SCRIPTED', 'long_form', 'idea', 'series', NULL, 13),
  ('6-Part Series: סגרתי 2 עסקים ב-7 ספרות', 'long_form', 'idea', 'series', NULL, 14),
  ('איך להצליח בעולם החדש — 6 Part Series', 'long_form', 'idea', 'series', NULL, 15),
  ('למה חזרתי למה שעבד לי לפני 5 שנים', 'long_form', 'idea', NULL, NULL, 16),
  ('למה עידן ה-AI הוא המסוכן ביותר', 'long_form', 'idea', NULL, NULL, 17),
  ('למה דווקא Relaxed & Laid Back עושים הרבה יותר כסף', 'long_form', 'idea', NULL, NULL, 18),
  ('למה השבוע הבא תמיד נראה יותר טוב', 'long_form', 'idea', NULL, NULL, 19),
  ('איך אני כותב 3 פוסטים ביום ב-20 דקות', 'long_form', 'idea', NULL, NULL, 20),
  ('למה הדבר היחיד שאתם צריכים ללמוד זה את עצמכם', 'long_form', 'idea', NULL, NULL, 21),
  ('למה אלכס הורמוזי טועה (בחירת המשימה הנכונה)', 'long_form', 'idea', NULL, NULL, 22),
  ('HOW TO ACHIEVE ANYTHING IN YOUR LIFE', 'long_form', 'idea', NULL, NULL, 23),
  ('דוקומנטרי — מתחיל מ-0 במדינה זרה', 'long_form', 'idea', 'documentary', NULL, 24);

-- Inspirations (from 07_CONTENT/inspirations.md)
INSERT INTO content_ideas (title, type, status, platform, notes, sort_order) VALUES
  ('השראה — YT Short', 'inspiration', 'idea', 'youtube', NULL, 1),
  ('מידול — YT video', 'inspiration', 'idea', 'youtube', NULL, 2),
  ('חדש לא נכנס — YT', 'inspiration', 'idea', 'youtube', NULL, 3),
  ('השליטה במוח — YT', 'inspiration', 'idea', 'youtube', NULL, 4),
  ('השראה — YT video', 'inspiration', 'idea', 'youtube', NULL, 5),
  ('השראה — YT video 2', 'inspiration', 'idea', 'youtube', NULL, 6),
  ('השראה — YT Short 2', 'inspiration', 'idea', 'youtube', NULL, 7),
  ('מידול עסקי — YT', 'inspiration', 'idea', 'youtube', NULL, 8),
  ('השראה — YT Short 3', 'inspiration', 'idea', 'youtube', NULL, 9),
  ('Auto Research — YT', 'inspiration', 'idea', 'youtube', NULL, 10),
  ('השראה — IG reel', 'inspiration', 'idea', 'instagram', NULL, 11),
  ('רעיון להוק — IG', 'inspiration', 'idea', 'instagram', NULL, 12),
  ('השראה — IG reel 2', 'inspiration', 'idea', 'instagram', NULL, 13),
  ('חשוב רצח — IG reel', 'inspiration', 'idea', 'instagram', NULL, 14),
  ('Claude כותב כמו בן אדם — IG', 'inspiration', 'idea', 'instagram', NULL, 15),
  ('חשוב להוסיף — IG', 'inspiration', 'idea', 'instagram', NULL, 16),
  ('סקיל כתיבה — IG', 'inspiration', 'idea', 'instagram', NULL, 17),
  ('השראה — IG reel 3', 'inspiration', 'idea', 'instagram', NULL, 18),
  ('Skill Creator — IG חשוב', 'inspiration', 'idea', 'instagram', NULL, 19),
  ('סקיל סקפטיות — IG', 'inspiration', 'idea', 'instagram', NULL, 20),
  ('Plugins — IG', 'inspiration', 'idea', 'instagram', NULL, 21),
  ('השראה — IG reel 4', 'inspiration', 'idea', 'instagram', NULL, 22),
  ('השראה — IG reel 5', 'inspiration', 'idea', 'instagram', NULL, 23),
  ('כלי — Notebook LM', 'inspiration', 'idea', NULL, NULL, 24),
  ('כלי — Vibiz.ai', 'inspiration', 'idea', NULL, NULL, 25);
