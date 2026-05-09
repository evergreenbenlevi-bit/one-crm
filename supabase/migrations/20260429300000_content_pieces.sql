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

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_content_pieces_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER content_pieces_updated_at
  BEFORE UPDATE ON content_pieces
  FOR EACH ROW EXECUTE FUNCTION update_content_pieces_updated_at();
