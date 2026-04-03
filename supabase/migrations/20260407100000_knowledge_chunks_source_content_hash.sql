-- Page-level SHA-256 (raw HTML) from manifest at ingest; same value on all chunks for that URL revision.

ALTER TABLE public.knowledge_chunks
  ADD COLUMN IF NOT EXISTS source_content_hash text;

COMMENT ON COLUMN public.knowledge_chunks.source_content_hash IS 'SHA-256 hex of raw HTML when embedded (manifest content_hash).';
COMMENT ON COLUMN public.knowledge_chunks.content_hash IS 'SHA-256 of chunk body text (dedup / integrity).';
