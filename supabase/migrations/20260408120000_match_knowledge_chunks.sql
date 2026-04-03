-- Semantic search RPC for pgvector (callable via PostgREST rpc() or direct SQL from psycopg).
-- Embedding dimension must match knowledge_chunks (1536 for text-embedding-3-small).

CREATE OR REPLACE FUNCTION public.match_knowledge_chunks(
  query_embedding vector(1536),
  match_count integer DEFAULT 5
)
RETURNS TABLE (
  content text,
  url text,
  similarity double precision
)
LANGUAGE sql
STABLE
PARALLEL SAFE
-- pgvector types/operators live in `extensions` on Supabase; public-only search_path breaks `<=>`.
SET search_path = public, extensions
AS $$
  SELECT
    k.content,
    k.source_url AS url,
    (1 - (k.embedding <=> query_embedding))::double precision AS similarity
  FROM public.knowledge_chunks k
  ORDER BY k.embedding <=> query_embedding
  LIMIT LEAST(GREATEST(match_count, 1), 200);
$$;

COMMENT ON FUNCTION public.match_knowledge_chunks(vector(1536), integer) IS
  'Cosine similarity search over knowledge_chunks; returns content, canonical URL, and 1-distance score.';

-- Server-side / logged-in clients only (avoid exposing open search to anon by default).
GRANT EXECUTE ON FUNCTION public.match_knowledge_chunks(vector(1536), integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_knowledge_chunks(vector(1536), integer) TO service_role;
