// Solicitor deterministic route engine — v1 (Design Brief v2).
//
// Runtime-neutral. Deno mirror at supabase/functions/reality-check/_solicitor.ts
// kept identical via shared/reality-check/solicitor-cases.json.
//
// Contract (per Design Brief v2):
//   - Seven real route IDs. `legal_foundation_bridging` is a bridging OUTCOME
//     — never a route card.
//   - `qualification_verification_required` is used for qualified-lawyer /
//     overseas / LPC / legacy cases where route confirmation must go through
//     the SRA. No route card is fabricated for the verification itself.
//   - `qualified_lawyer_transfer_route` and `lpc_legacy_transition_route`
//     are verification-led; beginner SQE routes are NEVER primary for a
//     transfer candidate or an LPC-completed / period-of-recognised-training
//     signal.
//   - `qweSignal` may shape routes but copy NEVER asserts QWE is accepted.
//   - `solicitor_apprenticeship_route` always carries employer-availability
//     caveat AND "SQE assessment still required".
//   - `budgetForTrainingAndExams` NEVER gates eligibility.
//   - `checksBeforeCommitting` NEVER gates eligibility.
//   - `character_and_suitability_process` is a check topic only — never a
//     disclosure. The engine never asks and never asserts.
//   - No promise language. No legal advice.

import type { SolicitorSignals } from "../questionnaire/signals";

export type SolicitorRouteId =
  | "sqe_degree_route"
  | "solicitor_apprenticeship_route"
  | "law_degree_then_sqe_route"
  | "non_law_degree_conversion_then_sqe_route"
  | "paralegal_qwe_then_sqe_route"
  | "qualified_lawyer_transfer_route"
  | "lpc_legacy_transition_route";

export type SolicitorOutcomeStatus =
  | "route_recommended"
  | "qualification_verification_required"
  | "bridging_required"
  | "insufficient_information";

export interface SolicitorRouteEvaluation {
  id: SolicitorRouteId;
  displayTitle: string;
  eligible: boolean;
  affordability: { affordable: boolean; notes: string[] };
  rankingScore: number;
  blockersAndChecks: string[];
  immediateAction: string;
  evidenceNote: string;
}

export interface SolicitorEngineOutput {
  status: SolicitorOutcomeStatus;
  recommendedRouteId: SolicitorRouteId | null;
  alternativeRouteIds: SolicitorRouteId[];
  affordabilityNotes: string[];
  considerations: string[];
  blockersAndChecks: string[];
  immediateAction: string;
  evidenceNotes: string[];
  routeEvaluations: SolicitorRouteEvaluation[];
  missingSignals: string[];
  /** Verification-led primary route for the qualification_verification_required
   *  status (e.g. LPC or qualified-lawyer transfer). Null for transfer where
   *  no route card should be fabricated. */
  verificationPrimaryRouteId: SolicitorRouteId | null;
  /** Routes that may become relevant after a verification / bridging step. */
  mayOpenLaterRouteIds: SolicitorRouteId[];
  /** True when the verification path is a qualified-lawyer transfer — no
   *  route card is rendered by the adapter for the transfer itself. */
  isTransferVerification: boolean;
  /** True when the verification path is LPC/legacy transitional. */
  isLpcVerification: boolean;
}

export interface SolicitorEngineInput {
  signals: SolicitorSignals;
  region?: string | null;
  serviceLevel?: string | null;
  role?: { role_slug?: string; role_name?: string } | null;
}

export const ROUTE_TITLES: Record<SolicitorRouteId, string> = {
  sqe_degree_route: "SQE route after degree or equivalent",
  solicitor_apprenticeship_route: "Solicitor apprenticeship",
  law_degree_then_sqe_route: "Law degree then SQE",
  non_law_degree_conversion_then_sqe_route:
    "Non-law degree / conversion preparation then SQE",
  paralegal_qwe_then_sqe_route:
    "Legal work / paralegal experience plus QWE and SQE",
  qualified_lawyer_transfer_route:
    "Qualified lawyer / overseas lawyer route",
  lpc_legacy_transition_route: "LPC / transitional route",
};

const EVIDENCE_NOTES: Record<SolicitorRouteId, string> = {
  sqe_degree_route:
    "SQE1 and SQE2, two years of QWE and the SRA's character and suitability requirements all apply. The SRA is the authority — this checker never confirms admission.",
  solicitor_apprenticeship_route:
    "Solicitor apprenticeships are employer-led. SQE assessment is still required as part of the apprenticeship. Availability varies by employer and area.",
  law_degree_then_sqe_route:
    "A qualifying law degree is one academic route into SQE. It does not remove the SQE, QWE or SRA admission requirements.",
  non_law_degree_conversion_then_sqe_route:
    "A conversion course (PGDL / equivalent) can help prepare for SQE1. It is not always formally required — check SRA requirements before paying for a conversion course.",
  paralegal_qwe_then_sqe_route:
    "Paralegal or legal-support work may build QWE, but QWE must meet SRA requirements and be confirmed by an appropriate person or organisation.",
  qualified_lawyer_transfer_route:
    "Already-qualified lawyers from other jurisdictions may have a different admission route. Check the SRA qualified-lawyer / exemption rules directly.",
  lpc_legacy_transition_route:
    "The LPC route is transitional and time-limited. Check SRA rules before assuming previous legal study still fits the route.",
};

// ── Helpers (fully parenthesised, named) ────────────────────────────────────

const DEGREE_OR_EQUIVALENT_QUALS = new Set([
  "bachelors_law",
  "bachelors_non_law",
  "masters_or_postgraduate",
  "professional_legal_qualification",
] as const);

const DEGREE_OR_EQUIVALENT_STATUSES = new Set([
  "completed_law_degree",
  "completed_non_law_degree",
  "international_degree",
] as const);

const LAW_DEGREE_QUALS = new Set(["bachelors_law"] as const);
const LAW_DEGREE_STATUSES = new Set([
  "studying_law_degree",
  "completed_law_degree",
] as const);

const NON_LAW_DEGREE_QUALS = new Set([
  "bachelors_non_law",
  "masters_or_postgraduate",
] as const);
const NON_LAW_DEGREE_STATUSES = new Set([
  "studying_non_law_degree",
  "completed_non_law_degree",
] as const);

const LEVEL_3_QUALS = new Set([
  "a_level_or_level_3",
  "bachelors_law",
  "bachelors_non_law",
  "masters_or_postgraduate",
  "professional_legal_qualification",
] as const);

const LEGAL_WORK_SIGNALS = new Set([
  "legal_admin",
  "paralegal",
  "trainee_or_apprentice_legal_role",
  "qualified_lawyer_outside_england_wales",
  "other_professional_client_work",
] as const);

const QWE_SIGNAL_PRESENT = new Set([
  "may_have_some_legal_work",
  "employer_can_confirm_qwe",
  "already_confirmed_qwe",
] as const);

const STUDY_POSSIBLE = new Set([
  "full_time_study_possible",
  "part_time_study_possible",
  "evenings_weekends_only",
] as const);

const LPC_ANY = new Set([
  "started_or_completed_law_degree_before_sqe_transition",
  "completed_gdl_or_pgdl",
  "completed_lpc",
  "started_period_of_recognised_training",
] as const);

const LPC_COMPLETED = new Set([
  "completed_lpc",
  "started_period_of_recognised_training",
] as const);

export const hasDegreeOrEquivalentSignal = (s: SolicitorSignals): boolean =>
  (s.highestQualification !== null &&
    (DEGREE_OR_EQUIVALENT_QUALS as ReadonlySet<string>).has(
      s.highestQualification,
    )) ||
  (s.degreeStatus !== null &&
    (DEGREE_OR_EQUIVALENT_STATUSES as ReadonlySet<string>).has(s.degreeStatus));

export const hasLawDegreeSignal = (s: SolicitorSignals): boolean =>
  (s.highestQualification !== null &&
    (LAW_DEGREE_QUALS as ReadonlySet<string>).has(s.highestQualification)) ||
  (s.degreeStatus !== null &&
    (LAW_DEGREE_STATUSES as ReadonlySet<string>).has(s.degreeStatus));

export const hasNonLawDegreeSignal = (s: SolicitorSignals): boolean =>
  (s.highestQualification !== null &&
    (NON_LAW_DEGREE_QUALS as ReadonlySet<string>).has(s.highestQualification)) ||
  (s.degreeStatus !== null &&
    (NON_LAW_DEGREE_STATUSES as ReadonlySet<string>).has(s.degreeStatus));

export const hasLevel3Signal = (s: SolicitorSignals): boolean =>
  s.highestQualification !== null &&
  (LEVEL_3_QUALS as ReadonlySet<string>).has(s.highestQualification);

export const hasLegalWorkSignal = (s: SolicitorSignals): boolean =>
  s.legalExperience !== null &&
  (LEGAL_WORK_SIGNALS as ReadonlySet<string>).has(s.legalExperience);

export const hasQweSignal = (s: SolicitorSignals): boolean =>
  s.qweSignal !== null &&
  (QWE_SIGNAL_PRESENT as ReadonlySet<string>).has(s.qweSignal);

export const isTransferCandidate = (s: SolicitorSignals): boolean =>
  s.startingPoint === "qualified_lawyer_overseas_or_other_jurisdiction" ||
  s.legalExperience === "qualified_lawyer_outside_england_wales" ||
  s.jurisdictionOrTransferStatus === "already_qualified_outside_england_wales" ||
  s.highestQualification === "professional_legal_qualification";

export const hasLpcOrLegacySignal = (s: SolicitorSignals): boolean =>
  s.lpcOrLegacyStatus !== null &&
  (LPC_ANY as ReadonlySet<string>).has(s.lpcOrLegacyStatus);

export const isLpcCompletedSignal = (s: SolicitorSignals): boolean =>
  s.lpcOrLegacyStatus !== null &&
  (LPC_COMPLETED as ReadonlySet<string>).has(s.lpcOrLegacyStatus);

export const studyPossible = (s: SolicitorSignals): boolean =>
  s.studyTimeAvailable !== null &&
  (STUDY_POSSIBLE as ReadonlySet<string>).has(s.studyTimeAvailable);

export const earnWhileTrainingPreferred = (s: SolicitorSignals): boolean =>
  s.trainingPreference === "earn_while_training" ||
  s.routePriorities.includes("earn_while_training") ||
  s.studyTimeAvailable === "need_to_keep_earning";

// ── Eligibility predicates ─────────────────────────────────────────────────

const isSqeDegreeEligible = (s: SolicitorSignals): boolean =>
  hasDegreeOrEquivalentSignal(s) &&
  !isTransferCandidate(s) &&
  !isLpcCompletedSignal(s);

const isSolicitorApprenticeshipEligible = (s: SolicitorSignals): boolean =>
  hasLevel3Signal(s) &&
  earnWhileTrainingPreferred(s) &&
  !isTransferCandidate(s) &&
  !isLpcCompletedSignal(s);

const isLawDegreeThenSqeEligible = (s: SolicitorSignals): boolean =>
  (s.highestQualification === "gcse" ||
    s.highestQualification === "a_level_or_level_3") &&
  (s.trainingPreference === "university_first" ||
    s.trainingPreference === "not_sure") &&
  (s.studyTimeAvailable === "full_time_study_possible" ||
    s.studyTimeAvailable === "part_time_study_possible") &&
  !isTransferCandidate(s) &&
  !hasLpcOrLegacySignal(s);

const isNonLawConversionEligible = (s: SolicitorSignals): boolean =>
  hasNonLawDegreeSignal(s) &&
  !isTransferCandidate(s) &&
  !isLpcCompletedSignal(s);

const isParalegalQweEligible = (s: SolicitorSignals): boolean =>
  (hasLegalWorkSignal(s) ||
    hasQweSignal(s) ||
    s.trainingPreference === "build_legal_experience_first") &&
  !isTransferCandidate(s) &&
  !isLpcCompletedSignal(s);

const isQualifiedLawyerTransferEligible = (s: SolicitorSignals): boolean =>
  isTransferCandidate(s);

const isLpcLegacyTransitionEligible = (s: SolicitorSignals): boolean =>
  hasLpcOrLegacySignal(s);

// ── Affordability (budget informs COPY only, never eligibility) ─────────────

const AFFORDABILITY_NOTES: Record<SolicitorRouteId, string> = {
  sqe_degree_route:
    "SQE assessment fees, prep-course costs and living costs during QWE add up. Confirm total cost before committing.",
  solicitor_apprenticeship_route:
    "Solicitor apprenticeships are paid — employer-funded via the apprenticeship levy. Confirm the specific offer with the employer.",
  law_degree_then_sqe_route:
    "UK undergraduate tuition is loan-funded via GOV.UK Student Finance. SQE fees apply after graduation.",
  non_law_degree_conversion_then_sqe_route:
    "Conversion courses vary widely in cost. SQE fees apply after conversion. Check the SRA requirements before paying for a conversion course.",
  paralegal_qwe_then_sqe_route:
    "Paralegal work is usually paid. SQE prep and exam fees apply separately.",
  qualified_lawyer_transfer_route:
    "Fees and exemptions depend on jurisdiction. Check SRA qualified-lawyer guidance for the current cost profile.",
  lpc_legacy_transition_route:
    "Costs depend on what you've already completed. Check SRA transitional guidance before assuming previous fees still count.",
};

const affordabilityFor = (id: SolicitorRouteId) => ({
  affordable: true,
  notes: [AFFORDABILITY_NOTES[id]],
});

// ── Ranking ─────────────────────────────────────────────────────────────────

const baseScore = (id: SolicitorRouteId): number => {
  switch (id) {
    case "sqe_degree_route": return 92;
    case "solicitor_apprenticeship_route": return 90;
    case "paralegal_qwe_then_sqe_route": return 88;
    case "non_law_degree_conversion_then_sqe_route": return 86;
    case "law_degree_then_sqe_route": return 84;
    case "qualified_lawyer_transfer_route": return 100;
    case "lpc_legacy_transition_route": return 100;
  }
};

const priorityBonus = (id: SolicitorRouteId, s: SolicitorSignals): number => {
  let b = 0;
  const pr = s.routePriorities;
  if (pr.includes("avoid_debt")) {
    if (id === "solicitor_apprenticeship_route") b += 12;
    if (id === "paralegal_qwe_then_sqe_route") b += 8;
  }
  if (pr.includes("earn_while_training")) {
    if (id === "solicitor_apprenticeship_route") b += 12;
    if (id === "paralegal_qwe_then_sqe_route") b += 6;
  }
  if (pr.includes("qualify_as_fast_as_possible")) {
    if (id === "sqe_degree_route") b += 12;
    if (id === "qualified_lawyer_transfer_route") b += 6;
  }
  if (pr.includes("build_legal_experience")) {
    if (id === "paralegal_qwe_then_sqe_route") b += 12;
  }
  if (pr.includes("academic_law_route")) {
    if (id === "law_degree_then_sqe_route") b += 12;
  }
  if (pr.includes("flexible_part_time_route")) {
    if (id === "sqe_degree_route") b += 6;
    if (id === "paralegal_qwe_then_sqe_route") b += 6;
  }
  if (s.trainingPreference === "earn_while_training" &&
      id === "solicitor_apprenticeship_route") b += 6;
  if (s.trainingPreference === "shortest_structural_route" &&
      id === "sqe_degree_route") b += 4;
  return b;
};

// ── Blockers / immediate action ─────────────────────────────────────────────

const routeBlockers = (id: SolicitorRouteId): string[] => {
  switch (id) {
    case "sqe_degree_route":
      return [
        "SQE1 and SQE2 assessments, two years of QWE and the SRA's character and suitability requirements all apply. The SRA is the authority.",
        "QWE must meet SRA requirements and be confirmed by an appropriate person or organisation.",
      ];
    case "solicitor_apprenticeship_route":
      return [
        "Solicitor apprenticeships are employer-led. This route is only real if an employer offers one you can apply for.",
        "SQE assessment is still required as part of the apprenticeship — the apprenticeship does not replace it.",
      ];
    case "law_degree_then_sqe_route":
      return [
        "A qualifying law degree is one academic route into SQE. It does not remove the SQE, QWE or SRA admission requirements.",
        "Confirm entry requirements and student-finance eligibility with the specific university.",
      ];
    case "non_law_degree_conversion_then_sqe_route":
      return [
        "A conversion course (PGDL / equivalent) can help prepare for SQE1 but is not always formally required. Check SRA requirements before paying for a conversion course.",
        "SQE1, SQE2 and QWE requirements still apply.",
      ];
    case "paralegal_qwe_then_sqe_route":
      return [
        "QWE must meet SRA requirements and be confirmed by an appropriate person or organisation. Paralegal work does not automatically count.",
        "SQE assessments and SRA admission still apply.",
      ];
    case "qualified_lawyer_transfer_route":
      return [
        "Already-qualified lawyers from other jurisdictions have a different admission path. Check the SRA qualified-lawyer / exemption guidance directly — this checker does not decide the route.",
      ];
    case "lpc_legacy_transition_route":
      return [
        "The LPC route is transitional and time-limited. Check SRA rules before assuming previous legal study still fits the route.",
      ];
  }
};

const routeImmediate = (id: SolicitorRouteId): string => {
  switch (id) {
    case "sqe_degree_route":
      return "Read the SRA SQE route guidance and confirm your QWE arrangement with an appropriate confirming solicitor or organisation before booking SQE1.";
    case "solicitor_apprenticeship_route":
      return "Search live solicitor apprenticeship vacancies with employers in your area and read the SRA apprenticeship guidance before applying.";
    case "law_degree_then_sqe_route":
      return "Shortlist two qualifying law degrees on UCAS and confirm the SRA SQE route requirements before committing to a course.";
    case "non_law_degree_conversion_then_sqe_route":
      return "Check the SRA SQE guidance to confirm whether a conversion course (PGDL / equivalent) is needed for your situation before paying for one.";
    case "paralegal_qwe_then_sqe_route":
      return "Confirm with a prospective employer whether they can sign off QWE, then read the SRA QWE guidance before assuming the work counts.";
    case "qualified_lawyer_transfer_route":
      return "Read the SRA qualified-lawyer / overseas-lawyer guidance and contact the SRA directly to confirm which admission route applies to you.";
    case "lpc_legacy_transition_route":
      return "Read the SRA LPC transitional-arrangements guidance to check whether your existing legal study still fits the route before choosing next steps.";
  }
};

// ── Critical missing signals ────────────────────────────────────────────────

const CRITICAL_MISSING = (s: SolicitorSignals): string[] => {
  const m: string[] = [];
  if (!s.startingPoint) m.push("starting_point");
  if (!s.highestQualification) m.push("highest_qualification");
  if (!s.legalExperience) m.push("legal_experience");
  if (!s.degreeStatus) m.push("degree_status");
  if (!s.lpcOrLegacyStatus) m.push("lpc_or_legacy_status");
  if (!s.trainingPreference) m.push("training_preference");
  if (!s.studyTimeAvailable) m.push("study_time_available");
  if (!s.jurisdictionOrTransferStatus) m.push("jurisdiction_or_transfer_status");
  return m;
};

// ── Main entry point ────────────────────────────────────────────────────────

export const runSolicitorEngine = (
  input: SolicitorEngineInput,
): SolicitorEngineOutput => {
  const s = input.signals;

  // 1. Missing critical signals.
  const missing = CRITICAL_MISSING(s);
  if (missing.length > 0) {
    return baseInsufficient(missing, [
      `We need answers on: ${missing.join(", ")} before we can compare solicitor routes.`,
    ], "Go back and complete the outstanding questions so we can compare structural routes for you.");
  }

  // Evaluate all seven routes for the route-landscape view.
  const routeIds: SolicitorRouteId[] = [
    "sqe_degree_route",
    "solicitor_apprenticeship_route",
    "law_degree_then_sqe_route",
    "non_law_degree_conversion_then_sqe_route",
    "paralegal_qwe_then_sqe_route",
    "qualified_lawyer_transfer_route",
    "lpc_legacy_transition_route",
  ];
  const eligibilityFns: Record<SolicitorRouteId, (s: SolicitorSignals) => boolean> = {
    sqe_degree_route: isSqeDegreeEligible,
    solicitor_apprenticeship_route: isSolicitorApprenticeshipEligible,
    law_degree_then_sqe_route: isLawDegreeThenSqeEligible,
    non_law_degree_conversion_then_sqe_route: isNonLawConversionEligible,
    paralegal_qwe_then_sqe_route: isParalegalQweEligible,
    qualified_lawyer_transfer_route: isQualifiedLawyerTransferEligible,
    lpc_legacy_transition_route: isLpcLegacyTransitionEligible,
  };
  const evaluations: SolicitorRouteEvaluation[] = routeIds.map((id) => {
    const eligible = eligibilityFns[id](s);
    return {
      id,
      displayTitle: ROUTE_TITLES[id],
      eligible,
      affordability: affordabilityFor(id),
      rankingScore: eligible ? baseScore(id) + priorityBonus(id, s) : -1,
      blockersAndChecks: eligible ? routeBlockers(id) : [],
      immediateAction: routeImmediate(id),
      evidenceNote: EVIDENCE_NOTES[id],
    };
  });

  // 2. Transfer candidate → qualification_verification_required.
  //    No beginner route is fabricated as primary.
  if (isTransferCandidate(s)) {
    return {
      status: "qualification_verification_required",
      recommendedRouteId: null,
      alternativeRouteIds: [],
      affordabilityNotes: [],
      considerations: [],
      blockersAndChecks: [
        "Already-qualified lawyers from other jurisdictions have a different admission path. Check the SRA qualified-lawyer / exemption guidance directly — this checker does not decide the route.",
      ],
      immediateAction:
        "Read the SRA qualified-lawyer / overseas-lawyer guidance and contact the SRA directly to confirm which admission route applies to you.",
      evidenceNotes: [
        "The SRA sets qualified-lawyer / exemption rules. This is a check with the SRA, not a training route in itself.",
      ],
      routeEvaluations: evaluations,
      missingSignals: [],
      verificationPrimaryRouteId: null,
      mayOpenLaterRouteIds: [],
      isTransferVerification: true,
      isLpcVerification: false,
    };
  }

  // 3. LPC / legacy signal → qualification_verification_required.
  //    Overrides beginner SQE route recommendation.
  if (hasLpcOrLegacySignal(s)) {
    const mayOpenLater: SolicitorRouteId[] = [];
    // If they have a completed degree but only partial legacy (not
    // LPC-completed / not in a training contract), surface the SQE degree
    // route as may_open_later with the LPC transitional caveat attached.
    if (
      !isLpcCompletedSignal(s) &&
      hasDegreeOrEquivalentSignal(s) &&
      evaluations.find((r) => r.id === "sqe_degree_route")?.eligible
    ) {
      mayOpenLater.push("sqe_degree_route");
    }
    return {
      status: "qualification_verification_required",
      recommendedRouteId: null,
      alternativeRouteIds: [],
      affordabilityNotes: [],
      considerations: [
        "The LPC route is transitional and time-limited. This checker does not decide whether previous LPC study still fits the route — the SRA does.",
      ],
      blockersAndChecks: [
        "The LPC route is transitional and time-limited. Check SRA rules before assuming previous legal study still fits the route.",
      ],
      immediateAction:
        "Read the SRA LPC transitional-arrangements guidance to check whether your existing legal study still fits the route before choosing next steps.",
      evidenceNotes: [
        "The SRA sets LPC transitional-arrangements rules. Previous legal study does not automatically map onto a current SQE beginner route.",
      ],
      routeEvaluations: evaluations,
      missingSignals: [],
      verificationPrimaryRouteId: "lpc_legacy_transition_route",
      mayOpenLaterRouteIds: mayOpenLater,
      isTransferVerification: false,
      isLpcVerification: true,
    };
  }

  // 4. Standard SQE-family evaluation.
  const eligible = evaluations.filter(
    (r) =>
      r.eligible &&
      r.id !== "qualified_lawyer_transfer_route" &&
      r.id !== "lpc_legacy_transition_route",
  );

  // 5. Bridging — no Level 3, no degree/equivalent, no legal work signal.
  if (
    eligible.length === 0 &&
    !hasLevel3Signal(s) &&
    !hasDegreeOrEquivalentSignal(s) &&
    !hasLegalWorkSignal(s)
  ) {
    const mayOpen: SolicitorRouteId[] = [];
    // Law-degree route may open later once a Level 3 / access route is in
    // place — surface it so the landscape isn't empty.
    if (
      s.highestQualification === "none" ||
      s.highestQualification === "gcse"
    ) {
      mayOpen.push("law_degree_then_sqe_route");
    }
    return {
      status: "bridging_required",
      recommendedRouteId: null,
      alternativeRouteIds: [],
      affordabilityNotes: [],
      considerations: [],
      blockersAndChecks: [
        "None of the standard solicitor routes are directly open from your current situation — a bridging step (Level 3 or an access route, or first legal work experience) is needed first.",
      ],
      immediateAction:
        "Focus on one foundation-building step first — a Level 3 / access route, or a legal admin / paralegal entry role — before choosing an SQE route.",
      evidenceNotes: [
        "Solicitor qualification via SQE requires a degree or equivalent, QWE and SRA admission. Foundations come first when none of these are in place.",
      ],
      routeEvaluations: evaluations,
      missingSignals: [],
      verificationPrimaryRouteId: null,
      mayOpenLaterRouteIds: mayOpen,
      isTransferVerification: false,
      isLpcVerification: false,
    };
  }

  if (eligible.length === 0) {
    // Level 3 / experience present but no SQE route matched (rare — likely
    // preference-only mismatch). Fall back to bridging semantics.
    return {
      status: "bridging_required",
      recommendedRouteId: null,
      alternativeRouteIds: [],
      affordabilityNotes: [],
      considerations: [],
      blockersAndChecks: [
        "None of the standard solicitor routes matched your current preference and study answers. Revisit your training preference or study pattern.",
      ],
      immediateAction:
        "Revisit your training preference and study pattern, or explore a paralegal / legal admin first move to build QWE-relevant experience.",
      evidenceNotes: [],
      routeEvaluations: evaluations,
      missingSignals: [],
      verificationPrimaryRouteId: null,
      mayOpenLaterRouteIds: [],
      isTransferVerification: false,
      isLpcVerification: false,
    };
  }

  // 6. route_recommended.
  const ranked = [...eligible]
    .sort((a, b) => b.rankingScore - a.rankingScore)
    .slice(0, 3);
  const best = ranked[0];
  const alt = ranked.slice(1);

  const considerations: string[] = [];
  if (hasQweSignal(s)) {
    considerations.push(
      "QWE must meet SRA requirements and be confirmed by an appropriate person or organisation — this checker does not confirm your QWE meets SRA requirements.",
    );
  }
  if (s.checksBeforeCommitting.includes("character_and_suitability_process")) {
    considerations.push(
      "The SRA assesses character and suitability as part of admission. This checker does not ask for or assess those details.",
    );
  }

  return {
    status: "route_recommended",
    recommendedRouteId: best.id,
    alternativeRouteIds: alt.map((r) => r.id),
    affordabilityNotes: ranked.flatMap((r) => r.affordability.notes),
    considerations,
    blockersAndChecks: best.blockersAndChecks,
    immediateAction: best.immediateAction,
    evidenceNotes: ranked.map((r) => r.evidenceNote),
    routeEvaluations: [
      ...ranked,
      ...evaluations.filter((e) => !ranked.includes(e)),
    ],
    missingSignals: [],
    verificationPrimaryRouteId: null,
    mayOpenLaterRouteIds: [],
    isTransferVerification: false,
    isLpcVerification: false,
  };
};

const baseInsufficient = (
  missing: string[],
  blockers: string[],
  action: string,
  evaluations: SolicitorRouteEvaluation[] = [],
): SolicitorEngineOutput => ({
  status: "insufficient_information",
  recommendedRouteId: null,
  alternativeRouteIds: [],
  affordabilityNotes: [],
  considerations: [],
  blockersAndChecks: blockers,
  immediateAction: action,
  evidenceNotes: [],
  routeEvaluations: evaluations,
  missingSignals: missing,
  verificationPrimaryRouteId: null,
  mayOpenLaterRouteIds: [],
  isTransferVerification: false,
  isLpcVerification: false,
});
