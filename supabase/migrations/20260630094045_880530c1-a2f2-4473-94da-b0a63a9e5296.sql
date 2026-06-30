DROP POLICY IF EXISTS "Active opportunities are publicly readable"
  ON public.opportunities;

CREATE POLICY "Verified live opportunities are publicly readable"
  ON public.opportunities
  FOR SELECT
  USING (
    status = 'active'
    AND is_seed = false
    AND verified_at IS NOT NULL
    AND (deadline IS NULL OR deadline >= CURRENT_DATE)
  );