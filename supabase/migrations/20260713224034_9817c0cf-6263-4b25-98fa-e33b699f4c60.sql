
ALTER TABLE public.roles DROP CONSTRAINT IF EXISTS roles_competition_level_check;
ALTER TABLE public.roles ADD CONSTRAINT roles_competition_level_check
  CHECK (competition_level IS NULL OR competition_level = ANY (ARRAY['Low','Moderate','High','Extreme']));
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS has_degree boolean,
  ADD COLUMN IF NOT EXISTS personalisation_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS personalisation_last_step integer;UPDATE public.roles SET short_description = 'AI Engineering is one of the highest-paid technology careers in the UK, but it is rarely an entry-level role. Most people enter through Computer Science, Mathematics, Software Engineering or Data Science and spend years building technical depth before specialising.' WHERE role_slug = 'ai-engineer';ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS lead_capture_enabled boolean NOT NULL DEFAULT false;CREATE TABLE public.roles_staging (
  role_name text, role_slug text, reality_rating text, short_description text,
  demand text, demand_source text, competition_level text,
  salary_entry integer, salary_experienced integer, salary_senior integer,
  salary_source text, ai_impact_level text, ai_impact_note text, reality_check text,
  pathway_school_leaver text, pathway_graduate text, pathway_adjacent text, pathway_no_background text,
  opportunity_cost text, typical_time_to_entry text, typical_backgrounds text, who_not_for text,
  career_regret_risk text, alternative_careers text, key_employers text,
  next_step text, next_step_url text, uncomfortable_truth text, confidence_level text,
  last_reviewed date, review_status text,
  best_path text, second_path text, third_path text,
  remote_friendly text, job_security text, progression_speed text,
  ai_safety_2040 text, top_universities text, degree_required text
);
GRANT ALL ON public.roles_staging TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roles_staging TO authenticated;
ALTER TABLE public.roles_staging ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service only" ON public.roles_staging FOR ALL USING (false) WITH CHECK (false);DROP TABLE IF EXISTS public.roles_staging;
CREATE TABLE public.roles_staging (
  role_name text, role_slug text, reality_rating text, short_description text,
  demand text, demand_source text, competition_level text, competition_note text,
  salary_entry text, salary_experienced text, salary_senior text, salary_source text,
  ai_impact_level text, ai_impact_note text, reality_check text, most_common_route text,
  pathway_school_leaver text, pathway_graduate text, pathway_adjacent text, pathway_no_background text,
  opportunity_cost text, typical_time_to_entry text, typical_backgrounds text, who_not_for text,
  career_regret_risk text, alternative_careers text, key_employers text, next_step text,
  next_step_url text, uncomfortable_truth text, confidence_level text, last_reviewed text,
  review_status text, legacy_best_path text, legacy_2nd_path text, legacy_3rd_path text,
  pathway_source_text text, legacy_remote_friendly text, legacy_job_security text,
  legacy_progression_speed text, legacy_ai_safety_2040 text, legacy_top_universities text,
  legacy_degree_required text
);
GRANT ALL ON public.roles_staging TO service_role;
ALTER TABLE public.roles_staging ENABLE ROW LEVEL SECURITY;ALTER TABLE public.roles
  ADD COLUMN IF NOT EXISTS competition_note text,
  ADD COLUMN IF NOT EXISTS most_common_route text,
  ADD COLUMN IF NOT EXISTS pathway_source_text text;WITH dedup AS (
  SELECT DISTINCT ON (role_slug) *
  FROM public.roles_staging
  WHERE NULLIF(role_slug,'') IS NOT NULL
  ORDER BY role_slug, ctid
)
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
  NULLIF(demand,''), NULLIF(demand_source,''),
  NULLIF(competition_level,''), NULLIF(competition_note,''),
  NULLIF(salary_entry,'')::int, NULLIF(salary_experienced,'')::int, NULLIF(salary_senior,'')::int, NULLIF(salary_source,''),
  NULLIF(ai_impact_level,''), NULLIF(ai_impact_note,''), NULLIF(reality_check,''), NULLIF(most_common_route,''),
  NULLIF(pathway_school_leaver,''), NULLIF(pathway_graduate,''), NULLIF(pathway_adjacent,''), NULLIF(pathway_no_background,''),
  NULLIF(opportunity_cost,''), NULLIF(typical_time_to_entry,''), NULLIF(typical_backgrounds,''), NULLIF(who_not_for,''),
  NULLIF(career_regret_risk,''), NULLIF(alternative_careers,''),
  CASE WHEN NULLIF(key_employers,'') IS NULL THEN NULL
       ELSE ARRAY(SELECT trim(x) FROM unnest(string_to_array(key_employers, ',')) AS x WHERE trim(x) <> '')
  END,
  NULLIF(next_step,''), NULLIF(next_step_url,''),
  NULLIF(uncomfortable_truth,''), NULLIF(confidence_level,''), NULLIF(last_reviewed,'')::date, NULLIF(review_status,''),
  NULLIF(legacy_best_path,''), NULLIF(legacy_2nd_path,''), NULLIF(legacy_3rd_path,''), NULLIF(pathway_source_text,''),
  NULLIF(legacy_remote_friendly,''), NULLIF(legacy_job_security,''), NULLIF(legacy_progression_speed,''),
  NULLIF(legacy_ai_safety_2040,''), NULLIF(legacy_top_universities,''), NULLIF(legacy_degree_required,'')
FROM dedup
ON CONFLICT (role_slug) DO UPDATE SET
  role_name=EXCLUDED.role_name, reality_rating=EXCLUDED.reality_rating, short_description=EXCLUDED.short_description,
  demand=EXCLUDED.demand, demand_source=EXCLUDED.demand_source,
  competition_level=EXCLUDED.competition_level, competition_note=EXCLUDED.competition_note,
  salary_entry=EXCLUDED.salary_entry, salary_experienced=EXCLUDED.salary_experienced,
  salary_senior=EXCLUDED.salary_senior, salary_source=EXCLUDED.salary_source,
  ai_impact_level=EXCLUDED.ai_impact_level, ai_impact_note=EXCLUDED.ai_impact_note,
  reality_check=EXCLUDED.reality_check, most_common_route=EXCLUDED.most_common_route,
  pathway_school_leaver=EXCLUDED.pathway_school_leaver, pathway_graduate=EXCLUDED.pathway_graduate,
  pathway_adjacent=EXCLUDED.pathway_adjacent, pathway_no_background=EXCLUDED.pathway_no_background,
  opportunity_cost=EXCLUDED.opportunity_cost, typical_time_to_entry=EXCLUDED.typical_time_to_entry,
  typical_backgrounds=EXCLUDED.typical_backgrounds, who_not_for=EXCLUDED.who_not_for,
  career_regret_risk=EXCLUDED.career_regret_risk, alternative_careers=EXCLUDED.alternative_careers,
  key_employers=EXCLUDED.key_employers, next_step=EXCLUDED.next_step, next_step_url=EXCLUDED.next_step_url,
  uncomfortable_truth=EXCLUDED.uncomfortable_truth, confidence_level=EXCLUDED.confidence_level,
  last_reviewed=EXCLUDED.last_reviewed, review_status=EXCLUDED.review_status,
  best_path=EXCLUDED.best_path, second_path=EXCLUDED.second_path, third_path=EXCLUDED.third_path,
  pathway_source_text=EXCLUDED.pathway_source_text,
  remote_friendly=EXCLUDED.remote_friendly, job_security=EXCLUDED.job_security,
  progression_speed=EXCLUDED.progression_speed, ai_safety_2040=EXCLUDED.ai_safety_2040,
  top_universities=EXCLUDED.top_universities, degree_required=EXCLUDED.degree_required,
  updated_at=now();

DROP TABLE public.roles_staging;CREATE TABLE public.gold_roles_staging (
  role_name text, role_slug text, reality_rating text, short_description text,
  demand text, competition_level text, salary_entry text, salary_experienced text, salary_senior text,
  ai_impact_level text, ai_impact_note text, reality_check text, uncomfortable_truth text, next_step text
);
GRANT ALL ON public.gold_roles_staging TO service_role, authenticated;INSERT INTO public.roles (
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
DROP TABLE IF EXISTS public.stg_gold_roles;
DROP TABLE IF EXISTS public.stg_roles_full;
DROP TABLE IF EXISTS public.stg_providers;
DROP TABLE IF EXISTS public.stg_pathways;
DROP TABLE IF EXISTS public.stg_apprenticeships;

CREATE TABLE public.stg_gold_roles (
  role_name text, role_slug text, reality_rating text, short_description text,
  demand text, competition_level text, salary_entry numeric, salary_experienced numeric,
  salary_senior numeric, ai_impact_level text, ai_impact_note text, reality_check text,
  uncomfortable_truth text, next_step text
);
GRANT ALL ON public.stg_gold_roles TO service_role, authenticated;
ALTER TABLE public.stg_gold_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.stg_roles_full (
  role_name text, role_slug text, reality_rating text, short_description text,
  demand text, demand_source text, competition_level text, competition_note text,
  salary_entry numeric, salary_experienced numeric, salary_senior numeric, salary_source text,
  ai_impact_level text, ai_impact_note text, reality_check text,
  most_common_route text, pathway_school_leaver text, pathway_graduate text,
  pathway_adjacent text, pathway_no_background text, opportunity_cost text,
  typical_time_to_entry text, typical_backgrounds text, who_not_for text,
  career_regret_risk text, alternative_careers text, key_employers text,
  next_step text, next_step_url text, uncomfortable_truth text,
  confidence_level text, last_reviewed date, review_status text,
  legacy_best_path text, legacy_2nd_path text, legacy_3rd_path text,
  pathway_source_text text, legacy_remote_friendly text, legacy_job_security text,
  legacy_progression_speed text, legacy_ai_safety_2040 text, legacy_top_universities text,
  legacy_degree_required text, content_priority numeric
);
GRANT ALL ON public.stg_roles_full TO service_role, authenticated;
ALTER TABLE public.stg_roles_full ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.stg_providers (
  name text, provider_org text, roles_covered text[], location text, format text,
  duration text, cost_gbp numeric, funded text, funding_type text,
  is_skills_bootcamp boolean, next_start_date text, apply_url text,
  employment_rate text, avg_graduate_salary text, employer_acceptance text,
  honest_notes text, prerequisites text, job_placement_support text, tier text
);
GRANT ALL ON public.stg_providers TO service_role, authenticated;
ALTER TABLE public.stg_providers ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.stg_pathways (
  provider_name text, role_slug text, pathway_type text, priority int
);
GRANT ALL ON public.stg_pathways TO service_role, authenticated;
ALTER TABLE public.stg_pathways ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.stg_apprenticeships (
  standard_name text, training_provider text, employer text, roles_covered text[],
  level int, equivalent_to text, duration text, typical_salary text, location text,
  format text, fully_funded boolean, apply_url text, completion_rate text,
  key_employers text, honest_notes text
);
GRANT ALL ON public.stg_apprenticeships TO service_role, authenticated;
ALTER TABLE public.stg_apprenticeships ENABLE ROW LEVEL SECURITY;

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

CREATE TABLE public.stg_gold_roles (role_name text, role_slug text, reality_rating text, short_description text, demand text, competition_level text, salary_entry text, salary_experienced text, salary_senior text, confidence_level text, review_status text, reality_check text, uncomfortable_truth text, next_step text);
GRANT ALL ON public.stg_gold_roles TO service_role;
ALTER TABLE public.stg_gold_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.stg_roles_full (role_name text, role_slug text, reality_rating text, short_description text, demand text, demand_source text, competition_level text, competition_note text, salary_entry text, salary_experienced text, salary_senior text, salary_source text, ai_impact_level text, ai_impact_note text, reality_check text, most_common_route text, pathway_school_leaver text, pathway_graduate text, pathway_adjacent text, pathway_no_background text, opportunity_cost text, typical_time_to_entry text, typical_backgrounds text, who_not_for text, career_regret_risk text, alternative_careers text, key_employers text, next_step text, next_step_url text, uncomfortable_truth text, confidence_level text, last_reviewed text, review_status text, legacy_best_path text, legacy_2nd_path text, legacy_3rd_path text, pathway_source_text text, legacy_remote_friendly text, legacy_job_security text, legacy_progression_speed text, legacy_ai_safety_2040 text, legacy_top_universities text, legacy_degree_required text, content_priority text);
GRANT ALL ON public.stg_roles_full TO service_role;
ALTER TABLE public.stg_roles_full ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.stg_providers (name text, provider_org text, roles_covered text, location text, format text, duration text, cost_gbp text, funded text, funding_type text, is_skills_bootcamp text, next_start_date text, apply_url text, employment_rate text, avg_graduate_salary text, employer_acceptance text, honest_notes text, prerequisites text, job_placement_support text, tier text);
GRANT ALL ON public.stg_providers TO service_role;
ALTER TABLE public.stg_providers ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.stg_pathways (provider_name text, role_slug text, pathway_type text, priority text);
GRANT ALL ON public.stg_pathways TO service_role;
ALTER TABLE public.stg_pathways ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.stg_apprenticeships (standard_name text, training_provider text, employer text, roles_covered text, level text, equivalent_to text, duration text, typical_salary text, location text, format text, fully_funded text, apply_url text, completion_rate text, key_employers text, honest_notes text);
GRANT ALL ON public.stg_apprenticeships TO service_role;
ALTER TABLE public.stg_apprenticeships ENABLE ROW LEVEL SECURITY;

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

CREATE TABLE IF NOT EXISTS public.stg_gold (
  role_name text, reality_rating text, short_description text, demand text,
  competition_level text, salary_entry text, salary_experienced text, salary_senior text,
  salary_source text, most_common_route text, uncomfortable_truth text, certification text,
  ai_impact_level text, ai_impact_note text, key_employers text, next_step text, next_step_url text
);
GRANT ALL ON public.stg_gold TO service_role;
ALTER TABLE public.stg_gold ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.stg_roles_full (
  role_name text, role_slug text, reality_rating text, short_description text, demand text,
  demand_source text, competition_level text, competition_note text, salary_entry text,
  salary_experienced text, salary_senior text, salary_source text, ai_impact_level text,
  ai_impact_note text, reality_check text, most_common_route text, pathway_school_leaver text,
  pathway_graduate text, pathway_adjacent text, pathway_no_background text, certification text,
  opportunity_cost text, typical_time_to_entry text, typical_backgrounds text, who_not_for text,
  career_regret_risk text, alternative_careers text, key_employers text, next_step text,
  next_step_url text, uncomfortable_truth text, confidence_level text, last_reviewed text,
  review_status text, legacy_best_path text, legacy_2nd_path text, legacy_3rd_path text,
  pathway_source_text text, legacy_remote_friendly text, legacy_job_security text,
  legacy_progression_speed text, legacy_ai_safety_2040 text, legacy_top_universities text,
  legacy_degree_required text, content_priority text
);
GRANT ALL ON public.stg_roles_full TO service_role;
ALTER TABLE public.stg_roles_full ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.stg_providers (
  bootcamp_name text, provider text, roles_covered text, location text, format text,
  duration text, cost_gbp text, funded text, funding_type text, skills_bootcamp text,
  next_start_date text, apply_url text, employment_rate text, avg_graduate_salary text,
  employer_acceptance text, notes text, prerequisites text, job_placement_support text, tier text
);
GRANT ALL ON public.stg_providers TO service_role;
ALTER TABLE public.stg_providers ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.stg_pathways (
  provider_name text, role_slug text, pathway_type text, priority text
);
GRANT ALL ON public.stg_pathways TO service_role;
ALTER TABLE public.stg_pathways ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.stg_apprenticeships (
  standard_name text, training_provider text, employer text, roles_covered text,
  level text, equivalent_to text, duration text, typical_salary text, location text,
  format text, fully_funded text, apply_url text, completion_rate text, key_employers text, notes text
);
GRANT ALL ON public.stg_apprenticeships TO service_role;
ALTER TABLE public.stg_apprenticeships ENABLE ROW LEVEL SECURITY;

TRUNCATE public.stg_gold, public.stg_roles_full, public.stg_providers, public.stg_pathways, public.stg_apprenticeships;

-- Helper: slugify role names
CREATE OR REPLACE FUNCTION public._slugify(txt text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT regexp_replace(regexp_replace(lower(coalesce(txt,'')), '[^a-z0-9]+', '-', 'g'), '(^-|-$)', '', 'g')
$$;

-- Helper: extract first integer from text
CREATE OR REPLACE FUNCTION public._num(txt text) RETURNS int
LANGUAGE sql IMMUTABLE AS $$
  SELECT NULLIF(regexp_replace(coalesce(substring(txt from '[0-9][0-9,\.]*'), ''), '[,\.].*', ''), '')::int
$$;

-- 1) UPSERT roles from the FULL template (stg_roles_full)
WITH src AS (
  SELECT DISTINCT ON (role_slug)
    NULLIF(role_name,'')           AS role_name,
    NULLIF(role_slug,'')           AS role_slug,
    NULLIF(reality_rating,'')      AS reality_rating,
    NULLIF(short_description,'')   AS short_description,
    NULLIF(demand,'')              AS demand,
    NULLIF(demand_source,'')       AS demand_source,
    NULLIF(competition_level,'')   AS competition_level,
    NULLIF(competition_note,'')    AS competition_note,
    public._num(salary_entry)      AS salary_entry,
    public._num(salary_experienced) AS salary_experienced,
    public._num(salary_senior)     AS salary_senior,
    NULLIF(salary_source,'')       AS salary_source,
    CASE WHEN ai_impact_level='Medium' THEN 'Moderate' ELSE NULLIF(ai_impact_level,'') END AS ai_impact_level,
    NULLIF(ai_impact_note,'')      AS ai_impact_note,
    NULLIF(reality_check,'')       AS reality_check,
    NULLIF(most_common_route,'')   AS most_common_route,
    NULLIF(pathway_school_leaver,'') AS pathway_school_leaver,
    NULLIF(pathway_graduate,'')    AS pathway_graduate,
    NULLIF(pathway_adjacent,'')    AS pathway_adjacent,
    NULLIF(pathway_no_background,'') AS pathway_no_background,
    NULLIF(opportunity_cost,'')    AS opportunity_cost,
    NULLIF(typical_time_to_entry,'') AS typical_time_to_entry,
    NULLIF(typical_backgrounds,'') AS typical_backgrounds,
    NULLIF(who_not_for,'')         AS who_not_for,
    NULLIF(career_regret_risk,'')  AS career_regret_risk,
    NULLIF(alternative_careers,'') AS alternative_careers,
    CASE WHEN NULLIF(key_employers,'') IS NULL THEN NULL
         ELSE string_to_array(key_employers, ',') END AS key_employers,
    NULLIF(next_step,'')           AS next_step,
    NULLIF(next_step_url,'')       AS next_step_url,
    NULLIF(uncomfortable_truth,'') AS uncomfortable_truth,
    NULLIF(confidence_level,'')    AS confidence_level,
    NULLIF(review_status,'')       AS review_status,
    NULLIF(legacy_best_path,'')    AS best_path,
    NULLIF(legacy_2nd_path,'')     AS second_path,
    NULLIF(legacy_3rd_path,'')     AS third_path,
    NULLIF(pathway_source_text,'') AS pathway_source_text,
    NULLIF(legacy_remote_friendly,'') AS remote_friendly,
    NULLIF(legacy_job_security,'') AS job_security,
    NULLIF(legacy_progression_speed,'') AS progression_speed,
    NULLIF(legacy_ai_safety_2040,'') AS ai_safety_2040,
    NULLIF(legacy_top_universities,'') AS top_universities,
    NULLIF(legacy_degree_required,'') AS degree_required
  FROM public.stg_roles_full
  WHERE role_slug IS NOT NULL AND role_slug <> ''
  ORDER BY role_slug, ctid DESC
)
INSERT INTO public.roles (
  role_name, role_slug, reality_rating, short_description, demand, demand_source,
  competition_level, competition_note, salary_entry, salary_experienced, salary_senior,
  salary_source, ai_impact_level, ai_impact_note, reality_check, most_common_route,
  pathway_school_leaver, pathway_graduate, pathway_adjacent, pathway_no_background,
  opportunity_cost, typical_time_to_entry, typical_backgrounds, who_not_for,
  career_regret_risk, alternative_careers, key_employers, next_step, next_step_url,
  uncomfortable_truth, confidence_level, review_status, best_path, second_path, third_path,
  pathway_source_text, remote_friendly, job_security, progression_speed, ai_safety_2040,
  top_universities, degree_required
)
SELECT
  coalesce(role_name, role_slug), role_slug, reality_rating, short_description, demand, demand_source,
  competition_level, competition_note, salary_entry, salary_experienced, salary_senior,
  salary_source, ai_impact_level, ai_impact_note, reality_check, most_common_route,
  pathway_school_leaver, pathway_graduate, pathway_adjacent, pathway_no_background,
  opportunity_cost, typical_time_to_entry, typical_backgrounds, who_not_for,
  career_regret_risk, alternative_careers, key_employers, next_step, next_step_url,
  uncomfortable_truth, confidence_level, review_status, best_path, second_path, third_path,
  pathway_source_text, remote_friendly, job_security, progression_speed, ai_safety_2040,
  top_universities, degree_required
FROM src
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

-- 2) Overlay Gold Roles Review (match by slug derived from name)
WITH src AS (
  SELECT DISTINCT ON (slug)
    public._slugify(role_name) AS slug,
    NULLIF(role_name,'')           AS role_name,
    NULLIF(reality_rating,'')      AS reality_rating,
    NULLIF(short_description,'')   AS short_description,
    NULLIF(demand,'')              AS demand,
    NULLIF(competition_level,'')   AS competition_level,
    public._num(salary_entry)      AS salary_entry,
    public._num(salary_experienced) AS salary_experienced,
    public._num(salary_senior)     AS salary_senior,
    NULLIF(salary_source,'')       AS salary_source,
    NULLIF(most_common_route,'')   AS most_common_route,
    NULLIF(uncomfortable_truth,'') AS uncomfortable_truth,
    CASE WHEN ai_impact_level='Medium' THEN 'Moderate' ELSE NULLIF(ai_impact_level,'') END AS ai_impact_level,
    NULLIF(ai_impact_note,'')      AS ai_impact_note,
    CASE WHEN NULLIF(key_employers,'') IS NULL THEN NULL ELSE string_to_array(key_employers, ',') END AS key_employers,
    NULLIF(next_step,'')           AS next_step,
    NULLIF(next_step_url,'')       AS next_step_url
  FROM public.stg_gold
  WHERE NULLIF(role_name,'') IS NOT NULL
  ORDER BY slug, ctid DESC
)
INSERT INTO public.roles (
  role_name, role_slug, reality_rating, short_description, demand, competition_level,
  salary_entry, salary_experienced, salary_senior, salary_source, most_common_route,
  uncomfortable_truth, ai_impact_level, ai_impact_note, key_employers, next_step, next_step_url
)
SELECT role_name, slug, reality_rating, short_description, demand, competition_level,
  salary_entry, salary_experienced, salary_senior, salary_source, most_common_route,
  uncomfortable_truth, ai_impact_level, ai_impact_note, key_employers, next_step, next_step_url
FROM src
WHERE slug <> ''
ON CONFLICT (role_slug) DO UPDATE SET
  role_name = COALESCE(EXCLUDED.role_name, roles.role_name),
  reality_rating = COALESCE(EXCLUDED.reality_rating, roles.reality_rating),
  short_description = COALESCE(EXCLUDED.short_description, roles.short_description),
  demand = COALESCE(EXCLUDED.demand, roles.demand),
  competition_level = COALESCE(EXCLUDED.competition_level, roles.competition_level),
  salary_entry = COALESCE(EXCLUDED.salary_entry, roles.salary_entry),
  salary_experienced = COALESCE(EXCLUDED.salary_experienced, roles.salary_experienced),
  salary_senior = COALESCE(EXCLUDED.salary_senior, roles.salary_senior),
  salary_source = COALESCE(EXCLUDED.salary_source, roles.salary_source),
  most_common_route = COALESCE(EXCLUDED.most_common_route, roles.most_common_route),
  uncomfortable_truth = COALESCE(EXCLUDED.uncomfortable_truth, roles.uncomfortable_truth),
  ai_impact_level = COALESCE(EXCLUDED.ai_impact_level, roles.ai_impact_level),
  ai_impact_note = COALESCE(EXCLUDED.ai_impact_note, roles.ai_impact_note),
  key_employers = COALESCE(EXCLUDED.key_employers, roles.key_employers),
  next_step = COALESCE(EXCLUDED.next_step, roles.next_step),
  next_step_url = COALESCE(EXCLUDED.next_step_url, roles.next_step_url),
  updated_at = now();

-- 3) Providers: upsert by case-insensitive name
WITH src AS (
  SELECT
    NULLIF(trim(bootcamp_name),'') AS name,
    NULLIF(provider,'')         AS provider_org,
    CASE WHEN NULLIF(roles_covered,'') IS NULL THEN NULL ELSE string_to_array(roles_covered, ',') END AS roles_covered,
    NULLIF(location,'')         AS location,
    NULLIF(format,'')           AS format,
    NULLIF(duration,'')         AS duration,
    public._num(cost_gbp)       AS cost_gbp,
    NULLIF(funded,'')           AS funded,
    NULLIF(funding_type,'')     AS funding_type,
    CASE WHEN lower(coalesce(skills_bootcamp,'')) IN ('yes','y','true','1') THEN true
         WHEN lower(coalesce(skills_bootcamp,'')) IN ('no','n','false','0') THEN false
         ELSE NULL END          AS is_skills_bootcamp,
    NULLIF(next_start_date,'')  AS next_start_date,
    NULLIF(apply_url,'')        AS apply_url,
    NULLIF(employment_rate,'')  AS employment_rate,
    NULLIF(avg_graduate_salary,'') AS avg_graduate_salary,
    NULLIF(employer_acceptance,'') AS employer_acceptance,
    NULLIF(notes,'')            AS honest_notes,
    NULLIF(prerequisites,'')    AS prerequisites,
    NULLIF(job_placement_support,'') AS job_placement_support,
    NULLIF(tier,'')             AS tier
  FROM public.stg_providers
  WHERE NULLIF(trim(bootcamp_name),'') IS NOT NULL
    AND lower(bootcamp_name) NOT LIKE '%example%'
    AND bootcamp_name NOT LIKE '%(Example)%'
)
, upd AS (
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
    apply_url = COALESCE(s.apply_url, p.apply_url),
    employment_rate = COALESCE(s.employment_rate, p.employment_rate),
    avg_graduate_salary = COALESCE(s.avg_graduate_salary, p.avg_graduate_salary),
    employer_acceptance = COALESCE(s.employer_acceptance, p.employer_acceptance),
    honest_notes = COALESCE(s.honest_notes, p.honest_notes),
    prerequisites = COALESCE(s.prerequisites, p.prerequisites),
    job_placement_support = COALESCE(s.job_placement_support, p.job_placement_support),
    tier = COALESCE(s.tier, p.tier),
    updated_at = now()
  FROM src s
  WHERE lower(p.name) = lower(s.name)
  RETURNING s.name
)
INSERT INTO public.providers (name, provider_org, roles_covered, location, format, duration,
  cost_gbp, funded, funding_type, is_skills_bootcamp, apply_url, employment_rate,
  avg_graduate_salary, employer_acceptance, honest_notes, prerequisites, job_placement_support, tier)
SELECT name, provider_org, roles_covered, location, format, duration,
  cost_gbp, funded, funding_type, is_skills_bootcamp, apply_url, employment_rate,
  avg_graduate_salary, employer_acceptance, honest_notes, prerequisites, job_placement_support, tier
FROM src
WHERE name NOT IN (SELECT name FROM upd)
  AND lower(name) NOT IN (SELECT lower(name) FROM public.providers);

-- 4) Apprenticeships
WITH src AS (
  SELECT
    NULLIF(trim(standard_name),'') AS standard_name,
    NULLIF(training_provider,'') AS training_provider,
    NULLIF(employer,'')          AS employer,
    CASE WHEN NULLIF(roles_covered,'') IS NULL THEN NULL ELSE string_to_array(roles_covered, ',') END AS roles_covered,
    public._num(level)           AS level,
    NULLIF(equivalent_to,'')     AS equivalent_to,
    NULLIF(duration,'')          AS duration,
    NULLIF(typical_salary,'')    AS typical_salary,
    NULLIF(location,'')          AS location,
    NULLIF(format,'')            AS format,
    CASE WHEN lower(coalesce(fully_funded,'')) IN ('yes','y','true','1') THEN true
         WHEN lower(coalesce(fully_funded,'')) IN ('no','n','false','0') THEN false
         ELSE NULL END           AS fully_funded,
    NULLIF(apply_url,'')         AS apply_url,
    NULLIF(completion_rate,'')   AS completion_rate,
    NULLIF(key_employers,'')     AS key_employers,
    NULLIF(notes,'')             AS honest_notes
  FROM public.stg_apprenticeships
  WHERE NULLIF(trim(standard_name),'') IS NOT NULL
    AND lower(standard_name) NOT LIKE '%example%'
)
, upd AS (
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
  FROM src s WHERE lower(a.standard_name) = lower(s.standard_name)
  RETURNING s.standard_name
)
INSERT INTO public.apprenticeships (standard_name, training_provider, employer, roles_covered,
  level, equivalent_to, duration, typical_salary, location, format, fully_funded, apply_url,
  completion_rate, key_employers, honest_notes)
SELECT standard_name, training_provider, employer, roles_covered, level, equivalent_to,
  duration, typical_salary, location, format, fully_funded, apply_url, completion_rate,
  key_employers, honest_notes
FROM src
WHERE lower(standard_name) NOT IN (SELECT lower(standard_name) FROM public.apprenticeships);

-- 5) Provider pathways
INSERT INTO public.provider_pathways (provider_id, role_id, pathway_type, priority)
SELECT p.id, r.id,
       NULLIF(sp.pathway_type,''),
       public._num(sp.priority)
FROM public.stg_pathways sp
JOIN public.providers p ON lower(p.name) = lower(trim(sp.provider_name))
JOIN public.roles r     ON r.role_slug = trim(sp.role_slug)
WHERE NULLIF(sp.provider_name,'') IS NOT NULL AND NULLIF(sp.role_slug,'') IS NOT NULL
ON CONFLICT DO NOTHING;

-- 6) Drop staging tables
DROP TABLE public.stg_gold;
DROP TABLE public.stg_roles_full;
DROP TABLE public.stg_providers;
DROP TABLE public.stg_pathways;
DROP TABLE public.stg_apprenticeships;
DROP FUNCTION public._slugify(text);
DROP FUNCTION public._num(text);
ALTER TABLE public.roles
  ADD COLUMN IF NOT EXISTS previous_slugs text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS merged_into uuid REFERENCES public.roles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS roles_previous_slugs_gin_idx
  ON public.roles USING gin (previous_slugs);

CREATE INDEX IF NOT EXISTS roles_merged_into_idx
  ON public.roles (merged_into);CREATE OR REPLACE FUNCTION public._merge_roles(survivor uuid, losers uuid[], final_name text, final_slug text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cluster uuid[] := survivor || losers;
BEGIN
  -- Free the desired final slug from any loser
  UPDATE public.roles SET role_slug = '_pre_' || id::text
    WHERE id = ANY(losers) AND role_slug = final_slug;

  -- Per-field "longest non-null wins" for text columns; survivor priority for numeric/date
  UPDATE public.roles s SET
    short_description     = (SELECT short_description     FROM public.roles WHERE id = ANY(cluster) AND short_description     IS NOT NULL ORDER BY length(short_description)     DESC LIMIT 1),
    pathway_school_leaver = (SELECT pathway_school_leaver FROM public.roles WHERE id = ANY(cluster) AND pathway_school_leaver IS NOT NULL ORDER BY length(pathway_school_leaver) DESC LIMIT 1),
    pathway_graduate      = (SELECT pathway_graduate      FROM public.roles WHERE id = ANY(cluster) AND pathway_graduate      IS NOT NULL ORDER BY length(pathway_graduate)      DESC LIMIT 1),
    pathway_adjacent      = (SELECT pathway_adjacent      FROM public.roles WHERE id = ANY(cluster) AND pathway_adjacent      IS NOT NULL ORDER BY length(pathway_adjacent)      DESC LIMIT 1),
    pathway_no_background = (SELECT pathway_no_background FROM public.roles WHERE id = ANY(cluster) AND pathway_no_background IS NOT NULL ORDER BY length(pathway_no_background) DESC LIMIT 1),
    raw_why_text          = (SELECT raw_why_text          FROM public.roles WHERE id = ANY(cluster) AND raw_why_text          IS NOT NULL ORDER BY length(raw_why_text)          DESC LIMIT 1),
    reality_check         = (SELECT reality_check         FROM public.roles WHERE id = ANY(cluster) AND reality_check         IS NOT NULL ORDER BY length(reality_check)         DESC LIMIT 1),
    uncomfortable_truth   = (SELECT uncomfortable_truth   FROM public.roles WHERE id = ANY(cluster) AND uncomfortable_truth   IS NOT NULL ORDER BY length(uncomfortable_truth)   DESC LIMIT 1),
    opportunity_cost      = (SELECT opportunity_cost      FROM public.roles WHERE id = ANY(cluster) AND opportunity_cost      IS NOT NULL ORDER BY length(opportunity_cost)      DESC LIMIT 1),
    typical_backgrounds   = (SELECT typical_backgrounds   FROM public.roles WHERE id = ANY(cluster) AND typical_backgrounds   IS NOT NULL ORDER BY length(typical_backgrounds)   DESC LIMIT 1),
    who_not_for           = (SELECT who_not_for           FROM public.roles WHERE id = ANY(cluster) AND who_not_for           IS NOT NULL ORDER BY length(who_not_for)           DESC LIMIT 1),
    career_regret_risk    = (SELECT career_regret_risk    FROM public.roles WHERE id = ANY(cluster) AND career_regret_risk    IS NOT NULL ORDER BY length(career_regret_risk)    DESC LIMIT 1),
    alternative_careers   = (SELECT alternative_careers   FROM public.roles WHERE id = ANY(cluster) AND alternative_careers   IS NOT NULL ORDER BY length(alternative_careers)   DESC LIMIT 1),
    next_step             = (SELECT next_step             FROM public.roles WHERE id = ANY(cluster) AND next_step             IS NOT NULL ORDER BY length(next_step)             DESC LIMIT 1),
    next_step_url         = (SELECT next_step_url         FROM public.roles WHERE id = ANY(cluster) AND next_step_url         IS NOT NULL ORDER BY length(next_step_url)         DESC LIMIT 1),
    salary_source         = (SELECT salary_source         FROM public.roles WHERE id = ANY(cluster) AND salary_source         IS NOT NULL ORDER BY length(salary_source)         DESC LIMIT 1),
    demand                = (SELECT demand                FROM public.roles WHERE id = ANY(cluster) AND demand                IS NOT NULL ORDER BY length(demand)                DESC LIMIT 1),
    demand_source         = (SELECT demand_source         FROM public.roles WHERE id = ANY(cluster) AND demand_source         IS NOT NULL ORDER BY length(demand_source)         DESC LIMIT 1),
    competition_level     = (SELECT competition_level     FROM public.roles WHERE id = ANY(cluster) AND competition_level     IS NOT NULL ORDER BY length(competition_level)     DESC LIMIT 1),
    typical_time_to_entry = (SELECT typical_time_to_entry FROM public.roles WHERE id = ANY(cluster) AND typical_time_to_entry IS NOT NULL ORDER BY length(typical_time_to_entry) DESC LIMIT 1),
    ai_impact_level       = (SELECT ai_impact_level       FROM public.roles WHERE id = ANY(cluster) AND ai_impact_level       IS NOT NULL ORDER BY length(ai_impact_level)       DESC LIMIT 1),
    ai_impact_note        = (SELECT ai_impact_note        FROM public.roles WHERE id = ANY(cluster) AND ai_impact_note        IS NOT NULL ORDER BY length(ai_impact_note)        DESC LIMIT 1),
    remote_friendly       = (SELECT remote_friendly       FROM public.roles WHERE id = ANY(cluster) AND remote_friendly       IS NOT NULL ORDER BY length(remote_friendly)       DESC LIMIT 1),
    job_security          = (SELECT job_security          FROM public.roles WHERE id = ANY(cluster) AND job_security          IS NOT NULL ORDER BY length(job_security)          DESC LIMIT 1),
    progression_speed     = (SELECT progression_speed     FROM public.roles WHERE id = ANY(cluster) AND progression_speed     IS NOT NULL ORDER BY length(progression_speed)     DESC LIMIT 1),
    ai_safety_2040        = (SELECT ai_safety_2040        FROM public.roles WHERE id = ANY(cluster) AND ai_safety_2040        IS NOT NULL ORDER BY length(ai_safety_2040)        DESC LIMIT 1),
    top_universities      = (SELECT top_universities      FROM public.roles WHERE id = ANY(cluster) AND top_universities      IS NOT NULL ORDER BY length(top_universities)      DESC LIMIT 1),
    degree_required       = (SELECT degree_required       FROM public.roles WHERE id = ANY(cluster) AND degree_required       IS NOT NULL ORDER BY length(degree_required)       DESC LIMIT 1),
    best_path             = (SELECT best_path             FROM public.roles WHERE id = ANY(cluster) AND best_path             IS NOT NULL ORDER BY length(best_path)             DESC LIMIT 1),
    second_path           = (SELECT second_path           FROM public.roles WHERE id = ANY(cluster) AND second_path           IS NOT NULL ORDER BY length(second_path)           DESC LIMIT 1),
    third_path            = (SELECT third_path            FROM public.roles WHERE id = ANY(cluster) AND third_path            IS NOT NULL ORDER BY length(third_path)            DESC LIMIT 1),
    confidence_level      = (SELECT confidence_level      FROM public.roles WHERE id = ANY(cluster) AND confidence_level      IS NOT NULL ORDER BY length(confidence_level)      DESC LIMIT 1),
    review_owner          = (SELECT review_owner          FROM public.roles WHERE id = ANY(cluster) AND review_owner          IS NOT NULL ORDER BY length(review_owner)          DESC LIMIT 1),
    reality_rating        = (SELECT reality_rating        FROM public.roles WHERE id = ANY(cluster) AND reality_rating        IS NOT NULL ORDER BY length(reality_rating)        DESC LIMIT 1),
    competition_note      = (SELECT competition_note      FROM public.roles WHERE id = ANY(cluster) AND competition_note      IS NOT NULL ORDER BY length(competition_note)      DESC LIMIT 1),
    most_common_route     = (SELECT most_common_route     FROM public.roles WHERE id = ANY(cluster) AND most_common_route     IS NOT NULL ORDER BY length(most_common_route)     DESC LIMIT 1),
    pathway_source_text   = (SELECT pathway_source_text   FROM public.roles WHERE id = ANY(cluster) AND pathway_source_text   IS NOT NULL ORDER BY length(pathway_source_text)   DESC LIMIT 1),
    salary_entry       = COALESCE(s.salary_entry,       (SELECT salary_entry       FROM public.roles WHERE id = ANY(cluster) AND salary_entry       IS NOT NULL LIMIT 1)),
    salary_experienced = COALESCE(s.salary_experienced, (SELECT salary_experienced FROM public.roles WHERE id = ANY(cluster) AND salary_experienced IS NOT NULL LIMIT 1)),
    salary_senior      = COALESCE(s.salary_senior,      (SELECT salary_senior      FROM public.roles WHERE id = ANY(cluster) AND salary_senior      IS NOT NULL LIMIT 1)),
    last_reviewed      = COALESCE(s.last_reviewed,      (SELECT last_reviewed      FROM public.roles WHERE id = ANY(cluster) AND last_reviewed      IS NOT NULL LIMIT 1)),
    next_review        = COALESCE(s.next_review,        (SELECT next_review        FROM public.roles WHERE id = ANY(cluster) AND next_review        IS NOT NULL LIMIT 1)),
    key_employers      = (SELECT key_employers FROM public.roles WHERE id = ANY(cluster) AND key_employers IS NOT NULL ORDER BY COALESCE(array_length(key_employers,1),0) DESC LIMIT 1),
    role_name = final_name,
    role_slug = final_slug,
    previous_slugs = (
      SELECT ARRAY(SELECT DISTINCT x FROM (
        SELECT unnest(previous_slugs || ARRAY[role_slug]) AS x FROM public.roles WHERE id = ANY(losers)
        UNION ALL
        SELECT unnest(previous_slugs) FROM public.roles WHERE id = survivor
      ) t WHERE x IS NOT NULL AND x <> final_slug)
    ),
    review_status = 'Gold standard'
  WHERE s.id = survivor;

  -- Reassign FKs, dedup, then drop loser links
  UPDATE public.provider_pathways pp SET role_id = survivor
    WHERE pp.role_id = ANY(losers)
      AND NOT EXISTS (SELECT 1 FROM public.provider_pathways x WHERE x.role_id = survivor AND x.provider_id = pp.provider_id);
  DELETE FROM public.provider_pathways WHERE role_id = ANY(losers);

  UPDATE public.alternative_careers ac SET from_role_id = survivor
    WHERE ac.from_role_id = ANY(losers)
      AND NOT EXISTS (SELECT 1 FROM public.alternative_careers x WHERE x.from_role_id = survivor AND x.to_role_id = ac.to_role_id);
  DELETE FROM public.alternative_careers WHERE from_role_id = ANY(losers);

  UPDATE public.alternative_careers ac SET to_role_id = survivor
    WHERE ac.to_role_id = ANY(losers)
      AND NOT EXISTS (SELECT 1 FROM public.alternative_careers x WHERE x.to_role_id = survivor AND x.from_role_id = ac.from_role_id);
  DELETE FROM public.alternative_careers WHERE to_role_id = ANY(losers);

  -- Soft-delete losers
  UPDATE public.roles
    SET review_status = 'merged',
        merged_into = survivor,
        role_slug = '_merged_' || id::text
    WHERE id = ANY(losers);
END;
$$;

REVOKE ALL ON FUNCTION public._merge_roles(uuid, uuid[], text, text) FROM PUBLIC;