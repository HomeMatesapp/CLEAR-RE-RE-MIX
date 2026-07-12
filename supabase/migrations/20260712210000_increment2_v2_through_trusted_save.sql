-- ============================================================================
-- Increment 2: the standard result contract (RealityCheckResultV2) travels
-- through the trusted-save pipeline.
--
-- Additive and backfill-safe:
--   • assessment_receipts and saved_decisions gain nullable result_v2 columns.
--     Old receipts / rows simply have NULL — every existing flow is unchanged.
--   • claim_receipt_and_save_decision is replaced with a version that ALSO
--     copies result_v2 and stamps result_schema_version (the Increment 1
--     column) when a V2 snapshot is present. Identical claim semantics:
--     same rejections, same idempotency, same locking.
--   • result_v1 remains authoritative for the current UI. result_v2 is the
--     contract downstream increments will render; both are server-held
--     snapshots of the SAME evaluation inputs, produced by the same edge
--     invocation.
-- ============================================================================

ALTER TABLE public.assessment_receipts
  ADD COLUMN IF NOT EXISTS result_v2 jsonb,
  ADD COLUMN IF NOT EXISTS result_v2_canonical_hash text;

COMMENT ON COLUMN public.assessment_receipts.result_v2 IS
  'RealityCheckResultV2 snapshot evaluated alongside result_v1 by the same reality-check invocation. NULL for receipts issued before Increment 2.';
COMMENT ON COLUMN public.assessment_receipts.result_v2_canonical_hash IS
  'Canonical hash of result_v2, computed server-side at issuance.';

ALTER TABLE public.saved_decisions
  ADD COLUMN IF NOT EXISTS result_v2 jsonb;

COMMENT ON COLUMN public.saved_decisions.result_v2 IS
  'RealityCheckResultV2 copied from the claimed assessment receipt. NULL for rows saved before Increment 2 and for legacy_engine rows.';

-- Replace the claim RPC. Signature unchanged; behaviour is identical except
-- the saved row additionally receives result_v2 and result_schema_version
-- when the receipt carries a V2 snapshot.
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

  INSERT INTO public.saved_decisions (
    user_id, role_id, role_slug, role_name,
    evaluation_source, pack_id, pack_version, pack_content_hash,
    evaluator_schema_version, result_v1, label,
    result_v2, result_schema_version
  ) VALUES (
    _user_id, r.role_id, v_role_slug, v_role_name,
    'generic_pack_v1', r.pack_id, r.pack_version, r.pack_content_hash,
    r.evaluator_schema_version, r.result_v1, NULLIF(_label, ''),
    r.result_v2,
    CASE WHEN r.result_v2 IS NOT NULL THEN 'reality-check-result/v2' ELSE NULL END
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
