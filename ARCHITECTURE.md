# Clear Routes — Architecture and Increment Record

*Last updated: 2026-07-13 (end of Increment 11). This document lives in the
repo so the project's memory doesn't depend on any one conversation, person
or machine. Update it when an increment lands.*

## What the platform is

Clear Routes gives people an honest, evidence-backed answer to "which routes
into this career are currently open to me, and what would it practically
take?" — for England, with sources cited, and with two findings that are
never merged:

- **Formal eligibility** — do the entry conditions appear to be in place?
- **Practical fit** — did time, money or schedule constraints get flagged?

Money can never change eligibility. Unknowns are reported as unknowns, with
concrete checks — never guessed in either direction. No probability
language, ever (`FORBIDDEN_LANGUAGE` is enforced by tests at every layer).

## The spine (how a decision flows)

```
career pack (JSON, versioned, evidence-cited)
        │  careerDecisionPackV1 schema + validatePackCrossRefs
        │  validatePublicationGates (renderability, assessability, evidence)
        ▼
reality-check edge function (server resolves the bound pack; client never
picks a pack)                                [supabase/functions/reality-check]
   ├─ mode: "questionnaire" → renderable questions only
   └─ evaluation → V1 (current UI) + V2 (standard contract) from ONE run,
      plus an opaque assessment receipt (browser never submits results)
        ▼
save-decision edge function → claim_receipt_and_save_decision RPC
  (idempotent, cross-user-rejecting, FOR UPDATE serialised; copies the
   server-held snapshots + display fields into saved_decisions)
        ▼
participant surfaces: GenericPackWizard → ResultV2View (+ CompareRoutesTable)
→ MyRoute / MyDecisions (versioned snapshot reader; RouteChoiceSection;
DecisionSharingPanel) 
```

The eight reviewed legacy engines (electrician, plumber, heating engineer,
software engineer, registered nurse, police officer, actor, solicitor) attach
the same V2 contract via `legacyEngineOutputToResultV2` — same decision, two
lenses — and their result screen offers a Classic/Standard toggle.

## Key modules

| Concern | Where |
|---|---|
| Pack schema, cross-refs, publication gates | `supabase/functions/_shared/career-evaluator/v1/schema.ts` |
| Evaluator (V1 preserved; V2 tri-state) | `…/evaluate.ts` |
| Standard contract + Zod | `…/result-v2.ts` |
| Legacy engine adapter | `…/legacy-adapter.ts` |
| Versioned snapshot reading | `src/lib/reality-check/result-snapshot.ts` |
| Generic pack client (questionnaire, visibility, evaluation) | `src/lib/reality-check/generic-pack/api.ts` |
| Saved-decision derivation for list surfaces | `src/lib/reality-check/saved-decision-view.ts` |
| Route choice (append-only) | `src/lib/route-choice.ts` + `route_choices` table |
| Institutional consent model | migration `20260713010000` + `src/lib/institutions.ts` |
| Pack validation CLI | `bun run scripts/validate-pack.ts <pack.json>` |
| Publish pipeline | `bun run scripts/publish-career-pack.ts` → `publish-career-pack` fn |

## Adding a career (the whole point)

1. Verify route facts against primary sources; note URLs and dates.
2. Author `content/career-packs/<slug>/<semver>.json` — use
   `social-worker/1.0.0.json` as the reference for the full DSL
   (machineRules, unknown-marks, flag_constraint, visibleWhen, options).
3. `bun run scripts/validate-pack.ts content/career-packs/<slug>/<v>.json`
   until clean — this runs schema, cross-refs, publication gates, all 12+
   profiles through both contracts, expectations, and language scans.
4. Set `roleId` to the live role's UUID; get an editorial review (a named
   human in `contentReview.reviewerDisplayName`).
5. Publish via the pipeline; the wizard serves it with zero code changes.

## Increment record

| # | Delivered | Verification |
|---|---|---|
| 1 | V2 contract, extended DSL, legacy adapters, snapshot versioning, publication gates | byte-identical V1 parity fixture (12 profiles); 52 tests |
| 2 | V2 served + persisted through the receipt/claim pipeline; Increment 1 tests restored to the suite | 5 DB-free Deno handler tests executed; RPC replaced |
| 3 | Question render metadata; midwife 1.1.0 (gate-passing, decision-identical); questionnaire mode; wizard; ResultV2View; gate opened | 14 tests incl. wizard click-through; 2 Deno tests |
| 4 | Saved generic rows render properly (RPC derives display fields; snapshot-reader dispatch in MyRoute/MyDecisions) | 3 tests + extended DB matrix |
| 5 | Compare Routes; saved-result detail view | 4 tests |
| 6 | Route choice with append-only history (`route_choices`) | 4 tests |
| 7 | Social worker pack — second career, first full-DSL content, zero code | 14 tests; sources verified same-day |
| 8 | Institutional foundation: consent-first sharing, participant side | 5 tests; **RLS unexecuted → see gates** |
| 9 | Executable 11-test hostile RLS matrix; "Pursuing" on MyDecisions | matrix DB-bound; 2 tests run |
| 10 | Convergence step 1: all 8 engines attach V2; Classic/Standard toggle | 5 tests incl. decision-identity |
| 11 | Pack validation CLI; vendor chunk split (1.77 MB → 1.28 MB main); this document | 5 tests incl. mutation checks |

Suite at end of Increment 11: **735 vitest tests**, tsc clean, build green.

## Open gates (do not skip)

1. **RLS matrix must run green** (`_institutions_rls_test.ts`, live harness)
   **before any adviser-facing UI is built.**
2. **Convergence step 2** (standard view becomes default; classic retired)
   only after a human compares both views in a browser across the 8 careers.
3. **Pack publication** requires: real `roleId`, named human editorial
   reviewer, validation CLI clean.
4. Migrations pending on the live database: increments 2, 4, 6, 8.
5. DB-bound suites pending in the live harness: `_pr3a_test.ts` (3a-11) and
   `_institutions_rls_test.ts`.

## Known debts

- `src/integrations/supabase/types.ts` is stale (regenerate with the
  Supabase CLI; kills the narrow-casts in institutions/route-choice code).
- Actor and solicitor adapters pass empty flavor labels to V2 (their caveats
  are inlined); polish in convergence step 2.
- Expired assessment receipts accumulate; add a cleanup job when the
  environment exists.
- Route-level code splitting (beyond vendor chunks) not yet done.
