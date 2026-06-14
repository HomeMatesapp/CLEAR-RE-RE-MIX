ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS quiz_situation text,
  ADD COLUMN IF NOT EXISTS quiz_priorities text[],
  ADD COLUMN IF NOT EXISTS quiz_time text,
  ADD COLUMN IF NOT EXISTS quiz_background text,
  ADD COLUMN IF NOT EXISTS quiz_target_role text;