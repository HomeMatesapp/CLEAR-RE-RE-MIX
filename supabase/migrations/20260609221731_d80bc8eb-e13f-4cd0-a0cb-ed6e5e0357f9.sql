WITH dedup AS (
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

DROP TABLE public.roles_staging;