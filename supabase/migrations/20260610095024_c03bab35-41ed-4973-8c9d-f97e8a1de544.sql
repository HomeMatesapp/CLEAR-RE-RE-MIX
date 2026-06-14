INSERT INTO public.roles (
  role_name, role_slug, reality_rating, short_description, demand, competition_level,
  salary_entry, salary_experienced, salary_senior, ai_impact_level, ai_impact_note,
  reality_check, uncomfortable_truth, next_step
)
SELECT
  NULLIF(role_name,''), role_slug, NULLIF(reality_rating,''), NULLIF(short_description,''),
  NULLIF(demand,''), NULLIF(competition_level,''),
  NULLIF(salary_entry,'')::int, NULLIF(salary_experienced,'')::int, NULLIF(salary_senior,'')::int,
  NULLIF(ai_impact_level,''), NULLIF(ai_impact_note,''),
  NULLIF(reality_check,''), NULLIF(uncomfortable_truth,''), NULLIF(next_step,'')
FROM public.gold_roles_staging
WHERE role_slug IS NOT NULL AND role_slug <> ''
ON CONFLICT (role_slug) DO UPDATE SET
  role_name = COALESCE(EXCLUDED.role_name, public.roles.role_name),
  reality_rating = COALESCE(EXCLUDED.reality_rating, public.roles.reality_rating),
  short_description = COALESCE(EXCLUDED.short_description, public.roles.short_description),
  demand = COALESCE(EXCLUDED.demand, public.roles.demand),
  competition_level = COALESCE(EXCLUDED.competition_level, public.roles.competition_level),
  salary_entry = COALESCE(EXCLUDED.salary_entry, public.roles.salary_entry),
  salary_experienced = COALESCE(EXCLUDED.salary_experienced, public.roles.salary_experienced),
  salary_senior = COALESCE(EXCLUDED.salary_senior, public.roles.salary_senior),
  ai_impact_level = COALESCE(EXCLUDED.ai_impact_level, public.roles.ai_impact_level),
  ai_impact_note = COALESCE(EXCLUDED.ai_impact_note, public.roles.ai_impact_note),
  reality_check = COALESCE(EXCLUDED.reality_check, public.roles.reality_check),
  uncomfortable_truth = COALESCE(EXCLUDED.uncomfortable_truth, public.roles.uncomfortable_truth),
  next_step = COALESCE(EXCLUDED.next_step, public.roles.next_step),
  updated_at = now();

DROP TABLE public.gold_roles_staging;