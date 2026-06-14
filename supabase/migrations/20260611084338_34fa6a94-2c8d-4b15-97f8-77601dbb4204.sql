
-- 1) Upsert full Roles template (1010 rows)
INSERT INTO public.roles (
  role_name, role_slug, reality_rating, short_description,
  demand, demand_source, competition_level, competition_note,
  salary_entry, salary_experienced, salary_senior, salary_source,
  ai_impact_level, ai_impact_note, reality_check,
  most_common_route, pathway_school_leaver, pathway_graduate,
  pathway_adjacent, pathway_no_background, opportunity_cost,
  typical_time_to_entry, typical_backgrounds, who_not_for,
  career_regret_risk, alternative_careers,
  key_employers,
  next_step, next_step_url, uncomfortable_truth,
  confidence_level, last_reviewed, review_status,
  best_path, second_path, third_path,
  pathway_source_text, remote_friendly, job_security,
  progression_speed, ai_safety_2040, top_universities, degree_required
)
SELECT
  NULLIF(role_name,''), role_slug, NULLIF(reality_rating,''), NULLIF(short_description,''),
  NULLIF(demand,''), NULLIF(demand_source,''), NULLIF(competition_level,''), NULLIF(competition_note,''),
  salary_entry::int, salary_experienced::int, salary_senior::int, NULLIF(salary_source,''),
  NULLIF(ai_impact_level,''), NULLIF(ai_impact_note,''), NULLIF(reality_check,''),
  NULLIF(most_common_route,''), NULLIF(pathway_school_leaver,''), NULLIF(pathway_graduate,''),
  NULLIF(pathway_adjacent,''), NULLIF(pathway_no_background,''), NULLIF(opportunity_cost,''),
  NULLIF(typical_time_to_entry,''), NULLIF(typical_backgrounds,''), NULLIF(who_not_for,''),
  NULLIF(career_regret_risk,''), NULLIF(alternative_careers,''),
  CASE WHEN key_employers IS NULL OR key_employers='' THEN NULL
       ELSE string_to_array(key_employers, ',') END,
  NULLIF(next_step,''), NULLIF(next_step_url,''), NULLIF(uncomfortable_truth,''),
  NULLIF(confidence_level,''), last_reviewed, NULLIF(review_status,''),
  NULLIF(legacy_best_path,''), NULLIF(legacy_2nd_path,''), NULLIF(legacy_3rd_path,''),
  NULLIF(pathway_source_text,''), NULLIF(legacy_remote_friendly,''), NULLIF(legacy_job_security,''),
  NULLIF(legacy_progression_speed,''), NULLIF(legacy_ai_safety_2040,''),
  NULLIF(legacy_top_universities,''), NULLIF(legacy_degree_required,'')
FROM public.stg_roles_full
WHERE role_slug IS NOT NULL AND role_slug <> ''
ON CONFLICT (role_slug) DO UPDATE SET
  role_name = COALESCE(EXCLUDED.role_name, public.roles.role_name),
  reality_rating = COALESCE(EXCLUDED.reality_rating, public.roles.reality_rating),
  short_description = COALESCE(EXCLUDED.short_description, public.roles.short_description),
  demand = COALESCE(EXCLUDED.demand, public.roles.demand),
  demand_source = COALESCE(EXCLUDED.demand_source, public.roles.demand_source),
  competition_level = COALESCE(EXCLUDED.competition_level, public.roles.competition_level),
  competition_note = COALESCE(EXCLUDED.competition_note, public.roles.competition_note),
  salary_entry = COALESCE(EXCLUDED.salary_entry, public.roles.salary_entry),
  salary_experienced = COALESCE(EXCLUDED.salary_experienced, public.roles.salary_experienced),
  salary_senior = COALESCE(EXCLUDED.salary_senior, public.roles.salary_senior),
  salary_source = COALESCE(EXCLUDED.salary_source, public.roles.salary_source),
  ai_impact_level = COALESCE(EXCLUDED.ai_impact_level, public.roles.ai_impact_level),
  ai_impact_note = COALESCE(EXCLUDED.ai_impact_note, public.roles.ai_impact_note),
  reality_check = COALESCE(EXCLUDED.reality_check, public.roles.reality_check),
  most_common_route = COALESCE(EXCLUDED.most_common_route, public.roles.most_common_route),
  pathway_school_leaver = COALESCE(EXCLUDED.pathway_school_leaver, public.roles.pathway_school_leaver),
  pathway_graduate = COALESCE(EXCLUDED.pathway_graduate, public.roles.pathway_graduate),
  pathway_adjacent = COALESCE(EXCLUDED.pathway_adjacent, public.roles.pathway_adjacent),
  pathway_no_background = COALESCE(EXCLUDED.pathway_no_background, public.roles.pathway_no_background),
  opportunity_cost = COALESCE(EXCLUDED.opportunity_cost, public.roles.opportunity_cost),
  typical_time_to_entry = COALESCE(EXCLUDED.typical_time_to_entry, public.roles.typical_time_to_entry),
  typical_backgrounds = COALESCE(EXCLUDED.typical_backgrounds, public.roles.typical_backgrounds),
  who_not_for = COALESCE(EXCLUDED.who_not_for, public.roles.who_not_for),
  career_regret_risk = COALESCE(EXCLUDED.career_regret_risk, public.roles.career_regret_risk),
  alternative_careers = COALESCE(EXCLUDED.alternative_careers, public.roles.alternative_careers),
  key_employers = COALESCE(EXCLUDED.key_employers, public.roles.key_employers),
  next_step = COALESCE(EXCLUDED.next_step, public.roles.next_step),
  next_step_url = COALESCE(EXCLUDED.next_step_url, public.roles.next_step_url),
  uncomfortable_truth = COALESCE(EXCLUDED.uncomfortable_truth, public.roles.uncomfortable_truth),
  confidence_level = COALESCE(EXCLUDED.confidence_level, public.roles.confidence_level),
  last_reviewed = COALESCE(EXCLUDED.last_reviewed, public.roles.last_reviewed),
  review_status = COALESCE(EXCLUDED.review_status, public.roles.review_status),
  best_path = COALESCE(EXCLUDED.best_path, public.roles.best_path),
  second_path = COALESCE(EXCLUDED.second_path, public.roles.second_path),
  third_path = COALESCE(EXCLUDED.third_path, public.roles.third_path),
  pathway_source_text = COALESCE(EXCLUDED.pathway_source_text, public.roles.pathway_source_text),
  remote_friendly = COALESCE(EXCLUDED.remote_friendly, public.roles.remote_friendly),
  job_security = COALESCE(EXCLUDED.job_security, public.roles.job_security),
  progression_speed = COALESCE(EXCLUDED.progression_speed, public.roles.progression_speed),
  ai_safety_2040 = COALESCE(EXCLUDED.ai_safety_2040, public.roles.ai_safety_2040),
  top_universities = COALESCE(EXCLUDED.top_universities, public.roles.top_universities),
  degree_required = COALESCE(EXCLUDED.degree_required, public.roles.degree_required),
  updated_at = now();

-- 2) Overlay Gold Roles reviewed data (wins on overlapping fields)
INSERT INTO public.roles (
  role_name, role_slug, reality_rating, short_description,
  demand, competition_level, salary_entry, salary_experienced, salary_senior,
  ai_impact_level, ai_impact_note, reality_check, uncomfortable_truth, next_step
)
SELECT
  NULLIF(role_name,''), role_slug, NULLIF(reality_rating,''), NULLIF(short_description,''),
  NULLIF(demand,''), NULLIF(competition_level,''),
  salary_entry::int, salary_experienced::int, salary_senior::int,
  NULLIF(ai_impact_level,''), NULLIF(ai_impact_note,''),
  NULLIF(reality_check,''), NULLIF(uncomfortable_truth,''), NULLIF(next_step,'')
FROM public.stg_gold_roles
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

-- 3) Providers upsert by name (no unique constraint, do UPDATE then INSERT-where-missing)
UPDATE public.providers p SET
  provider_org = COALESCE(s.provider_org, p.provider_org),
  roles_covered = COALESCE(s.roles_covered, p.roles_covered),
  location = COALESCE(s.location, p.location),
  format = COALESCE(s.format, p.format),
  duration = COALESCE(s.duration, p.duration),
  cost_gbp = COALESCE(s.cost_gbp, p.cost_gbp),
  funded = COALESCE(s.funded, p.funded),
  funding_type = COALESCE(s.funding_type, p.funding_type),
  is_skills_bootcamp = COALESCE(s.is_skills_bootcamp, p.is_skills_bootcamp),
  next_start_date = COALESCE(s.next_start_date, p.next_start_date),
  apply_url = COALESCE(s.apply_url, p.apply_url),
  employment_rate = COALESCE(s.employment_rate, p.employment_rate),
  avg_graduate_salary = COALESCE(s.avg_graduate_salary, p.avg_graduate_salary),
  employer_acceptance = COALESCE(s.employer_acceptance, p.employer_acceptance),
  honest_notes = COALESCE(s.honest_notes, p.honest_notes),
  prerequisites = COALESCE(s.prerequisites, p.prerequisites),
  job_placement_support = COALESCE(s.job_placement_support, p.job_placement_support),
  tier = COALESCE(s.tier, p.tier),
  updated_at = now()
FROM public.stg_providers s
WHERE lower(trim(p.name)) = lower(trim(s.name));

INSERT INTO public.providers (
  name, provider_org, roles_covered, location, format, duration, cost_gbp,
  funded, funding_type, is_skills_bootcamp, next_start_date, apply_url,
  employment_rate, avg_graduate_salary, employer_acceptance, honest_notes,
  prerequisites, job_placement_support, tier
)
SELECT s.name, s.provider_org, s.roles_covered, s.location, s.format, s.duration, s.cost_gbp,
  s.funded, s.funding_type, s.is_skills_bootcamp, s.next_start_date, s.apply_url,
  s.employment_rate, s.avg_graduate_salary, s.employer_acceptance, s.honest_notes,
  s.prerequisites, s.job_placement_support, s.tier
FROM public.stg_providers s
WHERE NOT EXISTS (
  SELECT 1 FROM public.providers p WHERE lower(trim(p.name)) = lower(trim(s.name))
);

-- 4) Provider Pathways: lookup ids and upsert
INSERT INTO public.provider_pathways (provider_id, role_id, pathway_type, priority)
SELECT p.id, r.id, s.pathway_type, s.priority
FROM public.stg_pathways s
JOIN public.providers p ON lower(trim(p.name)) = lower(trim(s.provider_name))
JOIN public.roles r ON r.role_slug = s.role_slug
ON CONFLICT (provider_id, role_id, pathway_type) DO UPDATE SET
  priority = EXCLUDED.priority;

-- 5) Apprenticeships upsert by standard_name
UPDATE public.apprenticeships a SET
  training_provider = COALESCE(s.training_provider, a.training_provider),
  employer = COALESCE(s.employer, a.employer),
  roles_covered = COALESCE(s.roles_covered, a.roles_covered),
  level = COALESCE(s.level, a.level),
  equivalent_to = COALESCE(s.equivalent_to, a.equivalent_to),
  duration = COALESCE(s.duration, a.duration),
  typical_salary = COALESCE(s.typical_salary, a.typical_salary),
  location = COALESCE(s.location, a.location),
  format = COALESCE(s.format, a.format),
  fully_funded = COALESCE(s.fully_funded, a.fully_funded),
  apply_url = COALESCE(s.apply_url, a.apply_url),
  completion_rate = COALESCE(s.completion_rate, a.completion_rate),
  key_employers = COALESCE(s.key_employers, a.key_employers),
  honest_notes = COALESCE(s.honest_notes, a.honest_notes),
  updated_at = now()
FROM public.stg_apprenticeships s
WHERE lower(trim(a.standard_name)) = lower(trim(s.standard_name));

INSERT INTO public.apprenticeships (
  standard_name, training_provider, employer, roles_covered, level, equivalent_to,
  duration, typical_salary, location, format, fully_funded, apply_url,
  completion_rate, key_employers, honest_notes
)
SELECT s.standard_name, s.training_provider, s.employer, s.roles_covered, s.level, s.equivalent_to,
  s.duration, s.typical_salary, s.location, s.format, s.fully_funded, s.apply_url,
  s.completion_rate, s.key_employers, s.honest_notes
FROM public.stg_apprenticeships s
WHERE NOT EXISTS (
  SELECT 1 FROM public.apprenticeships a WHERE lower(trim(a.standard_name)) = lower(trim(s.standard_name))
);

-- 6) Cleanup staging
DROP TABLE public.stg_gold_roles;
DROP TABLE public.stg_roles_full;
DROP TABLE public.stg_providers;
DROP TABLE public.stg_pathways;
DROP TABLE public.stg_apprenticeships;
