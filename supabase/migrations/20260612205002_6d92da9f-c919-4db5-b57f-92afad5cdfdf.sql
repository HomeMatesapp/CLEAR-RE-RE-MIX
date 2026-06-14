
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

    -- Append loser slug as alias on survivor (dedup, exclude survivor's own slug)
    UPDATE public.roles
       SET previous_slugs = (
         SELECT ARRAY(SELECT DISTINCT x FROM unnest(COALESCE(previous_slugs, ARRAY[]::text[]) || ARRAY[stale_slug]) x
                      WHERE x IS NOT NULL AND x <> role_slug)
       )
     WHERE id = pair.survivor_id;

    -- Reassign FKs with dedup
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

    -- Soft-delete loser with new vocabulary
    UPDATE public.roles
       SET review_status = 'merged',
           merged_into   = pair.survivor_id,
           role_slug     = '_merged_' || id::text
     WHERE id = pair.loser_id;
  END LOOP;
END $$;
