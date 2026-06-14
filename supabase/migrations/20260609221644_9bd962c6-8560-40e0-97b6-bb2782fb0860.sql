ALTER TABLE public.roles
  ADD COLUMN IF NOT EXISTS competition_note text,
  ADD COLUMN IF NOT EXISTS most_common_route text,
  ADD COLUMN IF NOT EXISTS pathway_source_text text;