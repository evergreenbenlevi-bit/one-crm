-- Research Items — Admin Only
-- Added: 2026-03-25
-- Purpose: Track all research files with status and action taken
-- Access: admin only (Ben)

CREATE TYPE research_status AS ENUM (
  'pending',        -- עוד לא קיבל התייחסות
  'waiting_ben',    -- ממתין לתשובת בן
  'implementing',   -- הטמעה בתהליך
  'done',           -- יושם / הושלם
  'cancelled'       -- בוטל / לא רלוונטי
);

CREATE TYPE research_category AS ENUM (
  'tech_tools',
  'content_social',
  'business_strategy',
  'systems_automation',
  'ai_agents',
  'personal'
);

CREATE TABLE research_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  research_date date NOT NULL DEFAULT CURRENT_DATE,
  category research_category NOT NULL DEFAULT 'tech_tools',
  status research_status NOT NULL DEFAULT 'pending',
  file_path text,                    -- path in Obsidian vault
  action_taken text,                 -- מה נגזר / בוצע
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_research_status ON research_items(status);
CREATE INDEX idx_research_date ON research_items(research_date DESC);
CREATE INDEX idx_research_category ON research_items(category);

-- RLS — admin only
ALTER TABLE research_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin only — research" ON research_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
    )
  );

CREATE POLICY "Service role full access" ON research_items
  FOR ALL USING (auth.role() = 'service_role');

-- Updated_at trigger
DO $$ BEGIN
  CREATE TRIGGER set_research_updated_at
    BEFORE UPDATE ON research_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Seed: existing research items (from vault 04_KNOWLEDGE/Research_Results/)
INSERT INTO research_items (title, research_date, category, status, file_path, action_taken) VALUES
  ('Playwright Skill — החלפת Playwright MCP', '2026-03-22', 'tech_tools', 'done', '04_KNOWLEDGE/Research_Results/2026-03-22_playwright-alternatives-optimization.md', 'node ~/.claude/skills/playwright/scripts/run.js פעיל'),
  ('Context Mode MCP — חיסכון 98% context', '2026-03-15', 'tech_tools', 'done', '04_KNOWLEDGE/Research_Results/2026-03-15_context-mode-mcp-context-saving.md', 'מותקן, ctx_batch_execute פעיל'),
  ('Mirofish Swarm Intelligence', '2026-03-18', 'ai_agents', 'done', '04_KNOWLEDGE/Research_Results/2026-03-18_mirofish-swarm-intelligence.md', '~/mirofish/ פעיל'),
  ('Gemini Image Generation Mastery', '2026-03-20', 'tech_tools', 'done', '04_KNOWLEDGE/Research_Results/2026-03-20_gemini-image-generation-mastery.md', 'Prompt Library + brand lock system נוצר'),
  ('Clay MCP — Lead Enrichment', '2026-03-22', 'tech_tools', 'done', NULL, 'מותקן, 100 lookups/חודש free'),
  ('ElevenLabs MCP — TTS + Voice Cloning', '2026-03-21', 'tech_tools', 'done', NULL, 'פעיל, 10K chars/חודש free'),
  ('YouTube MCP — ניהול ערוץ + Analytics', '2026-03-21', 'tech_tools', 'done', NULL, 'פעיל, 10K units/day'),
  ('Sub-Agents Best Practices', '2026-03-14', 'ai_agents', 'done', '04_KNOWLEDGE/Research_Results/2026-03-14_sub-agents-best-practices.md', 'מיושם בכל ה-workflow'),
  ('DocEngine Design System — Tom Young Visual DNA', '2026-03-19', 'business_strategy', 'done', '04_KNOWLEDGE/Research_Results/2026-03-19_docengine-design-tools-master-audit.md', 'DOCENGINE-DESIGN-SYSTEM.md פעיל'),
  ('APIFY Scraping — Trending Content', '2026-03-22', 'tech_tools', 'done', NULL, 'מותקן, $5 credits/חודש'),
  ('Remotion Video Pipeline — 11 Overlay Components', '2026-03-19', 'tech_tools', 'implementing', '04_KNOWLEDGE/Research_Results/2026-03-19_remotion-integration-evaluation.md', 'Session 4 הושלמה — ממתין לrender test'),
  ('ManyChat × Claude — AI DM Flows', '2026-03-23', 'systems_automation', 'implementing', NULL, '4 flows מתוכננים — ממתין לחיבור API key ע"י בן'),
  ('Instagram DM Automation Agent', '2026-03-17', 'systems_automation', 'waiting_ben', '04_KNOWLEDGE/Research_Results/2026-03-17_instagram-dm-automation-agent.md', 'החלטה נדרשת: ManyChat vs N8N'),
  ('Canva MCP — Setup', '2026-03-17', 'tech_tools', 'waiting_ben', '04_KNOWLEDGE/Research_Results/2026-03-17_canva-mcp-research.md', 'צריך Composio API Key + OAuth מבן'),
  ('AI Economy — Expert Value בעידן AI', '2026-03-15', 'business_strategy', 'pending', '04_KNOWLEDGE/Research_Results/2026-03-15_ai-economy-expert-value.md', NULL),
  ('Multi-Model Orchestration', '2026-03-15', 'ai_agents', 'pending', '04_KNOWLEDGE/Research_Results/2026-03-15_multi-model-orchestration.md', NULL),
  ('Brand Naming Strategies', '2026-03-16', 'business_strategy', 'pending', '04_KNOWLEDGE/Research_Results/2026-03-16_brand-naming-strategies.md', NULL),
  ('Investment Structure Trends 2026', '2026-03-16', 'business_strategy', 'pending', '04_KNOWLEDGE/Research_Results/2026-03-16_investment-structure-trends-2026.md', NULL),
  ('Nick Saraev — Content Strategy Research', '2026-03-17', 'content_social', 'pending', '04_KNOWLEDGE/Research_Results/2026-03-17_nick-saraev-research.md', NULL),
  ('Complete Person Profiling Frameworks', '2026-03-17', 'personal', 'pending', '04_KNOWLEDGE/Research_Results/2026-03-17_complete-person-profiling-frameworks.md', NULL),
  ('Algorithm Update March 2026 — Instagram', '2026-03-17', 'content_social', 'pending', '04_KNOWLEDGE/Research_Results/2026-03-17_algorithm-update-march-2026.md', NULL),
  ('Voice AI Agent Pricing', '2026-03-17', 'business_strategy', 'pending', '04_KNOWLEDGE/Research_Results/2026-03-17_voice-ai-agent-pricing.md', NULL),
  ('Higgsfield + Design Tools Landscape', '2026-03-19', 'tech_tools', 'pending', '04_KNOWLEDGE/Research_Results/2026-03-19_design-tools-gravity-higgsfield.md', NULL),
  ('Agentic Workflows Deep Research', '2026-03-19', 'ai_agents', 'pending', '04_KNOWLEDGE/Research_Results/2026-03-19_agentic-workflows-deep-research.md', NULL),
  ('CRM Scale Architecture', '2026-03-19', 'systems_automation', 'pending', '04_KNOWLEDGE/Research_Results/2026-03-19_crm-scale-architecture.md', NULL),
  ('Relevance AI — Evaluation for Stack', '2026-03-25', 'tech_tools', 'pending', '04_KNOWLEDGE/Research_Results/2026-03-25_relevance-ai-evaluation.md', 'המלצה: לא לסטאק כרגע'),
  ('AGI/ASI Future Playbook', '2026-03-25', 'ai_agents', 'pending', '04_KNOWLEDGE/Research_Results/2026-03-25_AGI-ASI-future-playbook.md', 'ONE™ implication: הוסף module AI Agent building')
;
