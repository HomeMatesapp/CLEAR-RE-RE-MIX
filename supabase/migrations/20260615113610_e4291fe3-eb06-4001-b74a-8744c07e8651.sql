
ALTER TABLE public.decision_profiles
  ADD COLUMN IF NOT EXISTS support_circumstances jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.support_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  organisation_name text,
  type text NOT NULL,
  description text,
  who_it_helps text,
  eligibility_summary text,
  amount_or_value text,
  location_scope text,
  source_url text,
  last_checked_at date,
  review_status text NOT NULL DEFAULT 'active',
  sectors text[] NOT NULL DEFAULT '{}',
  role_slugs text[] NOT NULL DEFAULT '{}',
  criteria text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.support_opportunities TO anon, authenticated;
GRANT ALL ON public.support_opportunities TO service_role;

ALTER TABLE public.support_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Support opportunities are publicly readable"
  ON public.support_opportunities FOR SELECT
  USING (review_status = 'active');

CREATE TRIGGER trg_support_opportunities_updated_at
  BEFORE UPDATE ON public.support_opportunities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_support_opportunities_sectors
  ON public.support_opportunities USING GIN (sectors);
CREATE INDEX IF NOT EXISTS idx_support_opportunities_role_slugs
  ON public.support_opportunities USING GIN (role_slugs);
CREATE INDEX IF NOT EXISTS idx_support_opportunities_criteria
  ON public.support_opportunities USING GIN (criteria);
