-- Phase 2: RAG — pgvector + crm_embeddings
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Embeddings table for semantic search
CREATE TABLE IF NOT EXISTS crm_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('lead', 'note', 'customer', 'deal')),
  source_id uuid NOT NULL,
  embedding vector(1536),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- IVFFlat index for fast cosine similarity search
CREATE INDEX IF NOT EXISTS crm_embeddings_embedding_idx
  ON crm_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Index on source for fast lookups by entity
CREATE INDEX IF NOT EXISTS crm_embeddings_source_idx
  ON crm_embeddings (source_type, source_id);

-- Semantic search function
CREATE OR REPLACE FUNCTION match_crm_embeddings(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  content text,
  source_type text,
  source_id uuid,
  metadata jsonb,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    crm_embeddings.id,
    crm_embeddings.content,
    crm_embeddings.source_type,
    crm_embeddings.source_id,
    crm_embeddings.metadata,
    1 - (crm_embeddings.embedding <=> query_embedding) AS similarity
  FROM crm_embeddings
  WHERE 1 - (crm_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY crm_embeddings.embedding <=> query_embedding
  LIMIT match_count;
$$;
