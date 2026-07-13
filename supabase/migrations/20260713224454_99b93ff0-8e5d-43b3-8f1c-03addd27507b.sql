REVOKE ALL ON FUNCTION public._merge_roles(uuid, uuid[], text, text) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public._merge_roles(uuid, uuid[], text, text) TO service_role;
DO $$
DECLARE
  pair RECORD;
  stale_slug text;
BEGIN
  FOR pair IN
    SELECT s.id AS loser_id, s.role_slug AS loser_slug, r.id AS survivor_id
    FROM public.roles s
    JOIN public.roles r
      ON r.role_slug = regexp_replace(regexp_replace(s.role_slug, '^_merged_', ''), '-DUPLICATE-DO-NOT-IMPORT$', '')
    WHERE s.review_status IN ('Merged duplicate','Merged duplicate — do not import')
  LOOP
    stale_slug := pair.loser_slug;
    UPDATE public.roles
       SET previous_slugs = (
         SELECT ARRAY(SELECT DISTINCT x FROM unnest(COALESCE(previous_slugs, ARRAY[]::text[]) || ARRAY[stale_slug]) x
                      WHERE x IS NOT NULL AND x <> role_slug)
       )
     WHERE id = pair.survivor_id;
    UPDATE public.provider_pathways pp SET role_id = pair.survivor_id
      WHERE pp.role_id = pair.loser_id
        AND NOT EXISTS (SELECT 1 FROM public.provider_pathways x
                        WHERE x.role_id = pair.survivor_id AND x.provider_id = pp.provider_id);
    DELETE FROM public.provider_pathways WHERE role_id = pair.loser_id;
    UPDATE public.alternative_careers ac SET from_role_id = pair.survivor_id
      WHERE ac.from_role_id = pair.loser_id
        AND NOT EXISTS (SELECT 1 FROM public.alternative_careers x
                        WHERE x.from_role_id = pair.survivor_id AND x.to_role_id = ac.to_role_id);
    DELETE FROM public.alternative_careers WHERE from_role_id = pair.loser_id;
    UPDATE public.alternative_careers ac SET to_role_id = pair.survivor_id
      WHERE ac.to_role_id = pair.loser_id
        AND NOT EXISTS (SELECT 1 FROM public.alternative_careers x
                        WHERE x.to_role_id = pair.survivor_id AND x.from_role_id = ac.from_role_id);
    DELETE FROM public.alternative_careers WHERE to_role_id = pair.loser_id;
    UPDATE public.roles
       SET review_status = 'merged',
           merged_into   = pair.survivor_id,
           role_slug     = '_merged_' || id::text
     WHERE id = pair.loser_id;
  END LOOP;
END $$;

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
    )
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
ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS pathway_family smallint;
COMMENT ON COLUMN public.roles.pathway_family IS 'Pathway family taxonomy v1: 1-28 per Clear Routes spec; NULL = unassigned/needs human review';

CREATE TABLE IF NOT EXISTS public.pathway_families (
  id smallint PRIMARY KEY,
  name text NOT NULL,
  description text
);
GRANT SELECT ON public.pathway_families TO anon, authenticated;
GRANT ALL ON public.pathway_families TO service_role;
ALTER TABLE public.pathway_families ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read pathway_families" ON public.pathway_families;
CREATE POLICY "public read pathway_families" ON public.pathway_families FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.pathway_families (id, name) VALUES
  (1,'Medicine, Dentistry & Veterinary'),(2,'Post-Qualification Specialisms'),(3,'Regulated Health Professions'),
  (4,'Psychological & Therapy Professions'),(5,'Social Work & Regulated Care'),(6,'Teaching (Schools)'),
  (7,'Academic & Research Science'),(8,'Engineering (Chartered)'),(9,'Built Environment Professional'),
  (10,'Skilled Trades'),(11,'Licensed & Ticketed Work'),(12,'Law'),(13,'Finance & Accountancy'),
  (14,'Tech, Data & Digital'),(15,'Public Service & Civil Service'),(16,'Uniformed & Frontline Services'),
  (17,'Creative Portfolio Careers'),(18,'Performing & Audition Careers'),(19,'Media, Journalism & Publishing'),
  (20,'Craft & Making Trades'),(21,'Hospitality, Events & Service'),(22,'Sales, Retail & Commercial'),
  (23,'Care & Support Work'),(24,'Land, Animal & Outdoor Work'),(25,'Transport & Logistics'),
  (26,'Self-Employed & Business-Building'),(27,'Reputation-Gated Careers'),(28,'Talent-Lottery Careers')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

DO $$ BEGIN
  ALTER TABLE public.roles
    ADD CONSTRAINT roles_pathway_family_fkey FOREIGN KEY (pathway_family) REFERENCES public.pathway_families(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public._is_contaminated_field(v text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN v IS NULL THEN false
    WHEN v ~* 'sector data 20[0-9]{2}'
         AND (
           (CASE WHEN v LIKE '%CILIP%'                              THEN 1 ELSE 0 END) +
           (CASE WHEN v ~  '(^|[^A-Za-z0-9_])ARA([^A-Za-z0-9_]|$)'  THEN 1 ELSE 0 END) +
           (CASE WHEN v LIKE '%NRCPD%'                              THEN 1 ELSE 0 END) +
           (CASE WHEN v LIKE '%RBSLI%'                              THEN 1 ELSE 0 END)
         ) >= 3 THEN true
    WHEN v ILIKE '%commission or account ownership%' THEN true
    WHEN v ILIKE '%field sales, account management%' THEN true
    WHEN v ILIKE '%target-and-commission worlds%'    THEN true
    WHEN v ILIKE '%target-driven cultures%'          THEN true
    ELSE false
  END;
$$;

CREATE OR REPLACE FUNCTION public._merge_roles(survivor uuid, losers uuid[], final_name text, final_slug text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
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

CREATE OR REPLACE FUNCTION public._is_contaminated_field(v text)
 RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN v IS NULL THEN false
    WHEN v ~* 'sector data 20[0-9]{2}'
         AND (
           (CASE WHEN v LIKE '%CILIP%' THEN 1 ELSE 0 END) +
           (CASE WHEN v ~ '(^|[^A-Za-z0-9_])ARA([^A-Za-z0-9_]|$)' THEN 1 ELSE 0 END) +
           (CASE WHEN v LIKE '%NRCPD%' THEN 1 ELSE 0 END) +
           (CASE WHEN v LIKE '%RBSLI%' THEN 1 ELSE 0 END)
         ) >= 3 THEN true
    WHEN v ILIKE '%commission or account ownership%' THEN true
    WHEN v ILIKE '%field sales, account management%' THEN true
    WHEN v ILIKE '%target-and-commission worlds%' THEN true
    WHEN v ILIKE '%target-driven cultures%' THEN true
    WHEN v ILIKE '%NCTJ%' THEN true
    WHEN v ILIKE '%bylines%' THEN true
    WHEN v ILIKE '%editorial assistant%' THEN true
    WHEN v ILIKE '%ex-SpAd%' THEN true
    WHEN v ILIKE '%party involvement%' THEN true
    WHEN v ILIKE '%parliamentary researchers%' THEN true
    ELSE false
  END;
$function$;

CREATE OR REPLACE FUNCTION public.get_contamination_fn_def()
 RETURNS text LANGUAGE sql STABLE SECURITY INVOKER SET search_path TO 'public'
AS $function$
  SELECT pg_get_functiondef('public._is_contaminated_field(text)'::regprocedure);
$function$;
GRANT EXECUTE ON FUNCTION public.get_contamination_fn_def() TO anon, authenticated, service_role;

ALTER TABLE public.providers RENAME COLUMN employment_rate TO publishes_note;
COMMENT ON COLUMN public.providers.publishes_note IS 'Free-text prose describing what the provider publishes about outcomes (or, in some rows, a general provider/sector note). NOT a numeric rate. Render verbatim — do not append "% employed" or similar unit labels.';

CREATE TABLE public.role_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_slug text NOT NULL,
  role_name text NOT NULL,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role_slug)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_views TO authenticated;
GRANT ALL ON public.role_views TO service_role;
ALTER TABLE public.role_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own role_views" ON public.role_views FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own role_views" ON public.role_views FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own role_views" ON public.role_views FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own role_views" ON public.role_views FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX role_views_user_viewed_idx ON public.role_views (user_id, viewed_at DESC);

CREATE TABLE public.decision_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  area text, starting_point text, highest_qualification text, need_to_earn text,
  weekly_hours text, budget_band text, commute_flexibility text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.decision_profiles TO authenticated;
GRANT ALL ON public.decision_profiles TO service_role;
ALTER TABLE public.decision_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own decision_profile" ON public.decision_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own decision_profile" ON public.decision_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own decision_profile" ON public.decision_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own decision_profile" ON public.decision_profiles FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_decision_profiles_updated_at BEFORE UPDATE ON public.decision_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.saved_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid REFERENCES public.roles(id) ON DELETE SET NULL,
  role_slug text NOT NULL, role_name text NOT NULL,
  overall_verdict text, best_route_title text, backup_route_title text,
  route_to_avoid_title text, local_realism_rating text, first_move text,
  input_snapshot jsonb, result_snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX saved_decisions_user_created_idx ON public.saved_decisions (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_decisions TO authenticated;
GRANT ALL ON public.saved_decisions TO service_role;
ALTER TABLE public.saved_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own saved_decisions" ON public.saved_decisions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own saved_decisions" ON public.saved_decisions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own saved_decisions" ON public.saved_decisions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own saved_decisions" ON public.saved_decisions FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_saved_decisions_updated_at BEFORE UPDATE ON public.saved_decisions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.decision_profiles ADD COLUMN IF NOT EXISTS support_circumstances jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.support_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, organisation_name text, type text NOT NULL,
  description text, who_it_helps text, eligibility_summary text,
  amount_or_value text, location_scope text, source_url text,
  last_checked_at date, review_status text NOT NULL DEFAULT 'active',
  sectors text[] NOT NULL DEFAULT '{}',
  role_slugs text[] NOT NULL DEFAULT '{}',
  criteria text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.support_opportunities TO anon, authenticated;
GRANT ALL ON public.support_opportunities TO service_role;
ALTER TABLE public.support_opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Support opportunities are publicly readable" ON public.support_opportunities FOR SELECT USING (review_status = 'active');
CREATE TRIGGER trg_support_opportunities_updated_at BEFORE UPDATE ON public.support_opportunities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_support_opportunities_sectors ON public.support_opportunities USING GIN (sectors);
CREATE INDEX IF NOT EXISTS idx_support_opportunities_role_slugs ON public.support_opportunities USING GIN (role_slugs);
CREATE INDEX IF NOT EXISTS idx_support_opportunities_criteria ON public.support_opportunities USING GIN (criteria);

CREATE TABLE public.opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('apprenticeship','job','trainee_role','assistant_role','course','access_course','functional_skills','bootcamp','employer_programme','support_funding')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','draft','archived')),
  provider_name text, employer_name text,
  role_tags text[] NOT NULL DEFAULT '{}', route_tags text[] NOT NULL DEFAULT '{}',
  description text, location_name text, postcode text, outward_code text,
  is_remote boolean NOT NULL DEFAULT false, is_online boolean NOT NULL DEFAULT false,
  radius_miles integer, cost text, salary text, funding_type text,
  entry_requirements text, english_maths_requirements text, qualification_level text,
  application_url text, source_url text, deadline date, start_date date,
  verified_at timestamptz, is_sponsored boolean NOT NULL DEFAULT false,
  sponsor_label text, warning_notes text,
  is_seed boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.opportunities TO anon, authenticated;
GRANT ALL ON public.opportunities TO service_role;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active opportunities are publicly readable" ON public.opportunities FOR SELECT USING (status = 'active');
CREATE INDEX opportunities_role_tags_idx ON public.opportunities USING GIN (role_tags);
CREATE INDEX opportunities_type_idx ON public.opportunities (type);
CREATE INDEX opportunities_status_idx ON public.opportunities (status);
CREATE TRIGGER opportunities_set_updated_at BEFORE UPDATE ON public.opportunities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.opportunity_enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  decision_id uuid REFERENCES public.saved_decisions(id) ON DELETE SET NULL,
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  name text NOT NULL, email text NOT NULL, phone text, message text,
  shared_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  consent_given boolean NOT NULL DEFAULT false,
  consent_timestamp timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.opportunity_enquiries TO authenticated;
GRANT ALL ON public.opportunity_enquiries TO service_role;
ALTER TABLE public.opportunity_enquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their own enquiries" ON public.opportunity_enquiries FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own enquiries" ON public.opportunity_enquiries FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND consent_given = true AND (decision_id IS NULL OR EXISTS (SELECT 1 FROM public.saved_decisions sd WHERE sd.id = decision_id AND sd.user_id = auth.uid())));
CREATE INDEX opportunity_enquiries_user_idx ON public.opportunity_enquiries (user_id);
CREATE INDEX opportunity_enquiries_opp_idx ON public.opportunity_enquiries (opportunity_id);

CREATE TABLE public.institution_enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, work_email text NOT NULL, institution text NOT NULL,
  job_title text NOT NULL, learner_count text, message text NOT NULL,
  enquiry_type text NOT NULL DEFAULT 'demo',
  contact_consent boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.institution_enquiries TO anon;
GRANT INSERT ON public.institution_enquiries TO authenticated;
GRANT ALL ON public.institution_enquiries TO service_role;
ALTER TABLE public.institution_enquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit an institution enquiry" ON public.institution_enquiries FOR INSERT TO anon, authenticated WITH CHECK (contact_consent = true);

ALTER TABLE public.roles
  ADD COLUMN IF NOT EXISTS salary_as_at date,
  ADD COLUMN IF NOT EXISTS salary_source_url text;

CREATE TABLE IF NOT EXISTS public.reality_check_explanation_cache (
  key text PRIMARY KEY,
  payload jsonb NOT NULL,
  hit_count integer NOT NULL DEFAULT 0 CHECK (hit_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_hit_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reality_check_cache_created_at_idx ON public.reality_check_explanation_cache (created_at);
CREATE INDEX IF NOT EXISTS reality_check_cache_last_hit_at_idx ON public.reality_check_explanation_cache (last_hit_at);
REVOKE ALL ON public.reality_check_explanation_cache FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.reality_check_explanation_cache TO service_role;
ALTER TABLE public.reality_check_explanation_cache ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.reality_check_rate (
  scope text NOT NULL CHECK (scope IN ('endpoint_anon','endpoint_auth','llm_anon','llm_auth','global')),
  key_hash text NOT NULL,
  window_start timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 0 CHECK (count >= 0),
  PRIMARY KEY (scope, key_hash, window_start)
);
CREATE INDEX IF NOT EXISTS reality_check_rate_window_idx ON public.reality_check_rate (window_start);
REVOKE ALL ON public.reality_check_rate FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.reality_check_rate TO service_role;
ALTER TABLE public.reality_check_rate ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.reality_check_rate_increment(p_scope text, p_key_hash text, p_window_start timestamptz) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_count integer;
BEGIN
  INSERT INTO public.reality_check_rate (scope, key_hash, window_start, count)
  VALUES (p_scope, p_key_hash, p_window_start, 1)
  ON CONFLICT (scope, key_hash, window_start)
  DO UPDATE SET count = public.reality_check_rate.count + 1
  RETURNING count INTO v_count;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.reality_check_rate_increment(text, text, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reality_check_rate_increment(text, text, timestamptz) TO service_role;

CREATE TABLE IF NOT EXISTS public.reality_check_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_slug text NOT NULL,
  verdict text,
  reason text NOT NULL CHECK (reason IN ('wrong_route','wrong_tone','fact_wrong','other')),
  detail text CHECK (detail IS NULL OR char_length(detail) <= 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reality_check_feedback_role_slug_idx ON public.reality_check_feedback (role_slug);
CREATE INDEX IF NOT EXISTS reality_check_feedback_created_at_idx ON public.reality_check_feedback (created_at);
REVOKE ALL ON public.reality_check_feedback FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.reality_check_feedback TO service_role;
ALTER TABLE public.reality_check_feedback ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON FUNCTION public.reality_check_rate_increment(text, text, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reality_check_rate_increment(text, text, timestamptz) FROM anon;
REVOKE ALL ON FUNCTION public.reality_check_rate_increment(text, text, timestamptz) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.reality_check_rate_increment(text, text, timestamptz) TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reality_check_rate TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reality_check_explanation_cache TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reality_check_feedback TO service_role;

ALTER TABLE public.reality_check_explanation_cache
  ADD COLUMN IF NOT EXISTS expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days');
CREATE INDEX IF NOT EXISTS reality_check_cache_expires_at_idx ON public.reality_check_explanation_cache (expires_at);

DO $$ BEGIN
  CREATE TYPE public.role_service_level AS ENUM ('info_only', 'reality_check', 'full_support');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS service_level public.role_service_level NOT NULL DEFAULT 'info_only';
CREATE INDEX IF NOT EXISTS roles_service_level_idx ON public.roles (service_level);

UPDATE public.roles SET service_level = 'reality_check'
 WHERE role_slug IN ('registered-nurse','data-analyst','software-engineer','electrician','primary-school-teacher');

CREATE TABLE IF NOT EXISTS public.role_review_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL,
  role_slug TEXT NOT NULL,
  requester_user_id UUID,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT role_review_requests_note_len CHECK (note IS NULL OR char_length(note) <= 500)
);
CREATE INDEX IF NOT EXISTS role_review_requests_slug_idx ON public.role_review_requests (role_slug, created_at DESC);
REVOKE ALL ON public.role_review_requests FROM PUBLIC;
REVOKE ALL ON public.role_review_requests FROM anon;
REVOKE ALL ON public.role_review_requests FROM authenticated;
GRANT ALL ON public.role_review_requests TO service_role;
ALTER TABLE public.role_review_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active opportunities are publicly readable" ON public.opportunities;
CREATE POLICY "Verified live opportunities are publicly readable" ON public.opportunities FOR SELECT
  USING (status = 'active' AND is_seed = false AND verified_at IS NOT NULL AND (deadline IS NULL OR deadline >= CURRENT_DATE));