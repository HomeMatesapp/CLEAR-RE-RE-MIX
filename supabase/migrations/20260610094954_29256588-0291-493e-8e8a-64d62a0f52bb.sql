CREATE TABLE public.gold_roles_staging (
  role_name text, role_slug text, reality_rating text, short_description text,
  demand text, competition_level text, salary_entry text, salary_experienced text, salary_senior text,
  ai_impact_level text, ai_impact_note text, reality_check text, uncomfortable_truth text, next_step text
);
GRANT ALL ON public.gold_roles_staging TO service_role, authenticated;