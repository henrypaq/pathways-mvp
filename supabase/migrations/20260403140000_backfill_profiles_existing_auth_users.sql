-- Idempotent: inserts public.profiles for any auth.users row missing a profile.
-- Safe to run multiple times.

INSERT INTO public.profiles (user_id, data, completeness_score)
SELECT u.id, '{}'::jsonb, 0
FROM auth.users AS u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles AS p WHERE p.user_id = u.id
);
