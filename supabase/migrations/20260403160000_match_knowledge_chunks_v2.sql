-- Extend match_knowledge_chunks to return title + scraped_at,
-- and grant to anon so Next.js serverless routes (no user session) can call it.

CREATE OR REPLACE FUNCTION public.match_knowledge_chunks(
  query_embedding vector(1536),
  match_count integer DEFAULT 5
)
RETURNS TABLE (
  content    text,
  url        text,
  title      text,
  similarity double precision,
  scraped_at timestamptz
)
LANGUAGE sql
STABLE
PARALLEL SAFE
SET search_path = public, extensions
AS $$
  SELECT
    k.content,
    k.source_url                                          AS url,
    k.title,
    (1 - (k.embedding <=> query_embedding))::double precision AS similarity,
    k.last_scraped_at                                     AS scraped_at
  FROM public.knowledge_chunks k
  ORDER BY k.embedding <=> query_embedding
  LIMIT LEAST(GREATEST(match_count, 1), 200);
$$;

GRANT EXECUTE ON FUNCTION public.match_knowledge_chunks(vector(1536), integer) TO anon;
GRANT EXECUTE ON FUNCTION public.match_knowledge_chunks(vector(1536), integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_knowledge_chunks(vector(1536), integer) TO service_role;
