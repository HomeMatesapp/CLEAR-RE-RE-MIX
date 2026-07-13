-- ============================================================================
-- Increment 4: saved generic-pack decisions render properly.
--
-- The claim RPC (unchanged signature, identical claim semantics) now also
-- derives the participant-display fields from the server-held V2 snapshot:
--   • result_snapshot   := result_v2  (versioned; the client's snapshot
--                          reader dispatches on schemaVersion, and legacy
--                          rows are untouched)
--   • best_route_title  := title of the strongest route, when one is open
--   • first_move        := title of the first immediate action
--
-- All display values are copied verbatim from pack-authored, language-safe
-- content. Nothing client-authored is involved. Existing rows are NOT
-- rewritten; legacy_engine rows are unaffected.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.claim_receipt_and_save_decision(
  _receipt_hash text,
  _user_id uuid,
  _label text DEFAULT NULL
) RETURNS TABLE (saved_decision_id uuid, status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r public.assessment_receipts%ROWTYPE;
  v_saved_id uuid;
  v_role_slug text;
  v_role_name text;
  v_strongest_id text;
  v_best_route_title text;
  v_first_move text;
BEGIN
  IF _user_id IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, 'user_id_required'::text; RETURN;
  END IF;
  IF _receipt_hash IS NULL OR length(_receipt_hash) = 0 THEN
    RETURN QUERY SELECT NULL::uuid, 'unknown_receipt'::text; RETURN;
  END IF;

  SELECT * INTO r FROM public.assessment_receipts
    WHERE receipt_hash = _receipt_hash FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, 'unknown_receipt'::text; RETURN;
  END IF;

  IF r.revoked_at IS NOT NULL THEN
    RETURN QUERY SELECT NULL::uuid, 'revoked_receipt'::text; RETURN;
  END IF;

  -- Already claimed?
  IF r.saved_decision_id IS NOT NULL THEN
    IF r.claimed_user_id = _user_id THEN
      RETURN QUERY SELECT r.saved_decision_id, 'already_claimed'::text; RETURN;
    ELSE
      RETURN QUERY SELECT NULL::uuid, 'claimed_by_other'::text; RETURN;
    END IF;
  END IF;

  IF r.expires_at < now() THEN
    RETURN QUERY SELECT NULL::uuid, 'expired_receipt'::text; RETURN;
  END IF;

  IF r.issued_user_id IS NOT NULL AND r.issued_user_id <> _user_id THEN
    RETURN QUERY SELECT NULL::uuid, 'issued_to_other_user'::text; RETURN;
  END IF;

  SELECT role_slug, role_name INTO v_role_slug, v_role_name
    FROM public.roles WHERE id = r.role_id;
  IF v_role_slug IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, 'role_not_found'::text; RETURN;
  END IF;

  -- Increment 4: derive display fields from the server-held V2 snapshot.
  IF r.result_v2 IS NOT NULL THEN
    v_strongest_id := r.result_v2->>'strongestRouteId';
    IF v_strongest_id IS NOT NULL THEN
      SELECT route->>'routeTitle' INTO v_best_route_title
        FROM jsonb_array_elements(COALESCE(r.result_v2->'routes', '[]'::jsonb)) AS route
        WHERE route->>'routeId' = v_strongest_id
        LIMIT 1;
    END IF;
    v_first_move := r.result_v2->'immediateActions'->0->>'title';
  END IF;

  INSERT INTO public.saved_decisions (
    user_id, role_id, role_slug, role_name,
    evaluation_source, pack_id, pack_version, pack_content_hash,
    evaluator_schema_version, result_v1, label,
    result_v2, result_schema_version,
    result_snapshot, best_route_title, first_move
  ) VALUES (
    _user_id, r.role_id, v_role_slug, v_role_name,
    'generic_pack_v1', r.pack_id, r.pack_version, r.pack_content_hash,
    r.evaluator_schema_version, r.result_v1, NULLIF(_label, ''),
    r.result_v2,
    CASE WHEN r.result_v2 IS NOT NULL THEN 'reality-check-result/v2' ELSE NULL END,
    r.result_v2, v_best_route_title, v_first_move
  ) RETURNING id INTO v_saved_id;

  UPDATE public.assessment_receipts
    SET claimed_user_id = _user_id,
        claimed_at = now(),
        saved_decision_id = v_saved_id
    WHERE receipt_hash = _receipt_hash;

  RETURN QUERY SELECT v_saved_id, 'created'::text;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_receipt_and_save_decision(text, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_receipt_and_save_decision(text, uuid, text) TO service_role;
