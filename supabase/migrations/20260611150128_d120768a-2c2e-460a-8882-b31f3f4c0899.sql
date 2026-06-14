
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
