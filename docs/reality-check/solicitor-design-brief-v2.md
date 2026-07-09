# Solicitor Reality Check — Design Brief v2

**Status:** Design only. v2 supersedes v1. Not yet build-approved.
No code, no engine, no taxonomy schema change, no addition to
`FROZEN_DEEP_ROLES`, no UI change, no change to the existing seven
release-hardened Reality Checks.

**What changed from v1:**
1. Added LPC / transitional-route handling — new question
   `lpc_or_legacy_status`, new route `lpc_legacy_transition_route`, new
   caveat copy, new tests.
2. Resolved all six open questions from v1 §13 (see §13 below).
3. Route IDs updated to seven real routes + one bridging outcome.
4. Source categorisation fixed: SRA/SQE = regulation; National Careers =
   overview/pathway; Law Society = optional, deferred.
5. QWE copy tightened — never says QWE is accepted.
6. Character and suitability rules restated as check-topic + caveat only.

**Goal:** Prove Clear Routes can handle a *regulated professional* career with
multiple confusing entry routes, expensive wrong turns, degree / non-degree
ambiguity, SQE, QWE, solicitor apprenticeship, overseas-qualified-lawyer
routes, and the LPC transitional route — without eligibility promises,
character/suitability disclosure questions, or legal advice.

The checker is an **evidence-and-risk checker**, not an eligibility checker.

---

## 0. Hard rules

The checker MUST NEVER say:

- "you are eligible"
- "you will qualify"
- "you can practise"
- "this guarantees qualification"
- "you will get a training contract"
- "you will pass the SQE"
- "your character and suitability is fine"
- "you can qualify under LPC"
- "your LPC counts"
- "your training contract is valid"

The checker MAY say:

- "this route may be structurally relevant"
- "check SRA requirements"
- "qualification is confirmed by the SRA"
- "QWE must meet SRA requirements and be confirmed by an appropriate person
  or organisation"
- "course and SQE costs should be checked before committing"
- "character and suitability is assessed by the SRA; this checker does not ask
  for or assess those details"
- "the LPC route is transitional and time-limited — check SRA rules before
  assuming previous legal study still fits the route"

The checker MUST NOT ask for:

- criminal record / cautions / disciplinary history
- health / disability
- immigration / visa / nationality
- protected characteristics
- exact grades
- exact debt amount

No LLM. All verdicts deterministic. No legal advice.

---

## 1. Taxonomy anchor

| Field | Value |
|---|---|
| `roleSlug` | `solicitor` |
| `roleName` | Solicitor |
| `primaryFamily` | `legal_finance_professional` |
| `routeArchetype` | `regulated_registration_led` |
| Secondary metadata (engine / flavor-local, NOT a schema field) | `mixed_route` |
| `recommendedRealityCheckDepth` (build-time) | `deep_reviewed_reality_check` |
| `engineId` | `solicitor-v1` |
| `questionnaireVersion` | `solicitor-v1` |
| Draft key | `reality-check-draft:solicitor:solicitor-v1` |

No new taxonomy schema field. `FROZEN_DEEP_ROLES` grows 7 → 8 only at build time.

---

## 2. Route IDs

Seven real routes plus one bridging outcome.

| ID | Public name | Purpose |
|---|---|---|
| `sqe_degree_route` | SQE route after degree or equivalent | UK degree / equivalent / strong existing signal |
| `solicitor_apprenticeship_route` | Solicitor apprenticeship | Earn-while-training; employer availability required; SQE still required |
| `law_degree_then_sqe_route` | Law degree then SQE | Academic, degree-led route |
| `non_law_degree_conversion_then_sqe_route` | Non-law degree / conversion preparation then SQE | Non-law grads; conversion not asserted mandatory |
| `paralegal_qwe_then_sqe_route` | Legal work / paralegal experience plus QWE and SQE | Experience-led route |
| `qualified_lawyer_transfer_route` | Qualified lawyer / overseas lawyer route | Verification-led, non-beginner |
| `lpc_legacy_transition_route` | **LPC / transitional route** | **Verification-led; LPC route is transitional and time-limited** |

Bridging-only outcome (never rendered as a normal route card):

- `legal_foundation_bridging` — no Level 3, no degree/equivalent, no legal work
  signal, not a transfer or LPC candidate.

Do NOT create route IDs for: character/suitability, SQE exam prep, QWE
verification, immigration/visa/nationality, training-contract search.

---

## 3. Outcome statuses

Reuse the four existing statuses:

- `route_recommended`
- `qualification_verification_required`
- `bridging_required`
- `insufficient_information`

`qualification_verification_required` is used for:

- overseas / international qualification where equivalence or qualified-lawyer
  status must be checked
- already-qualified lawyer transfer route
- unclear degree/equivalent status where SQE entry comparison cannot be made
- **any LPC / legacy signal where the checker cannot safely assert the LPC
  route still fits under current SRA transitional rules**

It is NOT used for: SQE cost concerns, QWE uncertainty, employer availability,
character/suitability concerns, or general "not sure I want law".

---

## 4. Question set (12 core + 1 check-topic multi-select)

All single-select unless noted. `not_sure` available where meaningful.

1. **`starting_point`** — school_leaver · current_student · graduate_law ·
   graduate_non_law · paralegal_or_legal_support · apprentice_or_legal_admin ·
   qualified_lawyer_overseas_or_other_jurisdiction · career_changer · not_sure
2. **`highest_qualification`** — none · gcse · a_level_or_level_3 ·
   bachelors_law · bachelors_non_law · masters_or_postgraduate ·
   international_degree_or_qualification · professional_legal_qualification ·
   unknown
3. **`legal_experience`** — none · school_or_virtual_work_experience ·
   legal_admin · paralegal · trainee_or_apprentice_legal_role ·
   qualified_lawyer_outside_england_wales · other_professional_client_work ·
   not_sure
4. **`degree_status`** — no_degree · studying_law_degree ·
   studying_non_law_degree · completed_law_degree · completed_non_law_degree ·
   international_degree · unknown
5. **`lpc_or_legacy_status`** *(new in v2)* — not_started_legal_training ·
   started_or_completed_law_degree_before_sqe_transition ·
   completed_gdl_or_pgdl · completed_lpc ·
   started_period_of_recognised_training · not_sure
6. **`sqe_awareness`** — understand_sqe_and_qwe · heard_of_sqe_not_qwe ·
   heard_of_qwe_not_sqe · not_sure
7. **`qwe_signal`** — none · may_have_some_legal_work ·
   employer_can_confirm_qwe · already_confirmed_qwe · not_sure
8. **`training_preference`** — earn_while_training · university_first ·
   shortest_structural_route · build_legal_experience_first · not_sure
9. **`study_time_available`** — full_time_study_possible ·
   part_time_study_possible · evenings_weekends_only · need_to_keep_earning ·
   not_sure
10. **`budget_for_training_and_exams`** — no_budget · under_1000 ·
    1000_to_5000 · 5000_plus · employer_or_sponsor_may_pay · not_sure
    *(Cost-risk caveat only. Never gates eligibility.)*
11. **`jurisdiction_or_transfer_status`** — england_wales_beginner ·
    already_qualified_outside_england_wales ·
    international_qualification_not_sure · not_sure
12. **`route_priorities`** — multi-select, max 3: avoid_debt ·
    earn_while_training · qualify_as_fast_as_possible · build_legal_experience ·
    academic_law_route · flexible_part_time_route · not_sure
13. **`checks_before_committing`** — multi-select, max 4:
    sqe_costs_and_exam_requirements · qwe_confirmation ·
    apprenticeship_availability · course_provider_claims ·
    qualified_lawyer_transfer_requirements ·
    **lpc_transitional_rules** · character_and_suitability_process ·
    none_of_these

Adaptive `visibleWhen` may hide `qwe_signal` and `degree_status` for pure
transfer candidates; `lpc_or_legacy_status` is always shown so legacy learners
are never silently ignored.

---

## 5. Signal shape

```ts
interface SolicitorSignals {
  startingPoint: StartingPoint;
  highestQualification: HighestQualification;
  legalExperience: LegalExperience;
  degreeStatus: DegreeStatus;
  lpcOrLegacyStatus: LpcOrLegacyStatus;         // NEW in v2
  sqeAwareness: SqeAwareness;
  qweSignal: QweSignal;
  trainingPreference: TrainingPreference;
  studyTimeAvailable: StudyTimeAvailable;
  budgetForTrainingAndExams: BudgetBand;
  jurisdictionOrTransferStatus: JurisdictionOrTransferStatus;
  routePriorities: RoutePriority[];             // reorder only
  checksBeforeCommitting: CheckTopic[];         // display only
}
```

Rules:

- No free text affects eligibility.
- Budget never gates eligibility; only cost-risk caveats.
- `checks_before_committing` never affects eligibility.
- Character/suitability is check-only, never assessed.
- `qweSignal` can influence route shape but **must never assert QWE is
  accepted**.
- Apprenticeship route always carries employer-availability caveat and
  SQE-still-required caveat.
- **`lpcOrLegacyStatus` can force verification-led handling but never asserts
  the LPC route still fits under SRA transitional rules.**

---

## 6. Deterministic route logic

### Named helpers

```
hasDegreeOrEquivalentSignal =
  highestQualification ∈ { bachelors_law, bachelors_non_law,
                           masters_or_postgraduate,
                           professional_legal_qualification }
  OR degreeStatus ∈ { completed_law_degree, completed_non_law_degree,
                      international_degree }

hasLawDegreeSignal =
  highestQualification == bachelors_law
  OR degreeStatus ∈ { studying_law_degree, completed_law_degree }

hasNonLawDegreeSignal =
  highestQualification ∈ { bachelors_non_law, masters_or_postgraduate }
  OR degreeStatus ∈ { studying_non_law_degree, completed_non_law_degree }

hasLevel3Signal =
  highestQualification ∈ { a_level_or_level_3, bachelors_law,
                           bachelors_non_law, masters_or_postgraduate,
                           professional_legal_qualification }

hasLegalWorkSignal =
  legalExperience ∈ { legal_admin, paralegal,
                      trainee_or_apprentice_legal_role,
                      qualified_lawyer_outside_england_wales,
                      other_professional_client_work }

hasQweSignal =
  qweSignal ∈ { may_have_some_legal_work, employer_can_confirm_qwe,
                already_confirmed_qwe }

isTransferCandidate =
  startingPoint == qualified_lawyer_overseas_or_other_jurisdiction
  OR legalExperience == qualified_lawyer_outside_england_wales
  OR jurisdictionOrTransferStatus == already_qualified_outside_england_wales
  OR highestQualification == professional_legal_qualification

// NEW in v2
hasLpcOrLegacySignal =
  lpcOrLegacyStatus ∈ { completed_lpc,
                        started_period_of_recognised_training,
                        completed_gdl_or_pgdl,
                        started_or_completed_law_degree_before_sqe_transition }

isLpcCompletedSignal =
  lpcOrLegacyStatus ∈ { completed_lpc,
                        started_period_of_recognised_training }

studyPossible =
  studyTimeAvailable ∈ { full_time_study_possible,
                         part_time_study_possible,
                         evenings_weekends_only }

earnWhileTrainingPreferred =
  trainingPreference == earn_while_training
  OR routePriorities includes earn_while_training
  OR studyTimeAvailable == need_to_keep_earning
```

### Route decisions

**`qualified_lawyer_transfer_route`**
- When `isTransferCandidate`.
- Status: `qualification_verification_required`.
- No recommended/backup cards unless a source clearly supports it.
- Copy: check SRA qualified-lawyer admission / exemption requirements.

**`lpc_legacy_transition_route` (new in v2)**
- When `hasLpcOrLegacySignal`.
- Status: `qualification_verification_required` (investigation-led).
- **Overrides beginner SQE route recommendation** when `isLpcCompletedSignal`
  — SQE beginner route must NOT be primary; SQE degree route may appear as an
  alternative only when SRA transitional rules are noted as needing checking.
- Copy: "The LPC route is transitional and time-limited. Check SRA rules
  before assuming previous legal study still fits the route."
- Never asserts: LPC counts / training contract is valid / user can qualify
  under LPC.

**`solicitor_apprenticeship_route`**
- Structurally relevant when `hasLevel3Signal` AND `earnWhileTrainingPreferred`.
- Caveats: employer/apprenticeship availability required; **SQE assessment
  still required as part of the apprenticeship**; no guarantee of an offer.
- GCSE / no Level 3 → `may_open_later` after Level 3 or equivalent.

**`law_degree_then_sqe_route`**
- Structurally relevant when
  `highestQualification ∈ { gcse, a_level_or_level_3 }` AND
  `trainingPreference ∈ { university_first, not_sure }` AND
  `studyTimeAvailable ∈ { full_time_study_possible, part_time_study_possible }`
  AND NOT `isTransferCandidate` AND NOT `hasLpcOrLegacySignal`.
- GCSE: `may_open_later` if Level 3 / access likely needed first.

**`sqe_degree_route`**
- Structurally relevant when `hasDegreeOrEquivalentSignal` AND NOT
  `isTransferCandidate` AND NOT `isLpcCompletedSignal`.
- If `hasLpcOrLegacySignal` but NOT `isLpcCompletedSignal`, may appear as
  alternative with LPC transitional caveat attached.
- Caveats: SQE assessments, QWE and SRA admission still required; QWE must
  meet SRA rules; degree/equivalent status may need checking.

**`non_law_degree_conversion_then_sqe_route`**
- Structurally relevant when `hasNonLawDegreeSignal` AND NOT
  `isTransferCandidate` AND NOT `isLpcCompletedSignal`.
- Caveat: conversion / preparation can help but is not always formally
  required for SQE; avoid implying GDL / conversion is mandatory unless the
  source supports it.

**`paralegal_qwe_then_sqe_route`**
- Structurally relevant when
  (`hasLegalWorkSignal` OR `hasQweSignal` OR
   `trainingPreference == build_legal_experience_first`)
  AND NOT `isTransferCandidate` AND NOT `isLpcCompletedSignal`.
- Caveats: QWE must be confirmed properly; paralegal work may or may not
  count as QWE depending on role and confirmation; no guarantee of solicitor
  qualification.

**`legal_foundation_bridging` (bridging_required)**
- When: no Level 3 signal AND no degree/equivalent signal AND no legal work
  signal AND not a transfer candidate AND NOT `hasLpcOrLegacySignal` AND
  insufficient route evidence.
- First moves: understand SQE + QWE; explore legal admin / paralegal work;
  check Level 3 / access route; compare solicitor apprenticeship availability;
  read SRA route requirements.
- Never rendered as a normal route card.

---

## 7. Priority reorder

Priorities reorder only. They never open routes and never override the LPC or
transfer verification-led logic.

| Priority | Boosts |
|---|---|
| `avoid_debt` | solicitor_apprenticeship_route, paralegal_qwe_then_sqe_route |
| `earn_while_training` | solicitor_apprenticeship_route, paralegal_qwe_then_sqe_route |
| `qualify_as_fast_as_possible` | sqe_degree_route, qualified_lawyer_transfer_route |
| `build_legal_experience` | paralegal_qwe_then_sqe_route |
| `academic_law_route` | law_degree_then_sqe_route |
| `flexible_part_time_route` | sqe_degree_route, paralegal_qwe_then_sqe_route |

---

## 8. Caveat copy bank

Draft strings (final wording locked at build time):

- **SQE + QWE requirement** — "Qualifying as a solicitor requires passing SQE1
  and SQE2, completing two years of Qualifying Work Experience, and meeting
  the SRA's character and suitability requirements."
- **QWE confirmation** — "QWE must meet SRA requirements and be confirmed by
  an appropriate person or organisation. Paralegal work does not automatically
  count."
- **Solicitor apprenticeship availability** — "Solicitor apprenticeships are
  employer-led and vary by area. SQE assessment is still required as part of
  the apprenticeship. This route is only real if an employer offers one you
  can apply for."
- **Law degree** — "A qualifying law degree is one academic route, but it is
  not the only route to SQE."
- **Non-law degree / conversion** — "A conversion course (PGDL / equivalent)
  can help prepare for SQE1 but is not always formally required. Check SRA
  requirements before paying for a conversion course."
- **Qualified lawyer transfer** — "Already-qualified lawyers from other
  jurisdictions may have a different admission route. Check the SRA qualified
  lawyers guidance directly."
- **LPC / transitional route (new)** — "The LPC route is transitional and
  time-limited. Check SRA rules before assuming previous legal study still
  fits the route."
- **Course / provider claims** — "SQE prep providers vary. Check outcome
  claims, pass-rate methodology, and refund terms before paying."
- **Cost** — "SQE assessment fees, prep-course costs, and living costs during
  QWE add up. Confirm the total cost of your chosen route before committing."
- **Character and suitability** — "The SRA assesses character and suitability
  as part of admission. This checker does not ask for or assess those
  details."
- **Legal advice disclaimer** — "This is route information, not legal advice.
  Confirm any qualification decision with the SRA."

---

## 9. Result behaviour

Reuse `ModularResultView` unchanged.

- **`route_recommended`** — recommended route + up to two alternatives;
  caveats visible; sources panel visible.
- **`qualification_verification_required`** — investigation-led cards only; no
  recommended/backup route cards unless clearly supported; sources panel
  visible. Used for transfer candidates AND for LPC / legacy candidates where
  the checker cannot safely assert LPC still fits.
- **`bridging_required`** — no recommended/backup cards; first moves only;
  sources panel visible.
- **`insufficient_information`** — existing modular behaviour.

---

## 10. Sources

| ID | Category | Purpose |
|---|---|---|
| `sra_sqe_route` | regulation | SRA: how to become a solicitor via SQE |
| `sqe_official_requirements` | regulation | SQE official site: what SQE involves |
| `sra_qualifying_work_experience` | regulation | SRA: QWE guidance (two years FTE, appropriate sign-off) |
| `sra_solicitor_apprenticeship` | regulation | SRA / gov.uk apprenticeship standard |
| `sra_qualified_lawyers` | regulation | SRA: qualified / overseas lawyer admission |
| `sra_lpc_transitional_arrangements` | regulation | **NEW** — SRA: LPC / transitional-route rules |
| `national_careers_solicitor` | overview / pathway | Plain-English career profile |
| `law_society_becoming_a_solicitor` | optional (deferred) | Plain-English explainer, not authority |

Do NOT cite: individual SQE prep providers as authority, course marketing
pages, law-firm recruitment pages as national route authority, or training-
contract adverts.

---

## 11. Test plan (design ahead of build)

### Route logic
- Transfer candidate → `qualification_verification_required` /
  qualified-lawyer transfer investigation.
- International or `professional_legal_qualification` → does NOT get standard
  beginner route as primary.
- **`completed_lpc` → LPC route is investigation-led / verification-led and
  SQE beginner route is NOT primary.**
- **`started_period_of_recognised_training` → LPC route is verification-led
  and SQE beginner route is NOT primary.**
- **`completed_gdl_or_pgdl` → LPC route surfaces as verification-led; SQE
  route may appear only as alternative with LPC transitional caveat.**
- Level 3 + earn-while-training → solicitor apprenticeship structurally
  relevant.
- GCSE-only, no experience → `bridging_required`.
- GCSE-only → does NOT get law degree as direct route without Level 3 / access
  caveat.
- Completed law degree → SQE degree route structurally relevant (when no LPC
  or transfer signal).
- Completed non-law degree → non-law degree / conversion + SQE route relevant
  (when no LPC or transfer signal).
- Legal admin / paralegal / QWE signal → paralegal QWE route relevant.
- **QWE signal → copy never says QWE is accepted.**
- Budget → never affects eligibility.
- `checks_before_committing` → never affects eligibility.
- Priorities → reorder only, never open a route.
- `legal_foundation_bridging` → never rendered as a route card.

### Safety / copy scan
Forbidden phrases (case-insensitive, whole-phrase):

- "you are eligible"
- "you will qualify"
- "you can practise"
- "guarantees qualification"
- "you will get a training contract"
- "you will pass the SQE"
- "character and suitability is fine"
- "you can qualify under LPC"
- "your LPC counts"
- "your training contract is valid"

Required behaviours:

- No criminal-record / caution / disciplinary / health / disability /
  immigration / visa / nationality disclosure questions.
- Character / suitability appears only as a process caveat / check topic.
- QWE copy always says "must be confirmed" / "check SRA requirements".
- Apprenticeship copy always says "employer availability required" and
  "SQE assessment still required".
- **LPC copy always says the route is transitional and time-limited; never
  asserts LPC guarantees qualification.**

### Sources
- Every non-`insufficient_information` result has an SRA or SQE source.
- QWE-relevant route has SRA QWE source.
- Apprenticeship route has apprenticeship source.
- Transfer route has SRA qualified-lawyer source.
- **LPC route has SRA LPC transitional-arrangements source.**
- National Careers visible as plain-English explainer.

### Regression
- Existing seven release-hardened roles unchanged (Vitest baseline 536/536
  remains green modulo new tests).
- `FROZEN_DEEP_ROLES` grows 7 → 8 only at build time.
- slug / version / draft-key consistency.
- TS ↔ Deno parity fixture planned: `shared/reality-check/solicitor-cases.json`
  + `_solicitor_test.ts`, mirroring the existing seven roles.

---

## 12. Out of scope

- Barrister, legal executive (CILEX), licensed conveyancer, notary.
- Paralegal as a *final destination* career.
- Specific law-firm applications, training-contract rankings.
- SQE prep-provider recommendations.
- Immigration / visa advice.
- Legal advice.
- Practising outside England and Wales, except the transfer caveat.
- Character / suitability assessment.
- Exact costs or provider price comparisons.

---

## 13. Resolved decisions (from v1 §13)

1. **Slug / versioning** — confirmed `solicitor`, `solicitor-v1`,
   `reality-check-draft:solicitor:solicitor-v1`. Alias-collision check to run
   at build time as a pre-flight assertion (no schema change).
2. **Taxonomy** — `primaryFamily: legal_finance_professional`,
   `routeArchetype: regulated_registration_led`. `mixed_route` kept
   engine/flavor-local. No secondary taxonomy schema field added.
3. **Sources** — SRA / SQE / QWE / apprenticeship / qualified-lawyer /
   **LPC transitional-arrangements** categorised as `regulation`. National
   Careers categorised as `overview` / `pathway`. Law Society deferred.
4. **Qualified lawyer / overseas route** — remains verification-led. Beginner
   routes never primary for transfer candidates. App says "check SRA
   requirements"; does not decide the route.
5. **Character and suitability** — check topic and caveat only. No disclosure
   questions. Fixed copy: "The SRA assesses character and suitability as part
   of admission. This checker does not ask for or assess those details."
6. **Apprenticeship route** — retained; caveats both employer availability
   and "SQE assessment still required".

---

## 14. Completion report

**Deliverable:** Solicitor Design Brief v2.

- Confirmed slug: `solicitor`.
- Taxonomy anchor: §1.
- Route IDs: §2 (7 real + 1 bridging; **`lpc_legacy_transition_route` added**).
- Question set: §4 (12 core + 1 check-topic multi-select; **`lpc_or_legacy_status`
  added; `lpc_transitional_rules` added as a check topic**).
- Signal shape: §5 (**`lpcOrLegacyStatus` added**).
- Route logic: §6 (**LPC / legacy handling added; overrides beginner SQE
  routes when LPC-completed**).
- Caveat copy: §8 (**LPC caveat added; forbidden LPC phrases added to §0**).
- Sources: §10 (**`sra_lpc_transitional_arrangements` added; categories
  applied**).
- Result behaviour: §9.
- Draft key / version: `reality-check-draft:solicitor:solicitor-v1`,
  `engineId: solicitor-v1`, `questionnaireVersion: solicitor-v1`.
- Test plan: §11 (**LPC route tests, LPC forbidden-phrase scan, and LPC
  source assertion added**).
- Open questions from v1: all resolved (§13).

Ready for build-approval review.
