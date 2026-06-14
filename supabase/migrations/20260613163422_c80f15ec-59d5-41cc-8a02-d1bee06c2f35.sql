
-- Helper: mirrors scripts/audit-families.ts classifyShape() template_leak detector,
-- plus the fam-31 forbidden-pattern set. Returns true when a field value carries
-- a known contamination signature and should lose to any clean alternative
-- during a merge. Conservative: only flags high-confidence contamination, so it
-- never demotes a value unless the audit would also flag it.
CREATE OR REPLACE FUNCTION public._is_contaminated_field(v text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN v IS NULL THEN false
    -- Culture-cluster template_leak: "sector data 20XX" attribution carrying
    -- 3+ of the four culture-cluster tokens (CILIP / ARA / NRCPD / RBSLI).
    -- ARA is matched as a whole word to avoid false-positives on "career" etc.
    WHEN v ~* 'sector data 20[0-9]{2}'
         AND (
           (CASE WHEN v LIKE '%CILIP%'                              THEN 1 ELSE 0 END) +
           (CASE WHEN v ~  '(^|[^A-Za-z0-9_])ARA([^A-Za-z0-9_]|$)'  THEN 1 ELSE 0 END) +
           (CASE WHEN v LIKE '%NRCPD%'                              THEN 1 ELSE 0 END) +
           (CASE WHEN v LIKE '%RBSLI%'                              THEN 1 ELSE 0 END)
         ) >= 3 THEN true
    -- Fam-31 sales-family residue (the leak that created fam-31 in the first place).
    WHEN v ILIKE '%commission or account ownership%' THEN true
    WHEN v ILIKE '%field sales, account management%' THEN true
    WHEN v ILIKE '%target-and-commission worlds%'    THEN true
    WHEN v ILIKE '%target-driven cultures%'          THEN true
    ELSE false
  END;
$$;

-- Rewrite _merge_roles: every per-field "pick a survivor" subquery now orders
-- by contamination first (clean wins), length second (tiebreaker, preserves
-- prior longest-wins behaviour when neither candidate is contaminated).
CREATE OR REPLACE FUNCTION public._merge_roles(survivor uuid, losers uuid[], final_name text, final_slug text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  cluster uuid[] := survivor || losers;
BEGIN
  UPDATE public.roles SET role_slug = '_pre_' || id::text
    WHERE id = ANY(losers) AND role_slug = final_slug;

  UPDATE public.roles s SET
    short_description     = (SELECT short_description     FROM public.roles WHERE id = ANY(cluster) AND short_description     IS NOT NULL ORDER BY public._is_contaminated_field(short_description)     ASC, length(short_description)     DESC LIMIT 1),
    pathway_school_leaver = (SELECT pathway_school_leaver FROM public.roles WHERE id = ANY(cluster) AND pathway_school_leaver IS NOT NULL ORDER BY public._is_contaminated_field(pathway_school_leaver) ASC, length(pathway_school_leaver) DESC LIMIT 1),
    pathway_graduate      = (SELECT pathway_graduate      FROM public.roles WHERE id = ANY(cluster) AND pathway_graduate      IS NOT NULL ORDER BY public._is_contaminated_field(pathway_graduate)      ASC, length(pathway_graduate)      DESC LIMIT 1),
    pathway_adjacent      = (SELECT pathway_adjacent      FROM public.roles WHERE id = ANY(cluster) AND pathway_adjacent      IS NOT NULL ORDER BY public._is_contaminated_field(pathway_adjacent)      ASC, length(pathway_adjacent)      DESC LIMIT 1),
    pathway_no_background = (SELECT pathway_no_background FROM public.roles WHERE id = ANY(cluster) AND pathway_no_background IS NOT NULL ORDER BY public._is_contaminated_field(pathway_no_background) ASC, length(pathway_no_background) DESC LIMIT 1),
    raw_why_text          = (SELECT raw_why_text          FROM public.roles WHERE id = ANY(cluster) AND raw_why_text          IS NOT NULL ORDER BY public._is_contaminated_field(raw_why_text)          ASC, length(raw_why_text)          DESC LIMIT 1),
    reality_check         = (SELECT reality_check         FROM public.roles WHERE id = ANY(cluster) AND reality_check         IS NOT NULL ORDER BY public._is_contaminated_field(reality_check)         ASC, length(reality_check)         DESC LIMIT 1),
    uncomfortable_truth   = (SELECT uncomfortable_truth   FROM public.roles WHERE id = ANY(cluster) AND uncomfortable_truth   IS NOT NULL ORDER BY public._is_contaminated_field(uncomfortable_truth)   ASC, length(uncomfortable_truth)   DESC LIMIT 1),
    opportunity_cost      = (SELECT opportunity_cost      FROM public.roles WHERE id = ANY(cluster) AND opportunity_cost      IS NOT NULL ORDER BY public._is_contaminated_field(opportunity_cost)      ASC, length(opportunity_cost)      DESC LIMIT 1),
    typical_backgrounds   = (SELECT typical_backgrounds   FROM public.roles WHERE id = ANY(cluster) AND typical_backgrounds   IS NOT NULL ORDER BY public._is_contaminated_field(typical_backgrounds)   ASC, length(typical_backgrounds)   DESC LIMIT 1),
    who_not_for           = (SELECT who_not_for           FROM public.roles WHERE id = ANY(cluster) AND who_not_for           IS NOT NULL ORDER BY public._is_contaminated_field(who_not_for)           ASC, length(who_not_for)           DESC LIMIT 1),
    career_regret_risk    = (SELECT career_regret_risk    FROM public.roles WHERE id = ANY(cluster) AND career_regret_risk    IS NOT NULL ORDER BY public._is_contaminated_field(career_regret_risk)    ASC, length(career_regret_risk)    DESC LIMIT 1),
    alternative_careers   = (SELECT alternative_careers   FROM public.roles WHERE id = ANY(cluster) AND alternative_careers   IS NOT NULL ORDER BY public._is_contaminated_field(alternative_careers)   ASC, length(alternative_careers)   DESC LIMIT 1),
    next_step             = (SELECT next_step             FROM public.roles WHERE id = ANY(cluster) AND next_step             IS NOT NULL ORDER BY public._is_contaminated_field(next_step)             ASC, length(next_step)             DESC LIMIT 1),
    next_step_url         = (SELECT next_step_url         FROM public.roles WHERE id = ANY(cluster) AND next_step_url         IS NOT NULL ORDER BY public._is_contaminated_field(next_step_url)         ASC, length(next_step_url)         DESC LIMIT 1),
    salary_source         = (SELECT salary_source         FROM public.roles WHERE id = ANY(cluster) AND salary_source         IS NOT NULL ORDER BY public._is_contaminated_field(salary_source)         ASC, length(salary_source)         DESC LIMIT 1),
    demand                = (SELECT demand                FROM public.roles WHERE id = ANY(cluster) AND demand                IS NOT NULL ORDER BY public._is_contaminated_field(demand)                ASC, length(demand)                DESC LIMIT 1),
    demand_source         = (SELECT demand_source         FROM public.roles WHERE id = ANY(cluster) AND demand_source         IS NOT NULL ORDER BY public._is_contaminated_field(demand_source)         ASC, length(demand_source)         DESC LIMIT 1),
    competition_level     = (SELECT competition_level     FROM public.roles WHERE id = ANY(cluster) AND competition_level     IS NOT NULL ORDER BY public._is_contaminated_field(competition_level)     ASC, length(competition_level)     DESC LIMIT 1),
    typical_time_to_entry = (SELECT typical_time_to_entry FROM public.roles WHERE id = ANY(cluster) AND typical_time_to_entry IS NOT NULL ORDER BY public._is_contaminated_field(typical_time_to_entry) ASC, length(typical_time_to_entry) DESC LIMIT 1),
    ai_impact_level       = (SELECT ai_impact_level       FROM public.roles WHERE id = ANY(cluster) AND ai_impact_level       IS NOT NULL ORDER BY public._is_contaminated_field(ai_impact_level)       ASC, length(ai_impact_level)       DESC LIMIT 1),
    ai_impact_note        = (SELECT ai_impact_note        FROM public.roles WHERE id = ANY(cluster) AND ai_impact_note        IS NOT NULL ORDER BY public._is_contaminated_field(ai_impact_note)        ASC, length(ai_impact_note)        DESC LIMIT 1),
    remote_friendly       = (SELECT remote_friendly       FROM public.roles WHERE id = ANY(cluster) AND remote_friendly       IS NOT NULL ORDER BY public._is_contaminated_field(remote_friendly)       ASC, length(remote_friendly)       DESC LIMIT 1),
    job_security          = (SELECT job_security          FROM public.roles WHERE id = ANY(cluster) AND job_security          IS NOT NULL ORDER BY public._is_contaminated_field(job_security)          ASC, length(job_security)          DESC LIMIT 1),
    progression_speed     = (SELECT progression_speed     FROM public.roles WHERE id = ANY(cluster) AND progression_speed     IS NOT NULL ORDER BY public._is_contaminated_field(progression_speed)     ASC, length(progression_speed)     DESC LIMIT 1),
    ai_safety_2040        = (SELECT ai_safety_2040        FROM public.roles WHERE id = ANY(cluster) AND ai_safety_2040        IS NOT NULL ORDER BY public._is_contaminated_field(ai_safety_2040)        ASC, length(ai_safety_2040)        DESC LIMIT 1),
    top_universities      = (SELECT top_universities      FROM public.roles WHERE id = ANY(cluster) AND top_universities      IS NOT NULL ORDER BY public._is_contaminated_field(top_universities)      ASC, length(top_universities)      DESC LIMIT 1),
    degree_required       = (SELECT degree_required       FROM public.roles WHERE id = ANY(cluster) AND degree_required       IS NOT NULL ORDER BY public._is_contaminated_field(degree_required)       ASC, length(degree_required)       DESC LIMIT 1),
    best_path             = (SELECT best_path             FROM public.roles WHERE id = ANY(cluster) AND best_path             IS NOT NULL ORDER BY public._is_contaminated_field(best_path)             ASC, length(best_path)             DESC LIMIT 1),
    second_path           = (SELECT second_path           FROM public.roles WHERE id = ANY(cluster) AND second_path           IS NOT NULL ORDER BY public._is_contaminated_field(second_path)           ASC, length(second_path)           DESC LIMIT 1),
    third_path            = (SELECT third_path            FROM public.roles WHERE id = ANY(cluster) AND third_path            IS NOT NULL ORDER BY public._is_contaminated_field(third_path)            ASC, length(third_path)            DESC LIMIT 1),
    confidence_level      = (SELECT confidence_level      FROM public.roles WHERE id = ANY(cluster) AND confidence_level      IS NOT NULL ORDER BY public._is_contaminated_field(confidence_level)      ASC, length(confidence_level)      DESC LIMIT 1),
    review_owner          = (SELECT review_owner          FROM public.roles WHERE id = ANY(cluster) AND review_owner          IS NOT NULL ORDER BY public._is_contaminated_field(review_owner)          ASC, length(review_owner)          DESC LIMIT 1),
    reality_rating        = (SELECT reality_rating        FROM public.roles WHERE id = ANY(cluster) AND reality_rating        IS NOT NULL ORDER BY public._is_contaminated_field(reality_rating)        ASC, length(reality_rating)        DESC LIMIT 1),
    competition_note      = (SELECT competition_note      FROM public.roles WHERE id = ANY(cluster) AND competition_note      IS NOT NULL ORDER BY public._is_contaminated_field(competition_note)      ASC, length(competition_note)      DESC LIMIT 1),
    most_common_route     = (SELECT most_common_route     FROM public.roles WHERE id = ANY(cluster) AND most_common_route     IS NOT NULL ORDER BY public._is_contaminated_field(most_common_route)     ASC, length(most_common_route)     DESC LIMIT 1),
    pathway_source_text   = (SELECT pathway_source_text   FROM public.roles WHERE id = ANY(cluster) AND pathway_source_text   IS NOT NULL ORDER BY public._is_contaminated_field(pathway_source_text)   ASC, length(pathway_source_text)   DESC LIMIT 1),
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
    )
    -- NOTE: review_status intentionally NOT modified — preserve survivor's existing status
  WHERE s.id = survivor;

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

  UPDATE public.roles
    SET review_status = 'merged',
        merged_into = survivor,
        role_slug = '_merged_' || id::text
    WHERE id = ANY(losers);
END;
$function$;
