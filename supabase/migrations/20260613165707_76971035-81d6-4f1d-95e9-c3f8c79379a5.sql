CREATE OR REPLACE FUNCTION public.get_contamination_fn_def()
 RETURNS text
 LANGUAGE sql
 STABLE
 SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
  SELECT pg_get_functiondef('public._is_contaminated_field(text)'::regprocedure);
$function$;