// Deno mirror of src/lib/reality-check/route-engines/solicitor.ts +
// solicitor-adapter.ts. Behaviour must stay in lockstep — modify both files
// together. Parity enforced by shared/reality-check/solicitor-cases.json.

import {
  CHARACTER_SUITABILITY_CAVEAT,
  solicitorFlavor,
  type SolicitorRouteId,
} from "./_solicitor_flavor.ts";
import type { ModularPayload, ModularRouteCard } from "./_modular_payload.ts";
import { buildModularPayload } from "./_modular_payload.ts";

type Status =
  | "route_recommended"
  | "qualification_verification_required"
  | "bridging_required"
  | "insufficient_information";

interface Signals {
  startingPoint: string | null;
  highestQualification: string | null;
  legalExperience: string | null;
  degreeStatus: string | null;
  lpcOrLegacyStatus: string | null;
  sqeAwareness: string | null;
  qweSignal: string | null;
  trainingPreference: string | null;
  studyTimeAvailable: string | null;
  budgetForTrainingAndExams: string | null;
  jurisdictionOrTransferStatus: string | null;
  routePriorities: string[];
  checksBeforeCommitting: string[];
}

interface RouteEval {
  id: SolicitorRouteId;
  displayTitle: string;
  eligible: boolean;
  affordability: { affordable: boolean; notes: string[] };
  rankingScore: number;
  blockersAndChecks: string[];
  immediateAction: string;
  evidenceNote: string;
}

export interface EngineOutput {
  status: Status;
  recommendedRouteId: SolicitorRouteId | null;
  alternativeRouteIds: SolicitorRouteId[];
  affordabilityNotes: string[];
  considerations: string[];
  blockersAndChecks: string[];
  immediateAction: string;
  evidenceNotes: string[];
  routeEvaluations: RouteEval[];
  missingSignals: string[];
  verificationPrimaryRouteId: SolicitorRouteId | null;
  mayOpenLaterRouteIds: SolicitorRouteId[];
  isTransferVerification: boolean;
  isLpcVerification: boolean;
}

export const SOLICITOR_SCOPE_NOTE =
  "This checker compares SQE, apprenticeship, degree, conversion, paralegal/QWE, qualified-lawyer transfer and LPC transitional routes into solicitor qualification in England & Wales. The SRA is the authority — this is not legal advice and does not decide eligibility.";

const TITLES: Record<SolicitorRouteId, string> = {
  sqe_degree_route: "SQE route after degree or equivalent",
  solicitor_apprenticeship_route: "Solicitor apprenticeship",
  law_degree_then_sqe_route: "Law degree then SQE",
  non_law_degree_conversion_then_sqe_route: "Non-law degree / conversion preparation then SQE",
  paralegal_qwe_then_sqe_route: "Legal work / paralegal experience plus QWE and SQE",
  qualified_lawyer_transfer_route: "Qualified lawyer / overseas lawyer route",
  lpc_legacy_transition_route: "LPC / transitional route",
};

const EVIDENCE: Record<SolicitorRouteId, string> = {
  sqe_degree_route: "SQE1 and SQE2, two years of QWE and the SRA's character and suitability requirements all apply. The SRA is the authority.",
  solicitor_apprenticeship_route: "Solicitor apprenticeships are employer-led. SQE assessment is still required. Availability varies.",
  law_degree_then_sqe_route: "A qualifying law degree is one academic route. It does not remove SQE, QWE or SRA admission requirements.",
  non_law_degree_conversion_then_sqe_route: "A conversion course can help prepare for SQE1 but is not always formally required. Check SRA requirements.",
  paralegal_qwe_then_sqe_route: "Paralegal work may build QWE, but QWE must meet SRA requirements and be confirmed by an appropriate person or organisation.",
  qualified_lawyer_transfer_route: "Already-qualified lawyers may have a different admission route. Check SRA qualified-lawyer guidance directly.",
  lpc_legacy_transition_route: "The LPC route is transitional and time-limited. Check SRA rules before assuming previous legal study still fits the route.",
};

const AFF: Record<SolicitorRouteId, string> = {
  sqe_degree_route: "SQE assessment fees, prep-course costs and living costs during QWE add up. Confirm total cost before committing.",
  solicitor_apprenticeship_route: "Paid — employer-funded via the apprenticeship levy. Confirm the specific offer with the employer.",
  law_degree_then_sqe_route: "UK undergraduate tuition is loan-funded via GOV.UK Student Finance. SQE fees apply after graduation.",
  non_law_degree_conversion_then_sqe_route: "Conversion courses vary widely in cost. Check SRA requirements before paying.",
  paralegal_qwe_then_sqe_route: "Paralegal work is usually paid. SQE prep and exam fees apply separately.",
  qualified_lawyer_transfer_route: "Fees and exemptions depend on jurisdiction. Check SRA qualified-lawyer guidance.",
  lpc_legacy_transition_route: "Costs depend on what you've already completed. Check SRA transitional guidance.",
};

const DEG_OR_EQ_Q = new Set(["bachelors_law","bachelors_non_law","masters_or_postgraduate","professional_legal_qualification"]);
const DEG_OR_EQ_S = new Set(["completed_law_degree","completed_non_law_degree","international_degree"]);
const NON_LAW_Q = new Set(["bachelors_non_law","masters_or_postgraduate"]);
const NON_LAW_S = new Set(["studying_non_law_degree","completed_non_law_degree"]);
const LVL3 = new Set(["a_level_or_level_3","bachelors_law","bachelors_non_law","masters_or_postgraduate","professional_legal_qualification"]);
const LEGAL_WORK = new Set(["legal_admin","paralegal","trainee_or_apprentice_legal_role","qualified_lawyer_outside_england_wales","other_professional_client_work"]);
const QWE_PRESENT = new Set(["may_have_some_legal_work","employer_can_confirm_qwe","already_confirmed_qwe"]);
const LPC_ANY = new Set(["started_or_completed_law_degree_before_sqe_transition","completed_gdl_or_pgdl","completed_lpc","started_period_of_recognised_training"]);
const LPC_DONE = new Set(["completed_lpc","started_period_of_recognised_training"]);

const hasDegOrEq = (s: Signals) => (s.highestQualification !== null && DEG_OR_EQ_Q.has(s.highestQualification)) || (s.degreeStatus !== null && DEG_OR_EQ_S.has(s.degreeStatus));
const hasNonLawDeg = (s: Signals) => (s.highestQualification !== null && NON_LAW_Q.has(s.highestQualification)) || (s.degreeStatus !== null && NON_LAW_S.has(s.degreeStatus));
const hasLvl3 = (s: Signals) => s.highestQualification !== null && LVL3.has(s.highestQualification);
const hasLegalWork = (s: Signals) => s.legalExperience !== null && LEGAL_WORK.has(s.legalExperience);
const hasQwe = (s: Signals) => s.qweSignal !== null && QWE_PRESENT.has(s.qweSignal);
const isTransfer = (s: Signals) =>
  s.startingPoint === "qualified_lawyer_overseas_or_other_jurisdiction" ||
  s.legalExperience === "qualified_lawyer_outside_england_wales" ||
  s.jurisdictionOrTransferStatus === "already_qualified_outside_england_wales" ||
  s.highestQualification === "professional_legal_qualification";
const hasLpcAny = (s: Signals) => s.lpcOrLegacyStatus !== null && LPC_ANY.has(s.lpcOrLegacyStatus);
const isLpcDone = (s: Signals) => s.lpcOrLegacyStatus !== null && LPC_DONE.has(s.lpcOrLegacyStatus);
const earnWhileTraining = (s: Signals) =>
  s.trainingPreference === "earn_while_training" ||
  s.routePriorities.includes("earn_while_training") ||
  s.studyTimeAvailable === "need_to_keep_earning";

const isSqeDeg = (s: Signals) => hasDegOrEq(s) && !isTransfer(s) && !isLpcDone(s);
const isAppr = (s: Signals) => hasLvl3(s) && earnWhileTraining(s) && !isTransfer(s) && !isLpcDone(s);
const isLawDeg = (s: Signals) =>
  (s.highestQualification === "gcse" || s.highestQualification === "a_level_or_level_3") &&
  (s.trainingPreference === "university_first" || s.trainingPreference === "not_sure") &&
  (s.studyTimeAvailable === "full_time_study_possible" || s.studyTimeAvailable === "part_time_study_possible") &&
  !isTransfer(s) && !hasLpcAny(s);
const isConv = (s: Signals) => hasNonLawDeg(s) && !isTransfer(s) && !isLpcDone(s);
const isPara = (s: Signals) =>
  (hasLegalWork(s) || hasQwe(s) || s.trainingPreference === "build_legal_experience_first") &&
  !isTransfer(s) && !isLpcDone(s);

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

const priorityBonus = (id: SolicitorRouteId, s: Signals): number => {
  let b = 0;
  const pr = s.routePriorities;
  if (pr.includes("avoid_debt")) { if (id === "solicitor_apprenticeship_route") b += 12; if (id === "paralegal_qwe_then_sqe_route") b += 8; }
  if (pr.includes("earn_while_training")) { if (id === "solicitor_apprenticeship_route") b += 12; if (id === "paralegal_qwe_then_sqe_route") b += 6; }
  if (pr.includes("qualify_as_fast_as_possible")) { if (id === "sqe_degree_route") b += 12; if (id === "qualified_lawyer_transfer_route") b += 6; }
  if (pr.includes("build_legal_experience") && id === "paralegal_qwe_then_sqe_route") b += 12;
  if (pr.includes("academic_law_route") && id === "law_degree_then_sqe_route") b += 12;
  if (pr.includes("flexible_part_time_route")) { if (id === "sqe_degree_route") b += 6; if (id === "paralegal_qwe_then_sqe_route") b += 6; }
  if (s.trainingPreference === "earn_while_training" && id === "solicitor_apprenticeship_route") b += 6;
  if (s.trainingPreference === "shortest_structural_route" && id === "sqe_degree_route") b += 4;
  return b;
};

const blockers = (id: SolicitorRouteId): string[] => {
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
      return ["Already-qualified lawyers from other jurisdictions have a different admission path. Check the SRA qualified-lawyer / exemption guidance directly — this checker does not decide the route."];
    case "lpc_legacy_transition_route":
      return ["The LPC route is transitional and time-limited. Check SRA rules before assuming previous legal study still fits the route."];
  }
};

const immediate = (id: SolicitorRouteId): string => {
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

const critical = (s: Signals): string[] => {
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

export function runSolicitorEngine(input: { signals: Signals }): EngineOutput {
  const s = input.signals;
  const missing = critical(s);
  if (missing.length > 0) {
    return {
      status: "insufficient_information",
      recommendedRouteId: null, alternativeRouteIds: [],
      affordabilityNotes: [], considerations: [],
      blockersAndChecks: [`We need answers on: ${missing.join(", ")} before we can compare solicitor routes.`],
      immediateAction: "Go back and complete the outstanding questions so we can compare structural routes for you.",
      evidenceNotes: [], routeEvaluations: [], missingSignals: missing,
      verificationPrimaryRouteId: null, mayOpenLaterRouteIds: [],
      isTransferVerification: false, isLpcVerification: false,
    };
  }

  const ids: SolicitorRouteId[] = [
    "sqe_degree_route",
    "solicitor_apprenticeship_route",
    "law_degree_then_sqe_route",
    "non_law_degree_conversion_then_sqe_route",
    "paralegal_qwe_then_sqe_route",
    "qualified_lawyer_transfer_route",
    "lpc_legacy_transition_route",
  ];
  const eligFns: Record<SolicitorRouteId, (s: Signals) => boolean> = {
    sqe_degree_route: isSqeDeg,
    solicitor_apprenticeship_route: isAppr,
    law_degree_then_sqe_route: isLawDeg,
    non_law_degree_conversion_then_sqe_route: isConv,
    paralegal_qwe_then_sqe_route: isPara,
    qualified_lawyer_transfer_route: isTransfer,
    lpc_legacy_transition_route: hasLpcAny,
  };
  const evals: RouteEval[] = ids.map((id) => {
    const eligible = eligFns[id](s);
    return {
      id, displayTitle: TITLES[id], eligible,
      affordability: { affordable: true, notes: [AFF[id]] },
      rankingScore: eligible ? baseScore(id) + priorityBonus(id, s) : -1,
      blockersAndChecks: eligible ? blockers(id) : [],
      immediateAction: immediate(id),
      evidenceNote: EVIDENCE[id],
    };
  });

  if (isTransfer(s)) {
    return {
      status: "qualification_verification_required",
      recommendedRouteId: null, alternativeRouteIds: [],
      affordabilityNotes: [], considerations: [],
      blockersAndChecks: ["Already-qualified lawyers from other jurisdictions have a different admission path. Check the SRA qualified-lawyer / exemption guidance directly — this checker does not decide the route."],
      immediateAction: "Read the SRA qualified-lawyer / overseas-lawyer guidance and contact the SRA directly to confirm which admission route applies to you.",
      evidenceNotes: ["The SRA sets qualified-lawyer / exemption rules. This is a check with the SRA, not a training route in itself."],
      routeEvaluations: evals, missingSignals: [],
      verificationPrimaryRouteId: null, mayOpenLaterRouteIds: [],
      isTransferVerification: true, isLpcVerification: false,
    };
  }

  if (hasLpcAny(s)) {
    const mayOpen: SolicitorRouteId[] = [];
    if (!isLpcDone(s) && hasDegOrEq(s) && evals.find((r) => r.id === "sqe_degree_route")?.eligible) {
      mayOpen.push("sqe_degree_route");
    }
    return {
      status: "qualification_verification_required",
      recommendedRouteId: null, alternativeRouteIds: [],
      affordabilityNotes: [],
      considerations: ["The LPC route is transitional and time-limited. This checker does not decide whether previous LPC study still fits the route — the SRA does."],
      blockersAndChecks: ["The LPC route is transitional and time-limited. Check SRA rules before assuming previous legal study still fits the route."],
      immediateAction: "Read the SRA LPC transitional-arrangements guidance to check whether your existing legal study still fits the route before choosing next steps.",
      evidenceNotes: ["The SRA sets LPC transitional-arrangements rules. Previous legal study does not automatically map onto a current SQE beginner route."],
      routeEvaluations: evals, missingSignals: [],
      verificationPrimaryRouteId: "lpc_legacy_transition_route",
      mayOpenLaterRouteIds: mayOpen,
      isTransferVerification: false, isLpcVerification: true,
    };
  }

  const eligible = evals.filter(
    (r) => r.eligible && r.id !== "qualified_lawyer_transfer_route" && r.id !== "lpc_legacy_transition_route",
  );

  if (eligible.length === 0 && !hasLvl3(s) && !hasDegOrEq(s) && !hasLegalWork(s)) {
    const mayOpen: SolicitorRouteId[] = [];
    if (s.highestQualification === "none" || s.highestQualification === "gcse") {
      mayOpen.push("law_degree_then_sqe_route");
    }
    return {
      status: "bridging_required",
      recommendedRouteId: null, alternativeRouteIds: [],
      affordabilityNotes: [], considerations: [],
      blockersAndChecks: ["None of the standard solicitor routes are directly open from your current situation — a bridging step (Level 3 or an access route, or first legal work experience) is needed first."],
      immediateAction: "Focus on one foundation-building step first — a Level 3 / access route, or a legal admin / paralegal entry role — before choosing an SQE route.",
      evidenceNotes: ["Solicitor qualification via SQE requires a degree or equivalent, QWE and SRA admission. Foundations come first when none of these are in place."],
      routeEvaluations: evals, missingSignals: [],
      verificationPrimaryRouteId: null, mayOpenLaterRouteIds: mayOpen,
      isTransferVerification: false, isLpcVerification: false,
    };
  }

  if (eligible.length === 0) {
    return {
      status: "bridging_required",
      recommendedRouteId: null, alternativeRouteIds: [],
      affordabilityNotes: [], considerations: [],
      blockersAndChecks: ["None of the standard solicitor routes matched your current preference and study answers. Revisit your training preference or study pattern."],
      immediateAction: "Revisit your training preference and study pattern, or explore a paralegal / legal admin first move to build QWE-relevant experience.",
      evidenceNotes: [], routeEvaluations: evals, missingSignals: [],
      verificationPrimaryRouteId: null, mayOpenLaterRouteIds: [],
      isTransferVerification: false, isLpcVerification: false,
    };
  }

  const ranked = [...eligible].sort((a, b) => b.rankingScore - a.rankingScore).slice(0, 3);
  const best = ranked[0];
  const alt = ranked.slice(1);

  const considerations: string[] = [];
  if (hasQwe(s)) considerations.push("QWE must meet SRA requirements and be confirmed by an appropriate person or organisation — this checker does not confirm your QWE meets SRA requirements.");
  if (s.checksBeforeCommitting.includes("character_and_suitability_process")) {
    considerations.push("The SRA assesses character and suitability as part of admission. This checker does not ask for or assess those details.");
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
    routeEvaluations: [...ranked, ...evals.filter((e) => !ranked.includes(e))],
    missingSignals: [],
    verificationPrimaryRouteId: null, mayOpenLaterRouteIds: [],
    isTransferVerification: false, isLpcVerification: false,
  };
}

function card(ev: RouteEval, kind: ModularRouteCard["kind"], fit: string): ModularRouteCard {
  return {
    kind, title: ev.displayTitle, fit,
    constraint: ev.blockersAndChecks[0] ?? "Confirm SRA requirements before committing to this route.",
    checks: ev.blockersAndChecks.slice(0, 3),
    timeCaveat: solicitorFlavor.timeCaveats[ev.id],
    costCaveat: solicitorFlavor.costCaveats[ev.id],
    patternCaveat: solicitorFlavor.patternCaveats[ev.id],
    nextAction: ev.immediateAction,
    affordable: ev.affordability.affordable,
  };
}

function buildVerification(out: EngineOutput): ModularPayload {
  const routes: ModularRouteCard[] = [];
  if (out.isLpcVerification && out.verificationPrimaryRouteId) {
    const primary = out.routeEvaluations.find((r) => r.id === out.verificationPrimaryRouteId);
    if (primary) routes.push(card(primary, "investigate_after_check", solicitorFlavor.investigateAfterCheckFit));
  }
  for (const id of out.mayOpenLaterRouteIds) {
    const ev = out.routeEvaluations.find((r) => r.id === id);
    if (ev) routes.push(card(ev, "may_open_later", solicitorFlavor.mayOpenLaterFit));
  }
  return {
    status: "qualification_verification_required",
    headline: out.isTransferVerification
      ? "An SRA check is needed before a UK solicitor route can be compared. Qualified-lawyer / exemption rules are set by the SRA, not this checker."
      : "An SRA transitional check is needed before a UK solicitor route can be confirmed. The LPC route is transitional and time-limited.",
    routes,
    checksBeforeCommitting: [...out.blockersAndChecks, CHARACTER_SUITABILITY_CAVEAT, SOLICITOR_SCOPE_NOTE],
  };
}

function buildModularForSolicitor(out: EngineOutput): ModularPayload {
  if (out.status === "qualification_verification_required") return buildVerification(out);
  const base = buildModularPayload(out, solicitorFlavor);
  if (out.status === "insufficient_information") return base;
  return {
    ...base,
    checksBeforeCommitting: [...base.checksBeforeCommitting, CHARACTER_SUITABILITY_CAVEAT, SOLICITOR_SCOPE_NOTE],
  };
}

export function buildSolicitorResult(input: { signals: Signals }) {
  const out = runSolicitorEngine(input);
  const readiness = out.status === "route_recommended" ? "ready_now"
    : out.status === "insufficient_information" ? "nearly_ready" : "needs_bridging";
  const overall = readiness === "ready_now" ? "Realistic but hard"
    : readiness === "nearly_ready" ? "Realistic but hard" : "Long shot";
  const bestEv = out.recommendedRouteId ? out.routeEvaluations.find((r) => r.id === out.recommendedRouteId) : undefined;
  const altEv = out.alternativeRouteIds[0] ? out.routeEvaluations.find((r) => r.id === out.alternativeRouteIds[0]) : undefined;
  const bestRoute = bestEv
    ? {
        title: bestEv.displayTitle,
        summary: "This appears to be the strongest structural route from your answers. Final admission is decided by the SRA, not this checker.",
        whyThisFits: ["This route appears structurally relevant to your answers. It is not a promise of qualification — the SRA is the authority."],
        estimatedTime: solicitorFlavor.timeCaveats[bestEv.id] ?? "Depends on your route and QWE",
        likelyCost: solicitorFlavor.costCaveats[bestEv.id] ?? "Confirm total training and SQE costs before committing",
        mainDifficulty: bestEv.blockersAndChecks[0] ?? "Confirm SRA requirements before committing to this route.",
        confidence: "medium",
      }
    : {
        title: out.status === "qualification_verification_required"
          ? (out.isTransferVerification
              ? "An SRA qualified-lawyer / exemption check is needed before a UK solicitor route can be compared"
              : "An SRA LPC transitional check is needed before a UK solicitor route can be confirmed")
          : out.status === "bridging_required"
            ? "A bridging step is needed before the standard solicitor routes open"
            : "We need a few more answers before comparing solicitor routes",
        summary: out.status === "qualification_verification_required"
          ? "The SRA is the authority for this check. The step below is the next concrete action — it is not a training route in itself."
          : out.status === "bridging_required"
            ? "None of the standard solicitor routes are directly open from your current situation. The step below is the bridging action, not a route."
            : "Some critical answers are missing. Complete them and we'll compare routes for you.",
        whyThisFits: [] as string[],
        estimatedTime: "Depends on the outcome of the step below",
        likelyCost: "Depends on the outcome of the step below",
        mainDifficulty: out.blockersAndChecks[0] ?? "",
        confidence: "low",
      };
  const backupRoute = altEv
    ? {
        title: altEv.displayTitle,
        summary: "A second structurally relevant route from your answers. Compare against the recommended route and confirm SRA requirements for your situation.",
        tradeOff: "Different timeline, cost and evidence value — see the caveats and checks on the card.",
      }
    : { title: "No secondary route from your current answers", summary: "Only one structural route was relevant from what you told us.", tradeOff: "" };
  return {
    readiness,
    readinessReason:
      out.status === "route_recommended"
        ? "Your answers point to at least one structurally relevant SQE-family route. Final admission is decided by the SRA."
        : out.status === "qualification_verification_required"
          ? (out.isTransferVerification
              ? "An SRA qualified-lawyer / exemption check is needed before a UK solicitor route can be compared."
              : "An SRA LPC transitional check is needed before a UK solicitor route can be confirmed.")
          : out.status === "bridging_required"
            ? "None of the standard UK solicitor routes are directly open from your current situation — a bridging step is needed first."
            : "We need a few more answers before we can compare solicitor routes.",
    biggestBlocker: out.blockersAndChecks[0] ?? "No single structural blocker stood out — but confirm SRA requirements before committing.",
    immediateAction: out.immediateAction,
    overallVerdict: overall,
    bestRoute, backupRoute,
    routeToAvoid: {
      title: "Paying for a conversion course or SQE prep course without checking SRA rules and outcome claims",
      whyRisky: "Conversion (PGDL / equivalent) is not always formally required for SQE. SQE prep providers vary widely in cost and outcome evidence. Paying before confirming SRA rules is the most common expensive wrong turn.",
      whenItMightWork: "When you've independently confirmed the SRA rules for your situation, checked prep-provider claims (pass-rate methodology, refund terms, outcome evidence) and treated the course as SQE preparation only — not as proof of admission.",
    },
    firstMoves: [out.immediateAction, "Read the SRA SQE, QWE and admission guidance directly before paying for any conversion or prep course."].slice(0, 3),
    considerations: out.considerations.length ? out.considerations : undefined,
    modular: buildModularForSolicitor(out),
  };
}
