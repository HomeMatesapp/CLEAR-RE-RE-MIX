-- ============================================================================
-- Increment 6: route choice with history (spec §14).
--
-- A participant can choose one of their saved result's routes. Choices are
-- APPEND-ONLY: changing your mind inserts a new row; nothing is updated or
-- deleted, so the history of the decision is preserved. The current choice
-- is simply the latest row for the saved decision.
--
-- RLS: participants insert and read only their own choices, and only against
-- their own saved decisions. No UPDATE or DELETE policies exist — the
-- history cannot be rewritten, by anyone, through the API.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.route_choices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  saved_decision_id uuid NOT NULL REFERENCES public.saved_decisions(id) ON DELETE CASCADE,
  route_id text NOT NULL,
  route_title text NOT NULL,
  -- What the result said about this route at the moment of choosing, copied
  -- from the saved snapshot for honest history (statuses can differ between
  -- assessments; the history should show what the person saw).
  eligibility_at_choice text,
  practical_fit_at_choice text,
  chosen_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.route_choices IS
  'Append-only history of route choices against saved decisions (Increment 6). Current choice = latest row per saved_decision_id.';

CREATE INDEX IF NOT EXISTS route_choices_saved_decision_idx
  ON public.route_choices (saved_decision_id, chosen_at DESC);
CREATE INDEX IF NOT EXISTS route_choices_user_idx
  ON public.route_choices (user_id);

ALTER TABLE public.route_choices ENABLE ROW LEVEL SECURITY;

-- Read own choices.
DROP POLICY IF EXISTS route_choices_select_own ON public.route_choices;
CREATE POLICY route_choices_select_own ON public.route_choices
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Insert own choices, only against own saved decisions.
DROP POLICY IF EXISTS route_choices_insert_own ON public.route_choices;
CREATE POLICY route_choices_insert_own ON public.route_choices
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.saved_decisions sd
      WHERE sd.id = saved_decision_id AND sd.user_id = auth.uid()
    )
  );

-- Deliberately NO update/delete policies: the history is immutable.
