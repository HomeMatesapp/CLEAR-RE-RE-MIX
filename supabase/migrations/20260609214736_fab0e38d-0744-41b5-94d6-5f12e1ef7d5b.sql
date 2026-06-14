CREATE TABLE public.roles_staging (
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
CREATE POLICY "service only" ON public.roles_staging FOR ALL USING (false) WITH CHECK (false);