ALTER TABLE public.saved_decisions
  ADD COLUMN IF NOT EXISTS answer_schema_version integer,
  ADD COLUMN IF NOT EXISTS questionnaire_version text,
  ADD COLUMN IF NOT EXISTS answer_snapshot jsonb;