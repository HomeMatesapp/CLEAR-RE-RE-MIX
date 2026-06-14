ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS has_degree boolean,
  ADD COLUMN IF NOT EXISTS personalisation_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS personalisation_last_step integer;