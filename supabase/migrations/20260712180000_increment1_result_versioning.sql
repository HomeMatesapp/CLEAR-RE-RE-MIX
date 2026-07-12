-- Increment 1: result-contract versioning on saved decisions.
--
-- Additive and backfill-safe. NULL result_schema_version means the snapshot
-- predates versioned contracts and is read as "legacy" by
-- src/lib/reality-check/result-snapshot.ts. Existing rows are NOT rewritten:
-- historical participant results are immutable.

ALTER TABLE public.saved_decisions
  ADD COLUMN IF NOT EXISTS result_schema_version text,
  ADD COLUMN IF NOT EXISTS pack_version text;

COMMENT ON COLUMN public.saved_decisions.result_schema_version IS
  'Schema version of result_snapshot (e.g. reality-check-result/v2). NULL = pre-versioned legacy snapshot.';
COMMENT ON COLUMN public.saved_decisions.pack_version IS
  'Career pack semver the result was evaluated against, when sourceKind = career_pack. NULL for legacy engines and pre-Increment-1 rows.';
