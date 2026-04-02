-- Pathways — case-based immigration workflow schema
-- Run via Supabase CLI (`supabase db push`) or SQL Editor (full migration).
-- References auth.users (Supabase Auth). RLS enabled with owner-scoped policies.

-- gen_random_uuid() is built into PostgreSQL 13+ (Supabase).

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pathways_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. profiles
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  completeness_score double precision NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX profiles_user_id_idx ON public.profiles (user_id);

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.pathways_set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. pathways (registry)
-- ---------------------------------------------------------------------------
CREATE TABLE public.pathways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country text NOT NULL,
  name text NOT NULL,
  code text NOT NULL,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pathways_code_unique UNIQUE (code)
);

CREATE INDEX pathways_code_idx ON public.pathways (code);

-- ---------------------------------------------------------------------------
-- 4. requirements (primitives)
-- ---------------------------------------------------------------------------
CREATE TABLE public.requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  category text NOT NULL,
  schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT requirements_key_unique UNIQUE (key)
);

CREATE INDEX requirements_key_idx ON public.requirements (key);

-- ---------------------------------------------------------------------------
-- 5. pathway_requirements
-- ---------------------------------------------------------------------------
CREATE TABLE public.pathway_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pathway_id uuid NOT NULL REFERENCES public.pathways (id) ON DELETE CASCADE,
  requirement_id uuid NOT NULL REFERENCES public.requirements (id) ON DELETE CASCADE,
  is_required boolean NOT NULL DEFAULT true,
  rules jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pathway_requirements_pathway_requirement_unique UNIQUE (pathway_id, requirement_id)
);

CREATE INDEX pathway_requirements_pathway_id_idx ON public.pathway_requirements (pathway_id);
CREATE INDEX pathway_requirements_requirement_id_idx ON public.pathway_requirements (requirement_id);

-- ---------------------------------------------------------------------------
-- 6. cases
-- ---------------------------------------------------------------------------
CREATE TABLE public.cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  selected_pathway_id uuid REFERENCES public.pathways (id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'intake',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX cases_user_id_idx ON public.cases (user_id);
CREATE INDEX cases_profile_id_idx ON public.cases (profile_id);

CREATE TRIGGER cases_set_updated_at
  BEFORE UPDATE ON public.cases
  FOR EACH ROW
  EXECUTE PROCEDURE public.pathways_set_updated_at();

-- ---------------------------------------------------------------------------
-- 7. case_requirements
-- ---------------------------------------------------------------------------
CREATE TABLE public.case_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases (id) ON DELETE CASCADE,
  requirement_id uuid NOT NULL REFERENCES public.requirements (id) ON DELETE CASCADE,
  status text NOT NULL,
  confidence double precision NOT NULL DEFAULT 0,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT case_requirements_case_requirement_unique UNIQUE (case_id, requirement_id)
);

CREATE INDEX case_requirements_case_id_idx ON public.case_requirements (case_id);
CREATE INDEX case_requirements_requirement_id_idx ON public.case_requirements (requirement_id);

CREATE TRIGGER case_requirements_set_updated_at
  BEFORE UPDATE ON public.case_requirements
  FOR EACH ROW
  EXECUTE PROCEDURE public.pathways_set_updated_at();

-- ---------------------------------------------------------------------------
-- 8. documents
-- ---------------------------------------------------------------------------
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.cases (id) ON DELETE CASCADE,
  type text,
  file_url text NOT NULL,
  extracted_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX documents_user_id_idx ON public.documents (user_id);
CREATE INDEX documents_case_id_idx ON public.documents (case_id);

-- ---------------------------------------------------------------------------
-- 9. document_assessments
-- ---------------------------------------------------------------------------
CREATE TABLE public.document_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents (id) ON DELETE CASCADE,
  requirement_id uuid NOT NULL REFERENCES public.requirements (id) ON DELETE CASCADE,
  status text NOT NULL,
  issues jsonb,
  confidence double precision NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX document_assessments_document_id_idx ON public.document_assessments (document_id);
CREATE INDEX document_assessments_requirement_id_idx ON public.document_assessments (requirement_id);

-- ---------------------------------------------------------------------------
-- 10. recommendations
-- ---------------------------------------------------------------------------
CREATE TABLE public.recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX recommendations_profile_id_idx ON public.recommendations (profile_id);

-- ---------------------------------------------------------------------------
-- 11. artifacts
-- ---------------------------------------------------------------------------
CREATE TABLE public.artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases (id) ON DELETE CASCADE,
  type text NOT NULL,
  content jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX artifacts_case_id_idx ON public.artifacts (case_id);

-- ---------------------------------------------------------------------------
-- 12. risk_flags
-- ---------------------------------------------------------------------------
CREATE TABLE public.risk_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases (id) ON DELETE CASCADE,
  type text,
  description text NOT NULL,
  severity text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX risk_flags_case_id_idx ON public.risk_flags (case_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pathways ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pathway_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_flags ENABLE ROW LEVEL SECURITY;

-- profiles: own rows
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY profiles_delete_own ON public.profiles
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- reference data: readable by authenticated users
CREATE POLICY pathways_select_authenticated ON public.pathways
  FOR SELECT TO authenticated USING (true);
CREATE POLICY requirements_select_authenticated ON public.requirements
  FOR SELECT TO authenticated USING (true);
CREATE POLICY pathway_requirements_select_authenticated ON public.pathway_requirements
  FOR SELECT TO authenticated USING (true);

-- cases: own rows
CREATE POLICY cases_select_own ON public.cases
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY cases_insert_own ON public.cases
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY cases_update_own ON public.cases
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY cases_delete_own ON public.cases
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- case_requirements: via case ownership
CREATE POLICY case_requirements_all_via_case ON public.case_requirements
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = case_requirements.case_id AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = case_requirements.case_id AND c.user_id = auth.uid()
    )
  );

-- documents: own user_id
CREATE POLICY documents_select_own ON public.documents
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY documents_insert_own ON public.documents
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY documents_update_own ON public.documents
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY documents_delete_own ON public.documents
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- document_assessments: via document ownership
CREATE POLICY document_assessments_all_via_document ON public.document_assessments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_assessments.document_id AND d.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_assessments.document_id AND d.user_id = auth.uid()
    )
  );

-- recommendations: via profile ownership
CREATE POLICY recommendations_select_own ON public.recommendations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = recommendations.profile_id AND p.user_id = auth.uid()
    )
  );
CREATE POLICY recommendations_insert_own ON public.recommendations
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = recommendations.profile_id AND p.user_id = auth.uid()
    )
  );
CREATE POLICY recommendations_update_own ON public.recommendations
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = recommendations.profile_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = recommendations.profile_id AND p.user_id = auth.uid()
    )
  );
CREATE POLICY recommendations_delete_own ON public.recommendations
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = recommendations.profile_id AND p.user_id = auth.uid()
    )
  );

-- artifacts: via case ownership
CREATE POLICY artifacts_all_via_case ON public.artifacts
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = artifacts.case_id AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = artifacts.case_id AND c.user_id = auth.uid()
    )
  );

-- risk_flags: via case ownership
CREATE POLICY risk_flags_all_via_case ON public.risk_flags
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = risk_flags.case_id AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = risk_flags.case_id AND c.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Grants (authenticated role uses JWT; service_role bypasses RLS for admin jobs)
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
