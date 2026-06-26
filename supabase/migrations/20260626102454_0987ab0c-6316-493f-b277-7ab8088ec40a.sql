
-- 1. Role provenance fields (rerunnable)
ALTER TABLE public.roles
  ADD COLUMN IF NOT EXISTS salary_as_at date,
  ADD COLUMN IF NOT EXISTS salary_source_url text;

-- 2. Explanation cache (private, service_role only)
CREATE TABLE IF NOT EXISTS public.reality_check_explanation_cache (
  key text PRIMARY KEY,
  payload jsonb NOT NULL,
  hit_count integer NOT NULL DEFAULT 0 CHECK (hit_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_hit_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reality_check_cache_created_at_idx
  ON public.reality_check_explanation_cache (created_at);
CREATE INDEX IF NOT EXISTS reality_check_cache_last_hit_at_idx
  ON public.reality_check_explanation_cache (last_hit_at);

REVOKE ALL ON public.reality_check_explanation_cache FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.reality_check_explanation_cache TO service_role;
ALTER TABLE public.reality_check_explanation_cache ENABLE ROW LEVEL SECURITY;
-- No policies: anon/authenticated have no grants and cannot reach this table.

-- 3. Rate-limit counters (private, service_role only)
CREATE TABLE IF NOT EXISTS public.reality_check_rate (
  scope text NOT NULL CHECK (scope IN (
    'endpoint_anon','endpoint_auth','llm_anon','llm_auth','global'
  )),
  key_hash text NOT NULL,        -- HMAC of IP/user_id (or literal 'global')
  window_start timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 0 CHECK (count >= 0),
  PRIMARY KEY (scope, key_hash, window_start)
);

CREATE INDEX IF NOT EXISTS reality_check_rate_window_idx
  ON public.reality_check_rate (window_start);

REVOKE ALL ON public.reality_check_rate FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.reality_check_rate TO service_role;
ALTER TABLE public.reality_check_rate ENABLE ROW LEVEL SECURITY;
-- No policies: service_role only.

-- 4. Atomic increment for rate limiting
CREATE OR REPLACE FUNCTION public.reality_check_rate_increment(
  p_scope text,
  p_key_hash text,
  p_window_start timestamptz
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO public.reality_check_rate (scope, key_hash, window_start, count)
  VALUES (p_scope, p_key_hash, p_window_start, 1)
  ON CONFLICT (scope, key_hash, window_start)
  DO UPDATE SET count = public.reality_check_rate.count + 1
  RETURNING count INTO v_count;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.reality_check_rate_increment(text, text, timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reality_check_rate_increment(text, text, timestamptz)
  TO service_role;

-- 5. Feedback (private — inserts must go through the edge function as service_role)
CREATE TABLE IF NOT EXISTS public.reality_check_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_slug text NOT NULL,
  verdict text,
  reason text NOT NULL CHECK (reason IN (
    'wrong_route','wrong_tone','fact_wrong','other'
  )),
  detail text CHECK (detail IS NULL OR char_length(detail) <= 500),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reality_check_feedback_role_slug_idx
  ON public.reality_check_feedback (role_slug);
CREATE INDEX IF NOT EXISTS reality_check_feedback_created_at_idx
  ON public.reality_check_feedback (created_at);

REVOKE ALL ON public.reality_check_feedback FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.reality_check_feedback TO service_role;
ALTER TABLE public.reality_check_feedback ENABLE ROW LEVEL SECURITY;
-- No policies: anon/authenticated cannot insert directly; the edge function
-- validates input and inserts via service_role.
