-- Regenerate public._is_contaminated_field from AUDIT-RULES JSON (Shape A: staged → applied).
-- Source: scripts/generated/_is_contaminated_field.sql
CREATE OR REPLACE FUNCTION public._is_contaminated_field(v text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
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

-- Drift-guard helper: returns the deployed source of _is_contaminated_field so
-- the audit script can extract its canonical signature and compare to JSON.
-- SECURITY DEFINER + restricted body (pg_get_functiondef of one specific function)
-- so it cannot be used as a generic schema-leak vector.
CREATE OR REPLACE FUNCTION public.get_contamination_fn_def()
 RETURNS text
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT pg_get_functiondef('public._is_contaminated_field(text)'::regprocedure);
$function$;

GRANT EXECUTE ON FUNCTION public.get_contamination_fn_def() TO anon, authenticated, service_role;