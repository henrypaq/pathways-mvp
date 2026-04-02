-- One public.profiles row per Supabase Auth user (auth.users).
-- auth.users lives in the auth schema (see Dashboard → Authentication → Users).
-- This trigger keeps public.profiles in sync for your app schema.

-- One profile per user (required for 1:1 + ON CONFLICT)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_unique ON public.profiles (user_id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, data, completeness_score)
  VALUES (NEW.id, '{}'::jsonb, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user() IS 'Creates public.profiles when a new auth.users row is inserted.';

-- Existing users (signed up before this migration) have no profile row. Backfill example:
-- INSERT INTO public.profiles (user_id, data, completeness_score)
-- SELECT id, '{}'::jsonb, 0 FROM auth.users u
-- WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = u.id)
-- ON CONFLICT (user_id) DO NOTHING;
