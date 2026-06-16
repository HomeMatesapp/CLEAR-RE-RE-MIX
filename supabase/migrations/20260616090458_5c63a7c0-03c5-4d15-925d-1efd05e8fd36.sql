
-- Opportunities catalogue (publicly readable)
CREATE TABLE public.opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  type text NOT NULL CHECK (type IN (
    'apprenticeship','job','trainee_role','assistant_role',
    'course','access_course','functional_skills',
    'bootcamp','employer_programme','support_funding'
  )),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','draft','archived')),
  provider_name text,
  employer_name text,
  role_tags text[] NOT NULL DEFAULT '{}',
  route_tags text[] NOT NULL DEFAULT '{}',
  description text,
  location_name text,
  postcode text,
  outward_code text,
  is_remote boolean NOT NULL DEFAULT false,
  is_online boolean NOT NULL DEFAULT false,
  radius_miles integer,
  cost text,
  salary text,
  funding_type text,
  entry_requirements text,
  english_maths_requirements text,
  qualification_level text,
  application_url text,
  source_url text,
  deadline date,
  start_date date,
  verified_at timestamptz,
  is_sponsored boolean NOT NULL DEFAULT false,
  sponsor_label text,
  warning_notes text,
  is_seed boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.opportunities TO anon, authenticated;
GRANT ALL ON public.opportunities TO service_role;

ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active opportunities are publicly readable"
  ON public.opportunities FOR SELECT
  USING (status = 'active');

CREATE INDEX opportunities_role_tags_idx ON public.opportunities USING GIN (role_tags);
CREATE INDEX opportunities_type_idx ON public.opportunities (type);
CREATE INDEX opportunities_status_idx ON public.opportunities (status);

CREATE TRIGGER opportunities_set_updated_at
  BEFORE UPDATE ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- User enquiries (lead flow)
CREATE TABLE public.opportunity_enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  decision_id uuid REFERENCES public.saved_decisions(id) ON DELETE SET NULL,
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  message text,
  shared_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  consent_given boolean NOT NULL DEFAULT false,
  consent_timestamp timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.opportunity_enquiries TO authenticated;
GRANT ALL ON public.opportunity_enquiries TO service_role;

ALTER TABLE public.opportunity_enquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own enquiries"
  ON public.opportunity_enquiries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own enquiries"
  ON public.opportunity_enquiries FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND consent_given = true
    AND (
      decision_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.saved_decisions sd
        WHERE sd.id = decision_id AND sd.user_id = auth.uid()
      )
    )
  );

CREATE INDEX opportunity_enquiries_user_idx ON public.opportunity_enquiries (user_id);
CREATE INDEX opportunity_enquiries_opp_idx ON public.opportunity_enquiries (opportunity_id);
