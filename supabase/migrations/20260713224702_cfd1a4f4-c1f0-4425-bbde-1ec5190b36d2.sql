ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS route_logic_reviewed_at date;
ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS hub_summary text;
ALTER TABLE public.saved_decisions ADD COLUMN IF NOT EXISTS route_actions jsonb;
ALTER TABLE public.saved_decisions
  ADD COLUMN IF NOT EXISTS answer_schema_version integer,
  ADD COLUMN IF NOT EXISTS questionnaire_version text,
  ADD COLUMN IF NOT EXISTS answer_snapshot jsonb;
UPDATE public.roles SET role_name = 'Heating & ventilation engineer' WHERE role_slug = 'hvac-engineer';

DO $$ BEGIN CREATE TYPE public.career_pack_status AS ENUM ('draft', 'published', 'review_due', 'suspended', 'superseded', 'archived'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.career_pack_environment AS ENUM ('development', 'staging', 'production'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.career_pack_event_type AS ENUM ('imported', 'published', 'marked_review_due', 'suspended', 'unsuspended', 'superseded', 'archived', 'bound', 'unbound'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.career_pack_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL UNIQUE,
  is_test_identity boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.career_pack_identities TO service_role;
ALTER TABLE public.career_pack_identities ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.career_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE RESTRICT,
  slug text NOT NULL,
  pack_version text NOT NULL,
  schema_version text NOT NULL,
  archetype_id text NOT NULL,
  content_hash text NOT NULL,
  content jsonb NOT NULL,
  owner_identity_id uuid NOT NULL REFERENCES public.career_pack_identities(id) ON DELETE RESTRICT,
  reviewer_identity_id uuid NOT NULL REFERENCES public.career_pack_identities(id) ON DELETE RESTRICT,
  environment public.career_pack_environment NOT NULL,
  is_test boolean NOT NULL DEFAULT false,
  imported_by text NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT career_packs_owner_reviewer_distinct CHECK (owner_identity_id <> reviewer_identity_id),
  CONSTRAINT career_packs_no_test_in_prod CHECK (NOT (is_test AND environment = 'production')),
  CONSTRAINT career_packs_semver CHECK (pack_version ~ '^\d+\.\d+\.\d+$'),
  CONSTRAINT career_packs_hash_hex CHECK (content_hash ~ '^[0-9a-f]{64}$'),
  UNIQUE (role_id, pack_version),
  UNIQUE (slug, pack_version),
  UNIQUE (content_hash)
);
CREATE INDEX career_packs_role_id_idx ON public.career_packs(role_id);
CREATE INDEX career_packs_slug_idx ON public.career_packs(slug);
GRANT ALL ON public.career_packs TO service_role;
ALTER TABLE public.career_packs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.career_packs_reject_mutations() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'career_packs rows are immutable (op=%)', TG_OP USING ERRCODE = 'insufficient_privilege'; END; $$;
CREATE TRIGGER career_packs_no_update BEFORE UPDATE ON public.career_packs FOR EACH ROW EXECUTE FUNCTION public.career_packs_reject_mutations();
CREATE TRIGGER career_packs_no_delete BEFORE DELETE ON public.career_packs FOR EACH ROW EXECUTE FUNCTION public.career_packs_reject_mutations();

CREATE TABLE public.career_pack_publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id uuid NOT NULL UNIQUE REFERENCES public.career_packs(id) ON DELETE RESTRICT,
  status public.career_pack_status NOT NULL DEFAULT 'draft',
  published_at timestamptz, review_due_at timestamptz, suspended_at timestamptz,
  superseded_at timestamptz, archived_at timestamptz, notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX career_pack_publications_status_idx ON public.career_pack_publications(status);
GRANT ALL ON public.career_pack_publications TO service_role;
ALTER TABLE public.career_pack_publications ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER career_pack_publications_touch_updated_at BEFORE UPDATE ON public.career_pack_publications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.role_pack_bindings (
  role_id uuid PRIMARY KEY REFERENCES public.roles(id) ON DELETE CASCADE,
  pack_id uuid NOT NULL REFERENCES public.career_packs(id) ON DELETE RESTRICT,
  bound_at timestamptz NOT NULL DEFAULT now(),
  bound_by text NOT NULL
);
CREATE INDEX role_pack_bindings_pack_id_idx ON public.role_pack_bindings(pack_id);
GRANT ALL ON public.role_pack_bindings TO service_role;
ALTER TABLE public.role_pack_bindings ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.career_pack_publication_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id uuid NOT NULL REFERENCES public.career_packs(id) ON DELETE RESTRICT,
  event_type public.career_pack_event_type NOT NULL,
  from_status public.career_pack_status, to_status public.career_pack_status,
  actor text NOT NULL, metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX career_pack_publication_events_pack_id_idx ON public.career_pack_publication_events(pack_id, at);
GRANT ALL ON public.career_pack_publication_events TO service_role;
ALTER TABLE public.career_pack_publication_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.career_pack_events_reject_mutations() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'career_pack_publication_events is append-only (op=%)', TG_OP USING ERRCODE = 'insufficient_privilege'; END; $$;
CREATE TRIGGER career_pack_events_no_update BEFORE UPDATE ON public.career_pack_publication_events FOR EACH ROW EXECUTE FUNCTION public.career_pack_events_reject_mutations();
CREATE TRIGGER career_pack_events_no_delete BEFORE DELETE ON public.career_pack_publication_events FOR EACH ROW EXECUTE FUNCTION public.career_pack_events_reject_mutations();

CREATE TABLE public.career_pack_config (
  id boolean PRIMARY KEY DEFAULT true,
  review_due_grace_days integer NOT NULL DEFAULT 30,
  environment public.career_pack_environment NOT NULL DEFAULT 'production',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT career_pack_config_singleton CHECK (id = true),
  CONSTRAINT career_pack_config_grace_nonnegative CHECK (review_due_grace_days >= 0)
);
INSERT INTO public.career_pack_config (id) VALUES (true);
GRANT SELECT, UPDATE ON public.career_pack_config TO service_role;
ALTER TABLE public.career_pack_config ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.career_pack_is_servable(_pack_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.career_pack_publications p, public.career_pack_config c
    WHERE p.pack_id = _pack_id AND (p.status = 'published' OR (p.status = 'review_due' AND p.review_due_at IS NOT NULL AND p.review_due_at + make_interval(days => c.review_due_grace_days) >= now())));
$$;

CREATE OR REPLACE FUNCTION public.role_pack_bindings_check_servable() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NOT public.career_pack_is_servable(NEW.pack_id) THEN
    RAISE EXCEPTION 'pack % is not servable and cannot be bound', NEW.pack_id USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER role_pack_bindings_servable_check BEFORE INSERT OR UPDATE ON public.role_pack_bindings FOR EACH ROW EXECUTE FUNCTION public.role_pack_bindings_check_servable();

ALTER TABLE public.saved_decisions
  ADD COLUMN IF NOT EXISTS pack_id uuid REFERENCES public.career_packs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pack_version text,
  ADD COLUMN IF NOT EXISTS pack_content_hash text,
  ADD COLUMN IF NOT EXISTS evaluator_schema_version text,
  ADD COLUMN IF NOT EXISTS result_v1 jsonb;
CREATE INDEX IF NOT EXISTS saved_decisions_pack_id_idx ON public.saved_decisions(pack_id);

REVOKE ALL ON FUNCTION public.career_pack_is_servable(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.career_packs_reject_mutations() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.career_pack_events_reject_mutations() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.role_pack_bindings_check_servable() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.career_pack_is_servable(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.publish_and_bind_career_pack(_pack_id uuid, _actor text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_role_id uuid; v_prior_pack_id uuid; v_prior_status public.career_pack_status; v_current_status public.career_pack_status; v_changed boolean := false;
BEGIN
  SELECT role_id INTO v_role_id FROM public.career_packs WHERE id = _pack_id;
  IF v_role_id IS NULL THEN RAISE EXCEPTION 'career pack % does not exist', _pack_id; END IF;
  SELECT status INTO v_current_status FROM public.career_pack_publications WHERE pack_id = _pack_id;
  SELECT pack_id INTO v_prior_pack_id FROM public.role_pack_bindings WHERE role_id = v_role_id;
  IF v_current_status = 'published' AND v_prior_pack_id IS NOT DISTINCT FROM _pack_id THEN
    RETURN jsonb_build_object('changed', false, 'pack_id', _pack_id, 'role_id', v_role_id);
  END IF;
  IF v_prior_pack_id IS NOT NULL AND v_prior_pack_id <> _pack_id THEN
    SELECT status INTO v_prior_status FROM public.career_pack_publications WHERE pack_id = v_prior_pack_id;
    UPDATE public.career_pack_publications SET status = 'superseded', superseded_at = now() WHERE pack_id = v_prior_pack_id;
    INSERT INTO public.career_pack_publication_events(pack_id, event_type, from_status, to_status, actor, metadata) VALUES (v_prior_pack_id, 'superseded', v_prior_status, 'superseded', _actor, jsonb_build_object('superseded_by', _pack_id));
    v_changed := true;
  END IF;
  IF v_current_status <> 'published' THEN
    UPDATE public.career_pack_publications SET status = 'published', published_at = COALESCE(published_at, now()), suspended_at = NULL, superseded_at = NULL, archived_at = NULL WHERE pack_id = _pack_id;
    INSERT INTO public.career_pack_publication_events(pack_id, event_type, from_status, to_status, actor) VALUES (_pack_id, 'published', v_current_status, 'published', _actor);
    v_changed := true;
  END IF;
  IF v_prior_pack_id IS DISTINCT FROM _pack_id THEN
    INSERT INTO public.role_pack_bindings(role_id, pack_id, bound_by) VALUES (v_role_id, _pack_id, _actor)
      ON CONFLICT (role_id) DO UPDATE SET pack_id = EXCLUDED.pack_id, bound_at = now(), bound_by = EXCLUDED.bound_by;
    INSERT INTO public.career_pack_publication_events(pack_id, event_type, actor) VALUES (_pack_id, 'bound', _actor);
    v_changed := true;
  END IF;
  RETURN jsonb_build_object('changed', v_changed, 'pack_id', _pack_id, 'role_id', v_role_id);
END; $$;
REVOKE ALL ON FUNCTION public.publish_and_bind_career_pack(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publish_and_bind_career_pack(uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.role_pack_bindings_check_role_matches() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_pack_role uuid;
BEGIN
  SELECT role_id INTO v_pack_role FROM public.career_packs WHERE id = NEW.pack_id;
  IF v_pack_role IS NULL THEN RAISE EXCEPTION 'pack % does not exist', NEW.pack_id USING ERRCODE = 'foreign_key_violation'; END IF;
  IF v_pack_role <> NEW.role_id THEN RAISE EXCEPTION 'binding role_id % does not match pack role_id %', NEW.role_id, v_pack_role USING ERRCODE = 'check_violation'; END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.role_pack_bindings_check_role_matches() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS role_pack_bindings_role_match_check ON public.role_pack_bindings;
CREATE TRIGGER role_pack_bindings_role_match_check BEFORE INSERT OR UPDATE ON public.role_pack_bindings FOR EACH ROW EXECUTE FUNCTION public.role_pack_bindings_check_role_matches();

CREATE OR REPLACE FUNCTION public.career_pack_publications_one_active() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_role_id uuid; v_grace_days int; v_conflicts int;
BEGIN
  IF NEW.status NOT IN ('published', 'review_due') THEN RETURN NEW; END IF;
  SELECT role_id INTO v_role_id FROM public.career_packs WHERE id = NEW.pack_id;
  SELECT review_due_grace_days INTO v_grace_days FROM public.career_pack_config;
  IF NEW.status = 'review_due' AND (NEW.review_due_at IS NULL OR NEW.review_due_at + make_interval(days => v_grace_days) < now()) THEN RETURN NEW; END IF;
  SELECT COUNT(*) INTO v_conflicts FROM public.career_pack_publications p JOIN public.career_packs cp ON cp.id = p.pack_id
    WHERE cp.role_id = v_role_id AND p.pack_id <> NEW.pack_id AND (p.status = 'published' OR (p.status = 'review_due' AND p.review_due_at IS NOT NULL AND p.review_due_at + make_interval(days => v_grace_days) >= now()));
  IF v_conflicts > 0 THEN RAISE EXCEPTION 'another actively-serving publication for role % already exists', v_role_id USING ERRCODE = 'check_violation'; END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.career_pack_publications_one_active() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER career_pack_publications_one_active_trg BEFORE INSERT OR UPDATE ON public.career_pack_publications FOR EACH ROW EXECUTE FUNCTION public.career_pack_publications_one_active();

CREATE OR REPLACE FUNCTION public.resolve_role_pack_binding(_role_id uuid, _slug text)
RETURNS TABLE (pack_id uuid, role_id uuid, slug text, pack_version text, content_hash text, content jsonb, status public.career_pack_status, role_slug text, review_due_at timestamptz, is_servable boolean, geographic_scope jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_resolved_role uuid;
BEGIN
  IF _role_id IS NOT NULL AND _slug IS NOT NULL THEN
    SELECT r.id INTO v_resolved_role FROM public.roles r WHERE r.id = _role_id AND r.role_slug = _slug;
    IF v_resolved_role IS NULL THEN RETURN; END IF;
  ELSIF _role_id IS NOT NULL THEN v_resolved_role := _role_id;
  ELSIF _slug IS NOT NULL THEN
    SELECT r.id INTO v_resolved_role FROM public.roles r WHERE r.role_slug = _slug;
    IF v_resolved_role IS NULL THEN RETURN; END IF;
  ELSE RETURN; END IF;
  RETURN QUERY SELECT cp.id, cp.role_id, cp.slug, cp.pack_version, cp.content_hash, cp.content, pub.status, r.role_slug, pub.review_due_at,
    public.career_pack_is_servable(cp.id), COALESCE(cp.content -> 'geographicScope', 'null'::jsonb)
    FROM public.role_pack_bindings b JOIN public.career_packs cp ON cp.id = b.pack_id JOIN public.career_pack_publications pub ON pub.pack_id = cp.id JOIN public.roles r ON r.id = cp.role_id
    WHERE b.role_id = v_resolved_role LIMIT 1;
END; $$;
REVOKE ALL ON FUNCTION public.resolve_role_pack_binding(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_role_pack_binding(uuid, text) TO service_role;

ALTER TABLE public.saved_decisions ADD COLUMN IF NOT EXISTS evaluation_source text NOT NULL DEFAULT 'legacy_engine';
ALTER TABLE public.saved_decisions DROP CONSTRAINT IF EXISTS saved_decisions_v1_all_or_nothing;
ALTER TABLE public.saved_decisions ADD CONSTRAINT saved_decisions_evaluation_source_chk CHECK (evaluation_source IN ('legacy_engine', 'generic_pack_v1'));
ALTER TABLE public.saved_decisions ADD CONSTRAINT saved_decisions_source_shape_chk CHECK (
  (evaluation_source = 'legacy_engine' AND pack_id IS NULL AND pack_version IS NULL AND pack_content_hash IS NULL AND evaluator_schema_version IS NULL AND result_v1 IS NULL)
  OR (evaluation_source = 'generic_pack_v1' AND pack_id IS NOT NULL AND pack_version IS NOT NULL AND pack_content_hash IS NOT NULL AND evaluator_schema_version IS NOT NULL AND result_v1 IS NOT NULL));

ALTER TABLE public.career_pack_config ADD COLUMN IF NOT EXISTS receipt_ttl_minutes int NOT NULL DEFAULT 30;
ALTER TABLE public.saved_decisions ADD COLUMN IF NOT EXISTS label text;

CREATE TABLE IF NOT EXISTS public.assessment_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_hash text NOT NULL UNIQUE,
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  role_slug text NOT NULL,
  pack_id uuid NOT NULL REFERENCES public.career_packs(id) ON DELETE CASCADE,
  pack_version text NOT NULL,
  pack_content_hash text NOT NULL,
  evaluator_schema_version text NOT NULL,
  evaluation_source text NOT NULL DEFAULT 'generic_pack_v1',
  result_v1 jsonb NOT NULL,
  result_canonical_hash text NOT NULL,
  issued_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_at timestamptz,
  saved_decision_id uuid REFERENCES public.saved_decisions(id) ON DELETE SET NULL,
  revoked_at timestamptz,
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  CONSTRAINT assessment_receipts_source_chk CHECK (evaluation_source = 'generic_pack_v1'),
  CONSTRAINT assessment_receipts_claim_chk CHECK ((claimed_user_id IS NULL AND claimed_at IS NULL AND saved_decision_id IS NULL) OR (claimed_user_id IS NOT NULL AND claimed_at IS NOT NULL AND saved_decision_id IS NOT NULL)),
  CONSTRAINT assessment_receipts_issued_matches_claim_chk CHECK (issued_user_id IS NULL OR claimed_user_id IS NULL OR issued_user_id = claimed_user_id)
);
CREATE INDEX IF NOT EXISTS assessment_receipts_expires_idx ON public.assessment_receipts (expires_at);
CREATE INDEX IF NOT EXISTS assessment_receipts_claimed_user_idx ON public.assessment_receipts (claimed_user_id) WHERE claimed_user_id IS NOT NULL;
GRANT ALL ON public.assessment_receipts TO service_role;
ALTER TABLE public.assessment_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert own saved_decisions" ON public.saved_decisions;
DROP POLICY IF EXISTS "Users update own saved_decisions" ON public.saved_decisions;
CREATE POLICY "Users insert own legacy saved_decisions" ON public.saved_decisions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND evaluation_source = 'legacy_engine');
CREATE POLICY "Users update own legacy saved_decisions" ON public.saved_decisions FOR UPDATE TO authenticated USING (auth.uid() = user_id AND evaluation_source = 'legacy_engine') WITH CHECK (auth.uid() = user_id AND evaluation_source = 'legacy_engine');

ALTER TABLE public.assessment_receipts ADD COLUMN IF NOT EXISTS result_v2 jsonb, ADD COLUMN IF NOT EXISTS result_v2_canonical_hash text;
ALTER TABLE public.saved_decisions ADD COLUMN IF NOT EXISTS result_v2 jsonb;
ALTER TABLE public.saved_decisions ADD COLUMN IF NOT EXISTS result_schema_version text;
COMMENT ON COLUMN public.saved_decisions.result_schema_version IS 'Schema version of result_snapshot (e.g. reality-check-result/v2). NULL = pre-versioned legacy snapshot.';

CREATE OR REPLACE FUNCTION public.claim_receipt_and_save_decision(_receipt_hash text, _user_id uuid, _label text DEFAULT NULL) RETURNS TABLE (saved_decision_id uuid, status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.assessment_receipts%ROWTYPE; v_saved_id uuid; v_role_slug text; v_role_name text; v_strongest_id text; v_best_route_title text; v_first_move text;
BEGIN
  IF _user_id IS NULL THEN RETURN QUERY SELECT NULL::uuid, 'user_id_required'::text; RETURN; END IF;
  IF _receipt_hash IS NULL OR length(_receipt_hash) = 0 THEN RETURN QUERY SELECT NULL::uuid, 'unknown_receipt'::text; RETURN; END IF;
  SELECT * INTO r FROM public.assessment_receipts WHERE receipt_hash = _receipt_hash FOR UPDATE;
  IF NOT FOUND THEN RETURN QUERY SELECT NULL::uuid, 'unknown_receipt'::text; RETURN; END IF;
  IF r.revoked_at IS NOT NULL THEN RETURN QUERY SELECT NULL::uuid, 'revoked_receipt'::text; RETURN; END IF;
  IF r.saved_decision_id IS NOT NULL THEN
    IF r.claimed_user_id = _user_id THEN RETURN QUERY SELECT r.saved_decision_id, 'already_claimed'::text; RETURN;
    ELSE RETURN QUERY SELECT NULL::uuid, 'claimed_by_other'::text; RETURN; END IF;
  END IF;
  IF r.expires_at < now() THEN RETURN QUERY SELECT NULL::uuid, 'expired_receipt'::text; RETURN; END IF;
  IF r.issued_user_id IS NOT NULL AND r.issued_user_id <> _user_id THEN RETURN QUERY SELECT NULL::uuid, 'issued_to_other_user'::text; RETURN; END IF;
  SELECT role_slug, role_name INTO v_role_slug, v_role_name FROM public.roles WHERE id = r.role_id;
  IF v_role_slug IS NULL THEN RETURN QUERY SELECT NULL::uuid, 'role_not_found'::text; RETURN; END IF;
  IF r.result_v2 IS NOT NULL THEN
    v_strongest_id := r.result_v2->>'strongestRouteId';
    IF v_strongest_id IS NOT NULL THEN
      SELECT route->>'routeTitle' INTO v_best_route_title FROM jsonb_array_elements(COALESCE(r.result_v2->'routes', '[]'::jsonb)) AS route WHERE route->>'routeId' = v_strongest_id LIMIT 1;
    END IF;
    v_first_move := r.result_v2->'immediateActions'->0->>'title';
  END IF;
  INSERT INTO public.saved_decisions (user_id, role_id, role_slug, role_name, evaluation_source, pack_id, pack_version, pack_content_hash, evaluator_schema_version, result_v1, label, result_v2, result_schema_version, result_snapshot, best_route_title, first_move)
  VALUES (_user_id, r.role_id, v_role_slug, v_role_name, 'generic_pack_v1', r.pack_id, r.pack_version, r.pack_content_hash, r.evaluator_schema_version, r.result_v1, NULLIF(_label, ''), r.result_v2,
    CASE WHEN r.result_v2 IS NOT NULL THEN 'reality-check-result/v2' ELSE NULL END, r.result_v2, v_best_route_title, v_first_move)
  RETURNING id INTO v_saved_id;
  UPDATE public.assessment_receipts SET claimed_user_id = _user_id, claimed_at = now(), saved_decision_id = v_saved_id WHERE receipt_hash = _receipt_hash;
  RETURN QUERY SELECT v_saved_id, 'created'::text;
END; $$;
REVOKE ALL ON FUNCTION public.claim_receipt_and_save_decision(text, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_receipt_and_save_decision(text, uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.cleanup_expired_assessment_receipts(_retain_claimed_days int DEFAULT 30) RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count int;
BEGIN
  DELETE FROM public.assessment_receipts
    WHERE (saved_decision_id IS NULL AND expires_at < now())
       OR (saved_decision_id IS NOT NULL AND claimed_at < now() - make_interval(days => _retain_claimed_days))
       OR (revoked_at IS NOT NULL AND revoked_at < now() - make_interval(days => _retain_claimed_days));
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END; $$;
REVOKE ALL ON FUNCTION public.cleanup_expired_assessment_receipts(int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_assessment_receipts(int) TO service_role;

CREATE TABLE IF NOT EXISTS public.route_choices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  saved_decision_id uuid NOT NULL REFERENCES public.saved_decisions(id) ON DELETE CASCADE,
  route_id text NOT NULL,
  route_title text NOT NULL,
  eligibility_at_choice text,
  practical_fit_at_choice text,
  chosen_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS route_choices_saved_decision_idx ON public.route_choices (saved_decision_id, chosen_at DESC);
CREATE INDEX IF NOT EXISTS route_choices_user_idx ON public.route_choices (user_id);
ALTER TABLE public.route_choices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS route_choices_select_own ON public.route_choices;
CREATE POLICY route_choices_select_own ON public.route_choices FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS route_choices_insert_own ON public.route_choices;
CREATE POLICY route_choices_insert_own ON public.route_choices FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.saved_decisions sd WHERE sd.id = saved_decision_id AND sd.user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.organisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  join_code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.organisation_members (
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  member_role text NOT NULL CHECK (member_role IN ('adviser','org_admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organisation_id, user_id)
);
CREATE TABLE IF NOT EXISTS public.participant_org_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  participant_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  UNIQUE (organisation_id, participant_user_id)
);
CREATE TABLE IF NOT EXISTS public.decision_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  saved_decision_id uuid NOT NULL REFERENCES public.saved_decisions(id) ON DELETE CASCADE,
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  participant_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  UNIQUE (saved_decision_id, organisation_id)
);
CREATE INDEX IF NOT EXISTS decision_shares_org_idx ON public.decision_shares (organisation_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS participant_org_links_participant_idx ON public.participant_org_links (participant_user_id);
ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participant_org_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS organisations_select_related ON public.organisations;
CREATE POLICY organisations_select_related ON public.organisations FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.organisation_members m WHERE m.organisation_id = id AND m.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.participant_org_links l WHERE l.organisation_id = id AND l.participant_user_id = auth.uid()));

DROP POLICY IF EXISTS organisation_members_select_own_org ON public.organisation_members;
CREATE POLICY organisation_members_select_own_org ON public.organisation_members FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.organisation_members me WHERE me.organisation_id = organisation_id AND me.user_id = auth.uid()));

DROP POLICY IF EXISTS participant_org_links_select_own ON public.participant_org_links;
CREATE POLICY participant_org_links_select_own ON public.participant_org_links FOR SELECT TO authenticated USING (
  participant_user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.organisation_members m WHERE m.organisation_id = organisation_id AND m.user_id = auth.uid()));

DROP POLICY IF EXISTS participant_org_links_revoke_own ON public.participant_org_links;
CREATE POLICY participant_org_links_revoke_own ON public.participant_org_links FOR UPDATE TO authenticated USING (participant_user_id = auth.uid()) WITH CHECK (participant_user_id = auth.uid());

DROP POLICY IF EXISTS decision_shares_insert_own ON public.decision_shares;
CREATE POLICY decision_shares_insert_own ON public.decision_shares FOR INSERT TO authenticated WITH CHECK (
  participant_user_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.saved_decisions sd WHERE sd.id = saved_decision_id AND sd.user_id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.participant_org_links l WHERE l.organisation_id = organisation_id AND l.participant_user_id = auth.uid() AND l.revoked_at IS NULL));

DROP POLICY IF EXISTS decision_shares_select_related ON public.decision_shares;
CREATE POLICY decision_shares_select_related ON public.decision_shares FOR SELECT TO authenticated USING (
  participant_user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.organisation_members m WHERE m.organisation_id = organisation_id AND m.user_id = auth.uid()));

DROP POLICY IF EXISTS decision_shares_revoke_own ON public.decision_shares;
CREATE POLICY decision_shares_revoke_own ON public.decision_shares FOR UPDATE TO authenticated USING (participant_user_id = auth.uid()) WITH CHECK (participant_user_id = auth.uid());

DROP POLICY IF EXISTS saved_decisions_org_shared_read ON public.saved_decisions;
CREATE POLICY saved_decisions_org_shared_read ON public.saved_decisions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.decision_shares s
          JOIN public.participant_org_links l ON l.organisation_id = s.organisation_id AND l.participant_user_id = s.participant_user_id
          JOIN public.organisation_members m ON m.organisation_id = s.organisation_id
          WHERE s.saved_decision_id = saved_decisions.id AND s.revoked_at IS NULL AND l.revoked_at IS NULL AND m.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.join_organisation(_join_code text) RETURNS TABLE (organisation_id uuid, organisation_name text, status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_org public.organisations%ROWTYPE; v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN QUERY SELECT NULL::uuid, NULL::text, 'not_authenticated'::text; RETURN; END IF;
  IF _join_code IS NULL OR length(trim(_join_code)) = 0 THEN RETURN QUERY SELECT NULL::uuid, NULL::text, 'unknown_code'::text; RETURN; END IF;
  SELECT * INTO v_org FROM public.organisations WHERE join_code = trim(_join_code);
  IF NOT FOUND THEN RETURN QUERY SELECT NULL::uuid, NULL::text, 'unknown_code'::text; RETURN; END IF;
  INSERT INTO public.participant_org_links (organisation_id, participant_user_id)
  VALUES (v_org.id, v_uid)
  ON CONFLICT (organisation_id, participant_user_id) DO UPDATE SET revoked_at = NULL;
  RETURN QUERY SELECT v_org.id, v_org.name, 'joined'::text;
END; $$;
REVOKE ALL ON FUNCTION public.join_organisation(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_organisation(text) TO authenticated;