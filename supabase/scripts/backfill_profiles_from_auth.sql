-- Run once in Supabase Dashboard → SQL Editor.
-- IMPORTANT: Set role to "postgres" (not "anon" or "authenticated") — bottom-right in SQL Editor.
-- RLS on public.profiles allows users to insert only their own row; postgres bypasses RLS.

-- 1) Sanity check — you should see at least one row (your Google login)
SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 10;

-- 2) Profiles before
SELECT count(*) AS profile_rows FROM public.profiles;

-- 3) Backfill: one profile per auth user that does not have one yet
INSERT INTO public.profiles (user_id, data, completeness_score)
SELECT u.id, '{}'::jsonb, 0
FROM auth.users AS u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles AS p WHERE p.user_id = u.id
);

-- 4) If step 3 errors with ON CONFLICT / unique — ensure migration
--    20260403121500_profile_on_auth_user_created.sql ran (creates unique index on user_id).
--    Alternative with conflict handling:
-- INSERT INTO public.profiles (user_id, data, completeness_score)
-- SELECT u.id, '{}'::jsonb, 0
-- FROM auth.users AS u
-- WHERE NOT EXISTS (SELECT 1 FROM public.profiles AS p WHERE p.user_id = u.id)
-- ON CONFLICT (user_id) DO NOTHING;

-- 5) Verify
SELECT p.id, p.user_id, u.email, p.data, p.created_at
FROM public.profiles p
JOIN auth.users u ON u.id = p.user_id;
