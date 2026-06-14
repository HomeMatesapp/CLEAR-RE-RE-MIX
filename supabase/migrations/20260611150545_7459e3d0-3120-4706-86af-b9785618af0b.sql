
UPDATE public.stg_roles_full SET ai_impact_level='Moderate' WHERE ai_impact_level='Medium';

-- ROLES from full template
INSERT INTO public.roles (
  role_name, role_slug, reality_rating, short_description, demand, demand_source,
  competition_level, competition_note, salary_entry, salary_experienced, salary_senior, salary_source,
  ai_impact_level, ai_impact_note, reality_check, most_common_route,
  pathway_school_leaver, pathway_graduate, pathway_adjacent, pathway_no_background,
  opportunity_cost, typical_time_to_entry, typical_backgrounds, who_not_for,
  career_regret_risk, alternative_careers, key_employers, next_step, next_step_url,
  uncomfortable_truth, confidence_level, last_reviewed, review_status,
  best_path, second_path, third_path, pathway_source_text,
  remote_friendly, job_security, progression_speed, ai_safety_2040, top_universities, degree_required
)
SELECT
  NULLIF(role_name,''), role_slug, NULLIF(reality_rating,''), NULLIF(short_description,''),
  NULLIF(demand,''), NULLIF(demand_source,''), NULLIF(competition_level,''), NULLIF(competition_note,''),
  (substring(salary_entry from '[0-9]+(?:\.[0-9]+)?'))::numeric::int,
  (substring(salary_experienced from '[0-9]+(?:\.[0-9]+)?'))::numeric::int,
  (substring(salary_senior from '[0-9]+(?:\.[0-9]+)?'))::numeric::int,
  NULLIF(salary_source,''), NULLIF(ai_impact_level,''), NULLIF(ai_impact_note,''), NULLIF(reality_check,''),
  NULLIF(most_common_route,''), NULLIF(pathway_school_leaver,''), NULLIF(pathway_graduate,''),
  NULLIF(pathway_adjacent,''), NULLIF(pathway_no_background,''), NULLIF(opportunity_cost,''),
  NULLIF(typical_time_to_entry,''), NULLIF(typical_backgrounds,''), NULLIF(who_not_for,''),
  NULLIF(career_regret_risk,''), NULLIF(alternative_careers,''),
  CASE WHEN NULLIF(key_employers,'') IS NULL THEN NULL ELSE string_to_array(key_employers,',') END,
  NULLIF(next_step,''), NULLIF(next_step_url,''), NULLIF(uncomfortable_truth,''),
  NULLIF(confidence_level,''),
  CASE WHEN NULLIF(last_reviewed,'') IS NULL THEN NULL ELSE last_reviewed::date END,
  NULLIF(review_status,''), NULLIF(legacy_best_path,''), NULLIF(legacy_2nd_path,''), NULLIF(legacy_3rd_path,''),
  NULLIF(pathway_source_text,''), NULLIF(legacy_remote_friendly,''), NULLIF(legacy_job_security,''),
  NULLIF(legacy_progression_speed,''), NULLIF(legacy_ai_safety_2040,''),
  NULLIF(legacy_top_universities,''), NULLIF(legacy_degree_required,'')
FROM (
  SELECT DISTINCT ON (role_slug) * FROM public.stg_roles_full
  WHERE role_slug IS NOT NULL AND role_slug <> ''
  ORDER BY role_slug, ctid DESC
) stg_roles_full
ON CONFLICT (role_slug) DO UPDATE SET
  role_name = COALESCE(EXCLUDED.role_name, roles.role_name),
  reality_rating = COALESCE(EXCLUDED.reality_rating, roles.reality_rating),
  short_description = COALESCE(EXCLUDED.short_description, roles.short_description),
  demand = COALESCE(EXCLUDED.demand, roles.demand),
  demand_source = COALESCE(EXCLUDED.demand_source, roles.demand_source),
  competition_level = COALESCE(EXCLUDED.competition_level, roles.competition_level),
  competition_note = COALESCE(EXCLUDED.competition_note, roles.competition_note),
  salary_entry = COALESCE(EXCLUDED.salary_entry, roles.salary_entry),
  salary_experienced = COALESCE(EXCLUDED.salary_experienced, roles.salary_experienced),
  salary_senior = COALESCE(EXCLUDED.salary_senior, roles.salary_senior),
  salary_source = COALESCE(EXCLUDED.salary_source, roles.salary_source),
  ai_impact_level = COALESCE(EXCLUDED.ai_impact_level, roles.ai_impact_level),
  ai_impact_note = COALESCE(EXCLUDED.ai_impact_note, roles.ai_impact_note),
  reality_check = COALESCE(EXCLUDED.reality_check, roles.reality_check),
  most_common_route = COALESCE(EXCLUDED.most_common_route, roles.most_common_route),
  pathway_school_leaver = COALESCE(EXCLUDED.pathway_school_leaver, roles.pathway_school_leaver),
  pathway_graduate = COALESCE(EXCLUDED.pathway_graduate, roles.pathway_graduate),
  pathway_adjacent = COALESCE(EXCLUDED.pathway_adjacent, roles.pathway_adjacent),
  pathway_no_background = COALESCE(EXCLUDED.pathway_no_background, roles.pathway_no_background),
  opportunity_cost = COALESCE(EXCLUDED.opportunity_cost, roles.opportunity_cost),
  typical_time_to_entry = COALESCE(EXCLUDED.typical_time_to_entry, roles.typical_time_to_entry),
  typical_backgrounds = COALESCE(EXCLUDED.typical_backgrounds, roles.typical_backgrounds),
  who_not_for = COALESCE(EXCLUDED.who_not_for, roles.who_not_for),
  career_regret_risk = COALESCE(EXCLUDED.career_regret_risk, roles.career_regret_risk),
  alternative_careers = COALESCE(EXCLUDED.alternative_careers, roles.alternative_careers),
  key_employers = COALESCE(EXCLUDED.key_employers, roles.key_employers),
  next_step = COALESCE(EXCLUDED.next_step, roles.next_step),
  next_step_url = COALESCE(EXCLUDED.next_step_url, roles.next_step_url),
  uncomfortable_truth = COALESCE(EXCLUDED.uncomfortable_truth, roles.uncomfortable_truth),
  confidence_level = COALESCE(EXCLUDED.confidence_level, roles.confidence_level),
  last_reviewed = COALESCE(EXCLUDED.last_reviewed, roles.last_reviewed),
  review_status = COALESCE(EXCLUDED.review_status, roles.review_status),
  best_path = COALESCE(EXCLUDED.best_path, roles.best_path),
  second_path = COALESCE(EXCLUDED.second_path, roles.second_path),
  third_path = COALESCE(EXCLUDED.third_path, roles.third_path),
  pathway_source_text = COALESCE(EXCLUDED.pathway_source_text, roles.pathway_source_text),
  remote_friendly = COALESCE(EXCLUDED.remote_friendly, roles.remote_friendly),
  job_security = COALESCE(EXCLUDED.job_security, roles.job_security),
  progression_speed = COALESCE(EXCLUDED.progression_speed, roles.progression_speed),
  ai_safety_2040 = COALESCE(EXCLUDED.ai_safety_2040, roles.ai_safety_2040),
  top_universities = COALESCE(EXCLUDED.top_universities, roles.top_universities),
  degree_required = COALESCE(EXCLUDED.degree_required, roles.degree_required),
  updated_at = now();

-- GOLD overlay
INSERT INTO public.roles (
  role_name, role_slug, reality_rating, short_description, demand, competition_level,
  salary_entry, salary_experienced, salary_senior, confidence_level, review_status,
  reality_check, uncomfortable_truth, next_step
)
SELECT
  NULLIF(role_name,''), role_slug, NULLIF(reality_rating,''), NULLIF(short_description,''),
  NULLIF(demand,''), NULLIF(competition_level,''),
  (substring(salary_entry from '[0-9]+(?:\.[0-9]+)?'))::numeric::int,
  (substring(salary_experienced from '[0-9]+(?:\.[0-9]+)?'))::numeric::int,
  (substring(salary_senior from '[0-9]+(?:\.[0-9]+)?'))::numeric::int,
  NULLIF(confidence_level,''), NULLIF(review_status,''),
  NULLIF(reality_check,''), NULLIF(uncomfortable_truth,''), NULLIF(next_step,'')
FROM (
  SELECT DISTINCT ON (role_slug) * FROM public.stg_gold_roles
  WHERE role_slug IS NOT NULL AND role_slug <> ''
  ORDER BY role_slug, ctid DESC
) g
ON CONFLICT (role_slug) DO UPDATE SET
  role_name = COALESCE(EXCLUDED.role_name, roles.role_name),
  reality_rating = COALESCE(EXCLUDED.reality_rating, roles.reality_rating),
  short_description = COALESCE(EXCLUDED.short_description, roles.short_description),
  demand = COALESCE(EXCLUDED.demand, roles.demand),
  competition_level = COALESCE(EXCLUDED.competition_level, roles.competition_level),
  salary_entry = COALESCE(EXCLUDED.salary_entry, roles.salary_entry),
  salary_experienced = COALESCE(EXCLUDED.salary_experienced, roles.salary_experienced),
  salary_senior = COALESCE(EXCLUDED.salary_senior, roles.salary_senior),
  confidence_level = COALESCE(EXCLUDED.confidence_level, roles.confidence_level),
  review_status = COALESCE(EXCLUDED.review_status, roles.review_status),
  reality_check = COALESCE(EXCLUDED.reality_check, roles.reality_check),
  uncomfortable_truth = COALESCE(EXCLUDED.uncomfortable_truth, roles.uncomfortable_truth),
  next_step = COALESCE(EXCLUDED.next_step, roles.next_step),
  updated_at = now();

-- PROVIDERS
WITH s AS (
  SELECT DISTINCT ON (lower(name)) * FROM public.stg_providers
  WHERE name IS NOT NULL AND name <> ''
  ORDER BY lower(name), ctid DESC
)
UPDATE public.providers p SET
  provider_org = COALESCE(NULLIF(s.provider_org,''), p.provider_org),
  roles_covered = COALESCE(CASE WHEN NULLIF(s.roles_covered,'') IS NULL THEN NULL ELSE string_to_array(s.roles_covered,',') END, p.roles_covered),
  location = COALESCE(NULLIF(s.location,''), p.location),
  format = COALESCE(NULLIF(s.format,''), p.format),
  duration = COALESCE(NULLIF(s.duration,''), p.duration),
  cost_gbp = COALESCE((substring(s.cost_gbp from '[0-9]+(?:\.[0-9]+)?'))::numeric, p.cost_gbp),
  funded = COALESCE(NULLIF(s.funded,''), p.funded),
  funding_type = COALESCE(NULLIF(s.funding_type,''), p.funding_type),
  is_skills_bootcamp = COALESCE(CASE WHEN lower(NULLIF(s.is_skills_bootcamp,'')) IN ('true','yes','y','1') THEN true WHEN lower(NULLIF(s.is_skills_bootcamp,'')) IN ('false','no','n','0') THEN false ELSE NULL END, p.is_skills_bootcamp),
  next_start_date = COALESCE(NULLIF(s.next_start_date,''), p.next_start_date),
  apply_url = COALESCE(NULLIF(s.apply_url,''), p.apply_url),
  employment_rate = COALESCE(NULLIF(s.employment_rate,''), p.employment_rate),
  avg_graduate_salary = COALESCE(NULLIF(s.avg_graduate_salary,''), p.avg_graduate_salary),
  employer_acceptance = COALESCE(NULLIF(s.employer_acceptance,''), p.employer_acceptance),
  honest_notes = COALESCE(NULLIF(s.honest_notes,''), p.honest_notes),
  prerequisites = COALESCE(NULLIF(s.prerequisites,''), p.prerequisites),
  job_placement_support = COALESCE(NULLIF(s.job_placement_support,''), p.job_placement_support),
  tier = COALESCE(NULLIF(s.tier,''), p.tier),
  updated_at = now()
FROM s WHERE lower(p.name) = lower(s.name);

INSERT INTO public.providers (
  name, provider_org, roles_covered, location, format, duration, cost_gbp, funded, funding_type,
  is_skills_bootcamp, next_start_date, apply_url, employment_rate, avg_graduate_salary,
  employer_acceptance, honest_notes, prerequisites, job_placement_support, tier
)
SELECT s.name, NULLIF(s.provider_org,''),
  CASE WHEN NULLIF(s.roles_covered,'') IS NULL THEN NULL ELSE string_to_array(s.roles_covered,',') END,
  NULLIF(s.location,''), NULLIF(s.format,''), NULLIF(s.duration,''),
  (substring(s.cost_gbp from '[0-9]+(?:\.[0-9]+)?'))::numeric,
  NULLIF(s.funded,''), NULLIF(s.funding_type,''),
  CASE WHEN lower(NULLIF(s.is_skills_bootcamp,'')) IN ('true','yes','y','1') THEN true WHEN lower(NULLIF(s.is_skills_bootcamp,'')) IN ('false','no','n','0') THEN false ELSE NULL END,
  NULLIF(s.next_start_date,''), NULLIF(s.apply_url,''), NULLIF(s.employment_rate,''),
  NULLIF(s.avg_graduate_salary,''), NULLIF(s.employer_acceptance,''), NULLIF(s.honest_notes,''),
  NULLIF(s.prerequisites,''), NULLIF(s.job_placement_support,''), NULLIF(s.tier,'')
FROM (
  SELECT DISTINCT ON (lower(name)) * FROM public.stg_providers
  WHERE name IS NOT NULL AND name <> ''
  ORDER BY lower(name), ctid DESC
) s
WHERE NOT EXISTS (SELECT 1 FROM public.providers p WHERE lower(p.name) = lower(s.name));

-- PATHWAYS
CREATE UNIQUE INDEX IF NOT EXISTS provider_pathways_unique_idx ON public.provider_pathways (provider_id, role_id, pathway_type);

INSERT INTO public.provider_pathways (provider_id, role_id, pathway_type, priority)
SELECT DISTINCT ON (p.id, r.id, NULLIF(s.pathway_type,'')) p.id, r.id, NULLIF(s.pathway_type,''),
  (substring(s.priority from '[0-9]+'))::int
FROM public.stg_pathways s
JOIN public.providers p ON lower(p.name) = lower(s.provider_name)
JOIN public.roles r ON r.role_slug = s.role_slug
ORDER BY p.id, r.id, NULLIF(s.pathway_type,''), s.ctid DESC
ON CONFLICT (provider_id, role_id, pathway_type) DO UPDATE SET priority = COALESCE(EXCLUDED.priority, provider_pathways.priority);

-- APPRENTICESHIPS
WITH s AS (
  SELECT DISTINCT ON (lower(standard_name)) * FROM public.stg_apprenticeships
  WHERE standard_name IS NOT NULL AND standard_name <> ''
  ORDER BY lower(standard_name), ctid DESC
)
UPDATE public.apprenticeships a SET
  training_provider = COALESCE(NULLIF(s.training_provider,''), a.training_provider),
  employer = COALESCE(NULLIF(s.employer,''), a.employer),
  roles_covered = COALESCE(CASE WHEN NULLIF(s.roles_covered,'') IS NULL THEN NULL ELSE string_to_array(s.roles_covered,',') END, a.roles_covered),
  level = COALESCE((substring(s.level from '[0-9]+'))::int, a.level),
  equivalent_to = COALESCE(NULLIF(s.equivalent_to,''), a.equivalent_to),
  duration = COALESCE(NULLIF(s.duration,''), a.duration),
  typical_salary = COALESCE(NULLIF(s.typical_salary,''), a.typical_salary),
  location = COALESCE(NULLIF(s.location,''), a.location),
  format = COALESCE(NULLIF(s.format,''), a.format),
  fully_funded = COALESCE(CASE WHEN lower(NULLIF(s.fully_funded,'')) IN ('true','yes','y','1') THEN true WHEN lower(NULLIF(s.fully_funded,'')) IN ('false','no','n','0') THEN false ELSE NULL END, a.fully_funded),
  apply_url = COALESCE(NULLIF(s.apply_url,''), a.apply_url),
  completion_rate = COALESCE(NULLIF(s.completion_rate,''), a.completion_rate),
  key_employers = COALESCE(NULLIF(s.key_employers,''), a.key_employers),
  honest_notes = COALESCE(NULLIF(s.honest_notes,''), a.honest_notes),
  updated_at = now()
FROM s WHERE lower(a.standard_name) = lower(s.standard_name);

INSERT INTO public.apprenticeships (
  standard_name, training_provider, employer, roles_covered, level, equivalent_to, duration,
  typical_salary, location, format, fully_funded, apply_url, completion_rate, key_employers, honest_notes
)
SELECT s.standard_name, NULLIF(s.training_provider,''), NULLIF(s.employer,''),
  CASE WHEN NULLIF(s.roles_covered,'') IS NULL THEN NULL ELSE string_to_array(s.roles_covered,',') END,
  (substring(s.level from '[0-9]+'))::int,
  NULLIF(s.equivalent_to,''), NULLIF(s.duration,''),
  NULLIF(s.typical_salary,''), NULLIF(s.location,''), NULLIF(s.format,''),
  CASE WHEN lower(NULLIF(s.fully_funded,'')) IN ('true','yes','y','1') THEN true WHEN lower(NULLIF(s.fully_funded,'')) IN ('false','no','n','0') THEN false ELSE NULL END,
  NULLIF(s.apply_url,''), NULLIF(s.completion_rate,''), NULLIF(s.key_employers,''), NULLIF(s.honest_notes,'')
FROM (
  SELECT DISTINCT ON (lower(standard_name)) * FROM public.stg_apprenticeships
  WHERE standard_name IS NOT NULL AND standard_name <> ''
  ORDER BY lower(standard_name), ctid DESC
) s
WHERE NOT EXISTS (SELECT 1 FROM public.apprenticeships a WHERE lower(a.standard_name) = lower(s.standard_name));

DROP TABLE public.stg_gold_roles;
DROP TABLE public.stg_roles_full;
DROP TABLE public.stg_providers;
DROP TABLE public.stg_pathways;
DROP TABLE public.stg_apprenticeships;
