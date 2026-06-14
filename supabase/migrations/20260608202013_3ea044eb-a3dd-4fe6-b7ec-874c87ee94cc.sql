
ALTER TABLE public.roles
  ADD COLUMN IF NOT EXISTS reality_rating text,
  ADD COLUMN IF NOT EXISTS key_employers text[];
