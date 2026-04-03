-- OpenAI text-embedding-3-small (1536 dimensions).
-- If you still have 384-dim rows, TRUNCATE public.knowledge_chunks; before applying, then re-run ingest.

DROP INDEX IF EXISTS knowledge_chunks_embedding_hnsw;

ALTER TABLE public.knowledge_chunks
  ALTER COLUMN embedding TYPE vector(1536);

CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_hnsw
  ON public.knowledge_chunks
  USING hnsw (embedding vector_cosine_ops);

COMMENT ON COLUMN public.knowledge_chunks.embedding IS 'OpenAI text-embedding-3-small (1536 dims)';
