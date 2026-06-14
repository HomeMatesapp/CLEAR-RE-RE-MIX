
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
