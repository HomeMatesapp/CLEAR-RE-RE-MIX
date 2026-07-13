-- Create providers table
CREATE TABLE public.providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  provider_org TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('bootcamp', 'apprenticeship', 'enhancement')),
  roles_covered TEXT[] NOT NULL,
  duration TEXT,
  format TEXT,
  apply_url TEXT,
  overview TEXT,
  why_good TEXT,
  pathfinder_approved BOOLEAN DEFAULT false,
  last_verified_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create funding_windows table
CREATE TABLE public.funding_windows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID REFERENCES public.providers(id) ON DELETE CASCADE,
  funder TEXT,
  ca_slugs TEXT[],
  funding_type TEXT CHECK (funding_type IN ('full', 'partial', 'eligibility_based')),
  funding_label TEXT,
  valid_from DATE,
  valid_until DATE,
  eligibility_notes TEXT,
  source_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create pathways table
CREATE TABLE public.pathways (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_slug TEXT UNIQUE NOT NULL,
  role_title TEXT NOT NULL,
  pathway_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_profiles table
CREATE TABLE public.user_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  postcode TEXT,
  combined_authority TEXT,
  has_paid BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create progress_tracking table
CREATE TABLE public.progress_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role_slug TEXT,
  completed_stages TEXT[] DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funding_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pathways ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_tracking ENABLE ROW LEVEL SECURITY;

-- Providers: publicly readable
CREATE POLICY "Providers are publicly readable" ON public.providers FOR SELECT USING (true);

-- Funding windows: publicly readable
CREATE POLICY "Funding windows are publicly readable" ON public.funding_windows FOR SELECT USING (true);

-- Pathways: publicly readable
CREATE POLICY "Pathways are publicly readable" ON public.pathways FOR SELECT USING (true);

-- User profiles: users can manage their own
CREATE POLICY "Users can view their own profile" ON public.user_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = user_id);

-- Progress tracking: users can manage their own
CREATE POLICY "Users can view their own progress" ON public.progress_tracking FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own progress" ON public.progress_tracking FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own progress" ON public.progress_tracking FOR UPDATE USING (auth.uid() = user_id);

-- Timestamp trigger for pathways
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_pathways_updated_at
  BEFORE UPDATE ON public.pathways
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_progress_updated_at
  BEFORE UPDATE ON public.progress_tracking
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TABLE public.quiz_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_answers jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own quiz results" ON public.quiz_results
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own quiz results" ON public.quiz_results
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.saved_pathways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_slug text NOT NULL,
  role_title text NOT NULL,
  pathway_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, role_slug)
);

ALTER TABLE public.saved_pathways ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own saved pathways" ON public.saved_pathways
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own saved pathways" ON public.saved_pathways
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved pathways" ON public.saved_pathways
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.weekly_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role_slug text NOT NULL,
  plan_data jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, role_slug)
);

ALTER TABLE public.weekly_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own weekly plans"
  ON public.weekly_plans FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own weekly plans"
  ON public.weekly_plans FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weekly plans"
  ON public.weekly_plans FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
ALTER TABLE public.progress_tracking ADD CONSTRAINT progress_tracking_user_role_unique UNIQUE (user_id, role_slug);ALTER TABLE public.user_profiles ADD COLUMN first_name text;-- Delete duplicate user_profiles, keeping only the oldest row per user_id
DELETE FROM public.user_profiles
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id) id
  FROM public.user_profiles
  ORDER BY user_id, created_at ASC
);

-- Add unique constraint to prevent future duplicates
ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_user_id_unique UNIQUE (user_id);
CREATE TABLE IF NOT EXISTS public.email_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role_slug text NOT NULL,
  current_week integer NOT NULL DEFAULT 1,
  total_weeks integer NOT NULL,
  next_send_at timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, role_slug)
);

ALTER TABLE public.email_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own email schedule"
  ON public.email_schedule FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own email schedule"
  ON public.email_schedule FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add last_visited_at to user_profiles
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS last_visited_at timestamptz;

-- Create weekly_checkins table
CREATE TABLE public.weekly_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role_slug text NOT NULL,
  week_number integer NOT NULL,
  response text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.weekly_checkins ENABLE ROW LEVEL SECURITY;

-- RLS policies for weekly_checkins
CREATE POLICY "Users can view their own checkins"
  ON public.weekly_checkins FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own checkins"
  ON public.weekly_checkins FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create hired_alumni table
CREATE TABLE public.hired_alumni (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role_slug text NOT NULL,
  hired_role text NOT NULL,
  company_type text,
  salary_range text,
  job_search_duration text,
  what_helped text,
  share_permission text NOT NULL DEFAULT 'anonymous',
  is_featured boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.hired_alumni ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own hired submissions"
  ON public.hired_alumni FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own hired submissions"
  ON public.hired_alumni FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Public can view featured alumni"
  ON public.hired_alumni FOR SELECT
  TO public
  USING (is_featured = true AND share_permission != 'no');

-- Add hired fields to user_profiles
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS is_hired boolean DEFAULT false;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS hired_at timestamptz;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS hired_role text;
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS quiz_situation text,
  ADD COLUMN IF NOT EXISTS quiz_priorities text[],
  ADD COLUMN IF NOT EXISTS quiz_time text,
  ADD COLUMN IF NOT EXISTS quiz_background text,
  ADD COLUMN IF NOT EXISTS quiz_target_role text;ALTER TABLE public.saved_pathways ADD COLUMN last_viewed_at timestamp with time zone DEFAULT now();
-- Create job_market_cache table for storing Reed/Adzuna API results
CREATE TABLE public.job_market_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_slug TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT 'uk',
  job_count INTEGER,
  avg_salary INTEGER,
  sources JSONB DEFAULT '[]'::jsonb,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (role_slug, location)
);

-- Enable RLS
ALTER TABLE public.job_market_cache ENABLE ROW LEVEL SECURITY;

-- Public read access — this is non-sensitive cached market data
CREATE POLICY "Job market cache is publicly readable"
  ON public.job_market_cache
  FOR SELECT
  TO public
  USING (true);
ALTER TABLE public.job_market_cache ADD COLUMN IF NOT EXISTS listings_sample jsonb DEFAULT NULL;UPDATE pathways
SET pathway_data = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              pathway_data::jsonb,
              '{training,primary,provider}',
              '"CXL Institute, Reforge, or Growthmentor"'
            ),
            '{training,primary,why_recommended}',
            '"Hands-on training in paid acquisition, conversion optimisation, and growth strategy — with real campaign experience across Google, Meta, and LinkedIn ads"'
          ),
          '{training,alternative,provider}',
          '"Level 3 Digital Marketer or Level 4 Marketing Executive — with focus on paid acquisition and campaign performance"'
        ),
        '{training,optional_enhancement,self_taught_warning}',
        '"This certificate alone will not get you hired — UK employers hiring for customer acquisition roles want to see 3+ real campaigns with measurable CAC, ROAS, or conversion rate results"'
      ),
      '{training,degree_apprenticeship,why_recommended}',
      '"Combines hands-on acquisition campaign experience with strategic business and data analysis skills — ideal for those wanting a long-term growth marketing career"'
    ),
    '{training,alternative,name}',
    '"Level 3 Digital Marketer or Level 4 Marketing Executive Apprenticeship"'
  ),
  '{training,primary,funded_regions}',
  '["Providers include: CXL Institute, Reforge, Growthmentor, and Google Skillshop"]'
),
updated_at = now()
WHERE role_slug = 'customer-acquisition-specialist';

UPDATE saved_pathways
SET pathway_data = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              pathway_data::jsonb,
              '{training,primary,provider}',
              '"CXL Institute, Reforge, or Growthmentor"'
            ),
            '{training,primary,why_recommended}',
            '"Hands-on training in paid acquisition, conversion optimisation, and growth strategy — with real campaign experience across Google, Meta, and LinkedIn ads"'
          ),
          '{training,alternative,provider}',
          '"Level 3 Digital Marketer or Level 4 Marketing Executive — with focus on paid acquisition and campaign performance"'
        ),
        '{training,optional_enhancement,self_taught_warning}',
        '"This certificate alone will not get you hired — UK employers hiring for customer acquisition roles want to see 3+ real campaigns with measurable CAC, ROAS, or conversion rate results"'
      ),
      '{training,degree_apprenticeship,why_recommended}',
      '"Combines hands-on acquisition campaign experience with strategic business and data analysis skills — ideal for those wanting a long-term growth marketing career"'
    ),
    '{training,alternative,name}',
    '"Level 3 Digital Marketer or Level 4 Marketing Executive Apprenticeship"'
  ),
  '{training,primary,funded_regions}',
  '["Providers include: CXL Institute, Reforge, Growthmentor, and Google Skillshop"]'
)
WHERE role_slug = 'customer-acquisition-specialist';UPDATE pathways
SET pathway_data = jsonb_set(
  jsonb_set(
    pathway_data::jsonb,
    '{training,alternative,apply_url}',
    '"https://www.findapprenticeship.service.gov.uk/apprenticeships?searchTerm=customer+acquisition"'
  ),
  '{training,degree_apprenticeship,apply_url}',
  '"https://www.findapprenticeship.service.gov.uk/apprenticeships?searchTerm=performance+marketing+degree"'
),
updated_at = now()
WHERE role_slug = 'customer-acquisition-specialist';

UPDATE saved_pathways
SET pathway_data = jsonb_set(
  jsonb_set(
    pathway_data::jsonb,
    '{training,alternative,apply_url}',
    '"https://www.findapprenticeship.service.gov.uk/apprenticeships?searchTerm=performance+marketing+degree"'
  ),
  '{training,alternative,apply_url}',
  '"https://www.findapprenticeship.service.gov.uk/apprenticeships?searchTerm=customer+acquisition"'
)
WHERE role_slug = 'customer-acquisition-specialist';-- Add per-user daily AI generation counters to user_profiles
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS pathways_generated_today integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pathways_reset_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS pdfs_generated_today integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pdfs_reset_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS weekly_plans_generated_today integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS weekly_plans_reset_at timestamptz NOT NULL DEFAULT now();

-- Atomic check-and-increment of a daily counter on user_profiles.
-- Returns the post-increment count, or -1 if the user is over the limit.
-- Resets the counter and reset timestamp if more than 24 hours have passed.
-- SECURITY DEFINER so the edge function (service role) can call it for any user
-- without an extra RLS policy round-trip.
CREATE OR REPLACE FUNCTION public.check_and_increment_ai_usage(
  _user_id uuid,
  _kind text,
  _limit integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_count integer;
  _reset_at timestamptz;
  _new_count integer;
BEGIN
  -- Ensure a profile row exists for this user (no-op if already there).
  INSERT INTO public.user_profiles (user_id)
  VALUES (_user_id)
  ON CONFLICT DO NOTHING;

  IF _kind = 'pathway' THEN
    SELECT pathways_generated_today, pathways_reset_at
      INTO _current_count, _reset_at
    FROM public.user_profiles
    WHERE user_id = _user_id
    FOR UPDATE;

    IF _reset_at < now() - INTERVAL '24 hours' THEN
      _current_count := 0;
      UPDATE public.user_profiles
        SET pathways_reset_at = now(), pathways_generated_today = 0
      WHERE user_id = _user_id;
    END IF;

    IF _current_count >= _limit THEN
      RETURN -1;
    END IF;

    UPDATE public.user_profiles
      SET pathways_generated_today = pathways_generated_today + 1
    WHERE user_id = _user_id
    RETURNING pathways_generated_today INTO _new_count;
    RETURN _new_count;

  ELSIF _kind = 'pdf' THEN
    SELECT pdfs_generated_today, pdfs_reset_at
      INTO _current_count, _reset_at
    FROM public.user_profiles
    WHERE user_id = _user_id
    FOR UPDATE;

    IF _reset_at < now() - INTERVAL '24 hours' THEN
      _current_count := 0;
      UPDATE public.user_profiles
        SET pdfs_reset_at = now(), pdfs_generated_today = 0
      WHERE user_id = _user_id;
    END IF;

    IF _current_count >= _limit THEN
      RETURN -1;
    END IF;

    UPDATE public.user_profiles
      SET pdfs_generated_today = pdfs_generated_today + 1
    WHERE user_id = _user_id
    RETURNING pdfs_generated_today INTO _new_count;
    RETURN _new_count;

  ELSIF _kind = 'weekly_plan' THEN
    SELECT weekly_plans_generated_today, weekly_plans_reset_at
      INTO _current_count, _reset_at
    FROM public.user_profiles
    WHERE user_id = _user_id
    FOR UPDATE;

    IF _reset_at < now() - INTERVAL '24 hours' THEN
      _current_count := 0;
      UPDATE public.user_profiles
        SET weekly_plans_reset_at = now(), weekly_plans_generated_today = 0
      WHERE user_id = _user_id;
    END IF;

    IF _current_count >= _limit THEN
      RETURN -1;
    END IF;

    UPDATE public.user_profiles
      SET weekly_plans_generated_today = weekly_plans_generated_today + 1
    WHERE user_id = _user_id
    RETURNING weekly_plans_generated_today INTO _new_count;
    RETURN _new_count;
  END IF;

  RAISE EXCEPTION 'Unknown AI usage kind: %', _kind;
END;
$$;

-- Lock down execution: only the service role (used by edge functions) can call this.
REVOKE ALL ON FUNCTION public.check_and_increment_ai_usage(uuid, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_and_increment_ai_usage(uuid, text, integer) FROM authenticated;
REVOKE ALL ON FUNCTION public.check_and_increment_ai_usage(uuid, text, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.check_and_increment_ai_usage(uuid, text, integer) TO service_role;
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

ALTER TABLE public.roles
  ADD COLUMN IF NOT EXISTS reality_rating text,
  ADD COLUMN IF NOT EXISTS key_employers text[];