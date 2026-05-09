-- ============================================================
-- Instagram Creator Schema Migration — 2026-05-03
-- Purpose: Add post_type, caption_links, bio_link
-- Required by: scrape-creators-audit (Req B + Req C)
-- Target DB: yrurlhjpzkztfwntgpzn.supabase.co
-- DO NOT EXECUTE without reviewing on staging first.
-- ============================================================

-- ── Table 1: viral_scans ─────────────────────────────────────
-- post_type: the Instagram content format for this scan entry.
-- Values match Instagram API media_type mapping:
--   'Video'   = Reel (media_type 2)
--   'Sidecar' = Carousel / Album (media_type 8)
--   'Image'   = Static photo (media_type 1)
-- Audit ref: Req B — Winners Normalization — need per-format leaderboard.

ALTER TABLE viral_scans
  ADD COLUMN IF NOT EXISTS post_type TEXT
    CHECK (post_type IN ('Video', 'Sidecar', 'Image'));

COMMENT ON COLUMN viral_scans.post_type IS
  'Instagram post format: Video=Reel (media_type 2), Sidecar=Carousel (media_type 8), Image=static photo. '
  'Populated by instagram-intel.sh. Enables winner-per-format leaderboard (Req B).';

-- caption_links: array of URLs extracted from the post caption.
-- Stored as text[] — one URL per element, pre-resolved where possible.
-- Audit ref: Req C — Link Harvesting — replaces volatile /tmp/lead-magnets/ output.

ALTER TABLE viral_scans
  ADD COLUMN IF NOT EXISTS caption_links TEXT[];

COMMENT ON COLUMN viral_scans.caption_links IS
  'URLs extracted from post caption. Array of raw URLs (resolved redirects where possible). '
  'Populated by instagram-intel.sh caption URL parser (Req C). '
  'Previously only written to /tmp/lead-magnets/ (volatile) — this is the persistent store.';

-- ── Table 2: creators ────────────────────────────────────────
-- bio_link: the clickable link in the creator's Instagram bio.
-- Different from caption_links — this is the profile-level external link.
-- Audit ref: Req C — instagram-intel.sh does not currently fetch bio_link from SC API.

ALTER TABLE creators
  ADD COLUMN IF NOT EXISTS bio_link TEXT;

COMMENT ON COLUMN creators.bio_link IS
  'External link from creator Instagram bio (bio_link / external_url field in SC API response). '
  'Updated each intel run. Null if creator has no bio link. '
  'Source: instagram-intel.sh → ScrapeCreators /v1/instagram/user/reels response (Req C).';

-- ── Indexes ──────────────────────────────────────────────────
-- Index on post_type for format-split leaderboard queries.
CREATE INDEX IF NOT EXISTS idx_viral_post_type
  ON viral_scans(post_type)
  WHERE post_type IS NOT NULL;

-- Partial index: scans that have at least one caption link (link-harvest queries).
CREATE INDEX IF NOT EXISTS idx_viral_has_caption_links
  ON viral_scans(id)
  WHERE caption_links IS NOT NULL AND array_length(caption_links, 1) > 0;

-- Index on bio_link for "creators with link-in-bio" filter.
CREATE INDEX IF NOT EXISTS idx_creators_bio_link
  ON creators(id)
  WHERE bio_link IS NOT NULL;
