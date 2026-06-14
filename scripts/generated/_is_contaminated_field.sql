-- GENERATED FILE — do not edit by hand.
-- Source: docs/audit/family-token-map.md (AUDIT-RULES JSON block).
-- Regenerate with: bun run scripts/gen-contamination-fn.ts
-- Then apply via the migration tool (Shape A: staged → approval → apply).

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
