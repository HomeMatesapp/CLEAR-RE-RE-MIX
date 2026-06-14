DROP TABLE IF EXISTS public.roles_staging;
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
ALTER TABLE public.roles_staging ENABLE ROW LEVEL SECURITY;