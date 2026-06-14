
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- BACKUP
-- ============================================================
CREATE SCHEMA IF NOT EXISTS _backup_v1;
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('CREATE TABLE IF NOT EXISTS _backup_v1.%I AS TABLE public.%I', t, t);
  END LOOP;
END $$;

-- ============================================================
-- DROP DEPRECATED V1
-- ============================================================
DROP TABLE IF EXISTS public.email_schedule    CASCADE;
DROP TABLE IF EXISTS public.weekly_checkins   CASCADE;
DROP TABLE IF EXISTS public.weekly_plans      CASCADE;
DROP TABLE IF EXISTS public.progress_tracking CASCADE;
DROP TABLE IF EXISTS public.saved_pathways    CASCADE;
DROP TABLE IF EXISTS public.quiz_results      CASCADE;
DROP TABLE IF EXISTS public.hired_alumni      CASCADE;
DROP TABLE IF EXISTS public.job_market_cache  CASCADE;
DROP TABLE IF EXISTS public.funding_windows   CASCADE;
DROP TABLE IF EXISTS public.pathways          CASCADE;
DROP TABLE IF EXISTS public.providers         CASCADE;
DROP TABLE IF EXISTS public.user_profiles     CASCADE;
DROP FUNCTION IF EXISTS public.check_and_increment_ai_usage(uuid, text, integer);

-- ============================================================
-- V2 SCHEMA
-- ============================================================

CREATE TABLE public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name text NOT NULL,
  role_slug text NOT NULL UNIQUE,
  short_description text,
  pathway_school_leaver text,
  pathway_graduate text,
  pathway_adjacent text,
  pathway_no_background text,
  raw_why_text text,
  reality_check text,
  uncomfortable_truth text,
  opportunity_cost text,
  typical_backgrounds text,
  who_not_for text,
  career_regret_risk text,
  alternative_careers text,
  next_step text,
  next_step_url text,
  salary_entry integer,
  salary_experienced integer,
  salary_senior integer,
  salary_source text,
  demand text CHECK (demand IS NULL OR demand IN ('High','Moderate','Low','Growing','Stable','Declining','Competitive')),
  demand_source text,
  competition_level text CHECK (competition_level IS NULL OR competition_level IN ('Moderate','High','Extreme')),
  typical_time_to_entry text,
  ai_impact_level text CHECK (ai_impact_level IS NULL OR ai_impact_level IN ('Very High','High','Moderate','Low','Minimal')),
  ai_impact_note text,
  remote_friendly text,
  job_security text,
  progression_speed text,
  ai_safety_2040 text,
  top_universities text,
  degree_required text,
  best_path text,
  second_path text,
  third_path text,
  confidence_level text CHECK (confidence_level IS NULL OR confidence_level IN ('High','Medium','Low')),
  review_status text DEFAULT 'pending',
  last_reviewed date,
  next_review date,
  review_owner text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.roles TO anon, authenticated;
GRANT ALL ON public.roles TO service_role;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Roles are publicly readable" ON public.roles FOR SELECT USING (true);
CREATE INDEX roles_name_fts_idx ON public.roles USING gin (to_tsvector('english', role_name));
CREATE INDEX roles_name_trgm_idx ON public.roles USING gin (role_name gin_trgm_ops);

CREATE TABLE public.providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  provider_org text,
  category text,
  website text,
  apply_url text,
  cost_range text,
  cost_gbp numeric,
  duration text,
  location text,
  format text,
  funded text,
  funding_type text,
  is_skills_bootcamp boolean DEFAULT false,
  next_start_date text,
  publishes_outcomes boolean DEFAULT false,
  employment_rate text,
  avg_graduate_salary text,
  employer_acceptance text,
  honest_notes text,
  who_its_for text,
  what_to_ask text,
  clear_routes_note text,
  prerequisites text,
  job_placement_support text,
  tier text,
  roles_covered text[],
  last_reviewed date,
  review_status text DEFAULT 'pending',
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.providers TO anon, authenticated;
GRANT ALL ON public.providers TO service_role;
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Providers are publicly readable" ON public.providers FOR SELECT USING (true);

CREATE TABLE public.apprenticeships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  standard_name text NOT NULL,
  training_provider text,
  employer text,
  roles_covered text[],
  level integer,
  equivalent_to text,
  duration text,
  typical_salary text,
  location text,
  format text,
  fully_funded boolean,
  apply_url text,
  completion_rate text,
  key_employers text,
  honest_notes text,
  age_restrictions text,
  funding_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.apprenticeships TO anon, authenticated;
GRANT ALL ON public.apprenticeships TO service_role;
ALTER TABLE public.apprenticeships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Apprenticeships are publicly readable" ON public.apprenticeships FOR SELECT USING (true);

CREATE TABLE public.support_organisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  audience text[] NOT NULL DEFAULT '{}',
  description text,
  what_they_offer text,
  website text,
  eligibility text,
  is_free boolean DEFAULT true,
  category text,
  display_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.support_organisations TO anon, authenticated;
GRANT ALL ON public.support_organisations TO service_role;
ALTER TABLE public.support_organisations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Support orgs are publicly readable" ON public.support_organisations FOR SELECT USING (true);

CREATE TABLE public.provider_pathways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES public.providers(id) ON DELETE CASCADE,
  role_id uuid REFERENCES public.roles(id) ON DELETE CASCADE,
  pathway_type text CHECK (pathway_type IN ('university','career_changer','free_funded','apprenticeship','self_study','all')),
  priority integer DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider_id, role_id, pathway_type)
);
GRANT SELECT ON public.provider_pathways TO anon, authenticated;
GRANT ALL ON public.provider_pathways TO service_role;
ALTER TABLE public.provider_pathways ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Provider pathways are publicly readable" ON public.provider_pathways FOR SELECT USING (true);
CREATE INDEX provider_pathways_role_idx ON public.provider_pathways(role_id);
CREATE INDEX provider_pathways_provider_idx ON public.provider_pathways(provider_id);

CREATE TABLE public.alternative_careers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_role_id uuid REFERENCES public.roles(id) ON DELETE CASCADE,
  to_role_id uuid REFERENCES public.roles(id) ON DELETE CASCADE,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(from_role_id, to_role_id)
);
GRANT SELECT ON public.alternative_careers TO anon, authenticated;
GRANT ALL ON public.alternative_careers TO service_role;
ALTER TABLE public.alternative_careers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Alternative careers are publicly readable" ON public.alternative_careers FOR SELECT USING (true);

CREATE TABLE public.user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text,
  age_range text,
  highest_qualification text,
  degree_subject text,
  employment_status text,
  current_industry text,
  changing_careers text,
  consented_sensitive boolean DEFAULT false,
  is_woman_nb boolean,
  has_disability boolean,
  is_care_leaver boolean,
  is_refugee boolean,
  is_veteran boolean,
  has_criminal_record boolean,
  is_first_generation boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO authenticated;
GRANT ALL ON public.user_profiles TO service_role;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile"   ON public.user_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own profile" ON public.user_profiles FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_roles_updated_at          BEFORE UPDATE ON public.roles                 FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_providers_updated_at      BEFORE UPDATE ON public.providers             FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_apprenticeships_updated_at BEFORE UPDATE ON public.apprenticeships      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_support_orgs_updated_at   BEFORE UPDATE ON public.support_organisations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_user_profiles_updated_at  BEFORE UPDATE ON public.user_profiles         FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
