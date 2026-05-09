import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SQL_FIX_HISTORY = `
DELETE FROM supabase_migrations.schema_migrations 
WHERE version IN ('20260328', '20260401')
  AND version NOT LIKE '%_%';
`;

const SQL_AREAS = `
CREATE TABLE IF NOT EXISTS areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  icon text,
  color text DEFAULT '#6366f1',
  position int NOT NULL DEFAULT 0,
  is_active bool NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id uuid NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  icon text,
  position int NOT NULL DEFAULT 0,
  href text,
  is_active bool NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(area_id, slug)
);

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS folder_id uuid REFERENCES folders(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_folder_id ON tasks(folder_id);

INSERT INTO areas (name, slug, icon, color, position) VALUES
  ('EDEN™', 'one', 'Briefcase', '#6366f1', 0),
  ('Self', 'self', 'User', '#10b981', 1),
  ('Brand', 'brand', 'Megaphone', '#f59e0b', 2),
  ('Ops', 'ops', 'Settings', '#6b7280', 3)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO folders (area_id, name, slug, href, position)
SELECT a.id, f.name, f.slug, f.href, f.position
FROM areas a
JOIN (VALUES
  ('one', 'Course', 'course', '/course-builder', 0),
  ('one', 'Launch', 'launch', '/campaigns', 1),
  ('one', 'CRM', 'crm', '/leads', 2),
  ('one', 'Portal', 'portal', null, 3),
  ('brand', 'Content', 'content', '/content', 0),
  ('brand', 'Creator Intel', 'creator-intel', '/creator-intel', 1),
  ('brand', 'Campaigns', 'campaigns', '/campaigns', 2),
  ('brand', 'Media', 'media', null, 3),
  ('self', 'Tasks', 'tasks', '/tasks', 0),
  ('self', 'Projects', 'projects', '/projects', 1),
  ('self', 'Fitness', 'fitness', '/fitness', 2),
  ('self', 'Finance', 'finance', '/financial', 3),
  ('ops', 'Triage', 'triage', '/triage', 0),
  ('ops', 'Dump', 'dump', '/dump', 1),
  ('ops', 'Agents', 'agents', '/agents', 2),
  ('ops', 'Settings', 'settings', '/settings', 3)
) AS f(area_slug, name, slug, href, position)
ON a.slug = f.area_slug
ON CONFLICT (area_id, slug) DO NOTHING;
`;

const SQL_CONTENT = `
CREATE TABLE IF NOT EXISTS content_pieces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  hook text,
  angle text,
  format text CHECK (format IN ('reel', 'carousel', 'post', 'story')),
  platform text CHECK (platform IN ('instagram', 'youtube', 'both')) DEFAULT 'instagram',
  pillar text,
  status text NOT NULL DEFAULT 'idea'
    CHECK (status IN ('idea', 'scripting', 'ready_to_film', 'filmed', 'editing', 'live', 'analyzing')),
  film_date date,
  publish_date date,
  script text,
  reference_urls text[] DEFAULT '{}',
  views int DEFAULT 0,
  saves int DEFAULT 0,
  shares int DEFAULT 0,
  comments int DEFAULT 0,
  viral_score float DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_content_pieces_status ON content_pieces(status);
CREATE INDEX IF NOT EXISTS idx_content_pieces_publish_date ON content_pieces(publish_date);
`;

Deno.serve(async (req) => {
  const key = req.headers.get("x-run-key");
  if (key !== "migrate-2026-04-29") {
    return new Response("unauthorized", { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const results: Record<string, string> = {};

  // Note: supabase-js doesn't support raw SQL for DDL
  // But we can use the REST API directly from inside the function
  const dbUrl = Deno.env.get("SUPABASE_DB_URL");
  if (!dbUrl) {
    return Response.json({ error: "No SUPABASE_DB_URL available" }, { status: 500 });
  }

  // Use postgres driver via npm
  const { Client } = await import("npm:pg");
  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  try {
    await client.query(SQL_AREAS);
    results.areas = "OK";
  } catch (e: unknown) {
    results.areas = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
  }

  try {
    await client.query(SQL_CONTENT);
    results.content = "OK";
  } catch (e: unknown) {
    results.content = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
  }

  try {
    await client.query(SQL_FIX_HISTORY);
    results.history_fix = "OK";
  } catch (e: unknown) {
    results.history_fix = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
  }

  await client.end();
  return Response.json(results);
});
