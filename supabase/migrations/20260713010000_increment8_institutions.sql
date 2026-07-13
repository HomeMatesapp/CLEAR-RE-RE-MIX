-- ============================================================================
-- Increment 8: institutional foundation — consent-first sharing.
--
-- Model:
--   organisations            — a college, service or charity, with a join code
--   organisation_members     — advisers / org admins (managed by service role
--                              for now; no self-service admin UI yet)
--   participant_org_links    — a participant's connection to an organisation,
--                              created BY THE PARTICIPANT via join code,
--                              revocable by the participant at any time
--   decision_shares          — per-decision grants: the participant shares a
--                              SPECIFIC saved decision with a SPECIFIC
--                              organisation; revocable at any time
--
-- Consent rules enforced in RLS, not application code:
--   • An adviser sees NOTHING about a participant by default.
--   • An adviser can read a saved decision only while BOTH the link and the
--     specific share are active (unrevoked).
--   • Only the participant can create links and shares; only they can revoke
--     them. Organisation membership grants no write access to participant
--     data whatsoever.
--   • Joining uses a SECURITY DEFINER function so the organisations table
--     never needs a public SELECT policy for code lookup.
-- ============================================================================

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

-- ── organisations ────────────────────────────────────────────────────────────
-- Visible to members and to linked participants (so the participant can see
-- the name of what they've joined). Never listable publicly.
DROP POLICY IF EXISTS organisations_select_related ON public.organisations;
CREATE POLICY organisations_select_related ON public.organisations
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.organisation_members m
            WHERE m.organisation_id = id AND m.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.participant_org_links l
               WHERE l.organisation_id = id AND l.participant_user_id = auth.uid())
  );

-- ── organisation_members ─────────────────────────────────────────────────────
-- Members can see their organisation's member list; managed by service role.
DROP POLICY IF EXISTS organisation_members_select_own_org ON public.organisation_members;
CREATE POLICY organisation_members_select_own_org ON public.organisation_members
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.organisation_members me
            WHERE me.organisation_id = organisation_id AND me.user_id = auth.uid())
  );

-- ── participant_org_links ────────────────────────────────────────────────────
-- Participant reads and revokes their own links. Creation goes through
-- join_organisation() only. Advisers see active links to their organisation
-- (the fact of a connection, nothing else).
DROP POLICY IF EXISTS participant_org_links_select_own ON public.participant_org_links;
CREATE POLICY participant_org_links_select_own ON public.participant_org_links
  FOR SELECT TO authenticated
  USING (
    participant_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.organisation_members m
               WHERE m.organisation_id = organisation_id AND m.user_id = auth.uid())
  );

DROP POLICY IF EXISTS participant_org_links_revoke_own ON public.participant_org_links;
CREATE POLICY participant_org_links_revoke_own ON public.participant_org_links
  FOR UPDATE TO authenticated
  USING (participant_user_id = auth.uid())
  WITH CHECK (participant_user_id = auth.uid());

-- ── decision_shares ──────────────────────────────────────────────────────────
-- Participant creates shares only for their own decisions, only to
-- organisations they hold an ACTIVE link with; reads and revokes their own.
-- Advisers see active shares to their organisation.
DROP POLICY IF EXISTS decision_shares_insert_own ON public.decision_shares;
CREATE POLICY decision_shares_insert_own ON public.decision_shares
  FOR INSERT TO authenticated
  WITH CHECK (
    participant_user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.saved_decisions sd
                WHERE sd.id = saved_decision_id AND sd.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.participant_org_links l
                WHERE l.organisation_id = organisation_id
                  AND l.participant_user_id = auth.uid()
                  AND l.revoked_at IS NULL)
  );

DROP POLICY IF EXISTS decision_shares_select_related ON public.decision_shares;
CREATE POLICY decision_shares_select_related ON public.decision_shares
  FOR SELECT TO authenticated
  USING (
    participant_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.organisation_members m
               WHERE m.organisation_id = organisation_id AND m.user_id = auth.uid())
  );

DROP POLICY IF EXISTS decision_shares_revoke_own ON public.decision_shares;
CREATE POLICY decision_shares_revoke_own ON public.decision_shares
  FOR UPDATE TO authenticated
  USING (participant_user_id = auth.uid())
  WITH CHECK (participant_user_id = auth.uid());

-- ── saved_decisions: the consent-gated adviser read ──────────────────────────
-- Additive policy. An organisation member can read a participant's saved
-- decision ONLY while a share for that exact decision AND the participant's
-- link to that organisation are both active. Revoking either side severs
-- access instantly. No write access of any kind is granted.
DROP POLICY IF EXISTS saved_decisions_org_shared_read ON public.saved_decisions;
CREATE POLICY saved_decisions_org_shared_read ON public.saved_decisions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.decision_shares s
      JOIN public.participant_org_links l
        ON l.organisation_id = s.organisation_id
       AND l.participant_user_id = s.participant_user_id
      JOIN public.organisation_members m
        ON m.organisation_id = s.organisation_id
      WHERE s.saved_decision_id = saved_decisions.id
        AND s.revoked_at IS NULL
        AND l.revoked_at IS NULL
        AND m.user_id = auth.uid()
    )
  );

-- ── Joining by code ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.join_organisation(_join_code text)
RETURNS TABLE (organisation_id uuid, organisation_name text, status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org public.organisations%ROWTYPE;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, 'not_authenticated'::text; RETURN;
  END IF;
  IF _join_code IS NULL OR length(trim(_join_code)) = 0 THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, 'unknown_code'::text; RETURN;
  END IF;

  SELECT * INTO v_org FROM public.organisations WHERE join_code = trim(_join_code);
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, 'unknown_code'::text; RETURN;
  END IF;

  INSERT INTO public.participant_org_links (organisation_id, participant_user_id)
  VALUES (v_org.id, v_uid)
  ON CONFLICT (organisation_id, participant_user_id)
  DO UPDATE SET revoked_at = NULL;

  RETURN QUERY SELECT v_org.id, v_org.name, 'joined'::text;
END;
$$;
REVOKE ALL ON FUNCTION public.join_organisation(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_organisation(text) TO authenticated;
