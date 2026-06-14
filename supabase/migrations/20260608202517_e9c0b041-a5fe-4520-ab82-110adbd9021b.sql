
ALTER TABLE public.roles DROP CONSTRAINT IF EXISTS roles_competition_level_check;
ALTER TABLE public.roles ADD CONSTRAINT roles_competition_level_check
  CHECK (competition_level IS NULL OR competition_level = ANY (ARRAY['Low','Moderate','High','Extreme']));
