-- IRCC RAG chunks for Pathways (replaces local Chroma). Embeddings: 384 dims (all-MiniLM-L6-v2).

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.knowledge_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  embedding vector(384) NOT NULL,
  source_url text NOT NULL,
  source_domain text,
  source_system text NOT NULL DEFAULT 'ircc',
  title text,
  section_title text,
  country_code text NOT NULL DEFAULT 'CA',
  jurisdiction_code text,
  document_type text,
  pathway_tags text[],
  chunk_index int NOT NULL DEFAULT 0,
  content_hash text NOT NULL,
  last_scraped_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT knowledge_chunks_url_chunk_unique UNIQUE (source_url, chunk_index)
);

CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_hnsw
  ON public.knowledge_chunks
  USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS knowledge_chunks_source_url_idx ON public.knowledge_chunks (source_url);
CREATE INDEX IF NOT EXISTS knowledge_chunks_content_hash_idx ON public.knowledge_chunks (content_hash);

COMMENT ON TABLE public.knowledge_chunks IS 'Embedded IRCC markdown chunks; ingestion deletes by source_url then re-inserts.';
