
-- Defensive re-lockdown of the rate-limit increment function.
-- Postgres grants EXECUTE to PUBLIC by default at CREATE FUNCTION time;
-- make absolutely sure only service_role can call it.
REVOKE ALL ON FUNCTION public.reality_check_rate_increment(text, text, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reality_check_rate_increment(text, text, timestamptz) FROM anon;
REVOKE ALL ON FUNCTION public.reality_check_rate_increment(text, text, timestamptz) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.reality_check_rate_increment(text, text, timestamptz) TO service_role;
