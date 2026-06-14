
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
