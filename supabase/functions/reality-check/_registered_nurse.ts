// Deno mirror of src/lib/reality-check/route-engines/registered-nurse.ts.
// Parity is enforced by shared/reality-check/registered-nurse-cases.json which
// both this file and the Vitest suite load.

import { registeredNurseFlavor } from "./_registered_nurse_flavor.ts";
import type { ModularRealityCheckPayload, ModularRouteCard } from "./_modular_payload.ts";
import { buildModularPayload } from "./_modular_payload.ts";

type RouteId =
  | "pre_registration_nursing_degree"
  | "registered_nurse_degree_apprenticeship"
  | "nursing_associate_to_registered_nurse"
  | "graduate_shortened_nursing_degree"
  | "overseas_trained_nurse_registration"
  | "return_to_practice";

type Status =
  | "route_recommended"
  | "qualification_verification_required"
  | "bridging_required"
  | "insufficient_information";

interface Signals {
  startingPoint: string | null;
  targetNursingField: string | null;
  highestQualification: string | null;
  mathsEnglishScienceStatus: string | null;
  currentHealthcareEmployment: string | null;
  employerSupport?: string;
  degreeBackgroundSubject?: string;
  registrationBackground?: string;
  studyPatternAvailable: string | null;
  routePriorities: string[];
}

interface RouteEval {
  id: RouteId;
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
  recommendedRouteId: RouteId | null;
  alternativeRouteIds: RouteId[];
  affordabilityNotes: string[];
  considerations: string[];
  blockersAndChecks: string[];
  immediateAction: string;
  evidenceNotes: string[];
  routeEvaluations: RouteEval[];
  missingSignals: string[];
  verificationPrimaryRouteId: RouteId | null;
  mayOpenLaterRouteIds: RouteId[];
}

const TITLES: Record<RouteId, string> = {
  pre_registration_nursing_degree: "NMC-approved nursing degree",
  registered_nurse_degree_apprenticeship: "Registered Nurse Degree Apprenticeship (L6)",
  nursing_associate_to_registered_nurse: "Nursing associate / assistant practitioner progression",
  graduate_shortened_nursing_degree: "Graduate-entry shortened nursing route",
  overseas_trained_nurse_registration: "Overseas-trained nurse — NMC registration check",
  return_to_practice: "Return to practice",
};

const EVIDENCE: Record<RouteId, string> = {
  pre_registration_nursing_degree: "Usually three years full-time. Only NMC-approved programmes lead to registration.",
  registered_nurse_degree_apprenticeship: "Level 6 apprenticeship. Employer-led. Availability varies.",
  nursing_associate_to_registered_nurse: "Top-up length varies by provider.",
  graduate_shortened_nursing_degree: "Provider decides recognition of prior learning.",
  overseas_trained_nurse_registration: "NMC decides overseas registration.",
  return_to_practice: "NMC-approved Return to Practice programme required.",
};

const AFF_NOTES: Record<RouteId, string> = {
  pre_registration_nursing_degree: "Student finance available for eligible students.",
  registered_nurse_degree_apprenticeship: "Paid — employer-funded via apprenticeship levy.",
  nursing_associate_to_registered_nurse: "Usually employer-funded top-up.",
  graduate_shortened_nursing_degree: "Postgraduate tuition varies.",
  overseas_trained_nurse_registration: "NMC application, CBT and OSCE fees apply.",
  return_to_practice: "Often free or subsidised via NHS employers.",
};

export const NON_APPROVED_DIPLOMA_WARNING =
  'Courses marketed as "nursing diplomas" that are not NMC-approved do not lead to NMC registration in the UK. Check the NMC approved-programmes list before enrolling on any course.';
export const NMC_APPROVED_FOOTER =
  "Only NMC-approved programmes lead to registration as a nurse. Confirm any course is on the NMC's approved list before applying or paying fees.";

const LEVEL_3 = new Set([
  "a_level",
  "l3_vocational",
  "access_to_he_health_science",
  "bachelors_health_related",
  "bachelors_other",
  "nursing_associate_foundation_degree",
]);

const hasLevel3 = (s: Signals) => s.highestQualification !== null && LEVEL_3.has(s.highestQualification);
const employedHealthcare = (s: Signals) =>
  s.currentHealthcareEmployment === "employed_healthcare_support_role" ||
  s.currentHealthcareEmployment === "employed_nursing_associate" ||
  s.currentHealthcareEmployment === "employed_assistant_practitioner" ||
  s.currentHealthcareEmployment === "employed_other_healthcare";
const employerSupport = (s: Signals) =>
  s.employerSupport === "employer_support_confirmed" || s.employerSupport === "employer_support_possible";
const mesGate = (s: Signals) =>
  s.mathsEnglishScienceStatus === "english_maths_science_gcse_met" ||
  s.mathsEnglishScienceStatus === "english_maths_met_science_missing";
const relevantSubject = (s: Signals) =>
  s.degreeBackgroundSubject === "health_related" ||
  s.degreeBackgroundSubject === "psychology" ||
  s.degreeBackgroundSubject === "life_sciences" ||
  s.degreeBackgroundSubject === "social_work";

const isOverseas = (s: Signals) =>
  s.startingPoint === "trained_as_nurse_outside_uk" ||
  s.registrationBackground === "overseas_trained_not_on_nmc_register" ||
  s.highestQualification === "overseas_nursing_qualification";
const isRtP = (s: Signals) =>
  s.startingPoint === "previously_registered_nurse" ||
  s.registrationBackground === "previous_nmc_registration_lapsed";
const isCurrentOtherField = (s: Signals) =>
  s.startingPoint === "already_registered_nurse_other_field" ||
  s.registrationBackground === "current_nmc_registration_other_field";
const isGradVerification = (s: Signals) =>
  (s.highestQualification === "bachelors_health_related" || s.highestQualification === "bachelors_other") &&
  (s.degreeBackgroundSubject === "other_subject" || s.degreeBackgroundSubject === "unsure");

const isDegreeEligible = (s: Signals) => hasLevel3(s) && mesGate(s);
const isRNDAEligible = (s: Signals) => employedHealthcare(s) && employerSupport(s) && mesGate(s);
const isNAProgressionEligible = (s: Signals) =>
  s.startingPoint === "nursing_associate_or_assistant_practitioner" ||
  s.currentHealthcareEmployment === "employed_nursing_associate" ||
  s.currentHealthcareEmployment === "employed_assistant_practitioner";
const isGradShortenedEligible = (s: Signals) =>
  (s.highestQualification === "bachelors_health_related" || s.highestQualification === "bachelors_other") &&
  relevantSubject(s);

const baseScore = (id: RouteId, s: Signals): number => {
  if (id === "pre_registration_nursing_degree") return s.studyPatternAvailable === "full_time_university_possible" ? 92 : 88;
  if (id === "registered_nurse_degree_apprenticeship") return 94;
  if (id === "nursing_associate_to_registered_nurse") return 96;
  if (id === "graduate_shortened_nursing_degree") return 90;
  return 100;
};

const PRIORITY_BONUS: Record<string, Partial<Record<RouteId, number>>> = {
  fastest_route: { graduate_shortened_nursing_degree: 12, nursing_associate_to_registered_nurse: 8 },
  keep_earning: { registered_nurse_degree_apprenticeship: 12, nursing_associate_to_registered_nurse: 8 },
  employer_supported: { registered_nurse_degree_apprenticeship: 12, nursing_associate_to_registered_nurse: 8 },
  university_route: { pre_registration_nursing_degree: 12, graduate_shortened_nursing_degree: 6 },
  lowest_cost: { registered_nurse_degree_apprenticeship: 10, nursing_associate_to_registered_nurse: 6 },
};

const priorityBonus = (id: RouteId, ps: string[]) => {
  let b = 0;
  for (const p of ps) b += PRIORITY_BONUS[p]?.[id] ?? 0;
  return b;
};

const blockers = (id: RouteId, s: Signals): string[] => {
  if (id === "pre_registration_nursing_degree") {
    const out = ["Confirm the course is NMC-approved and covers your chosen field (adult, child, mental health or learning disability) with the specific university before applying."];
    if (s.mathsEnglishScienceStatus === "english_maths_met_science_missing") out.push("You may need to top up GCSE science (or an accepted equivalent) to meet entry requirements — check with the specific provider.");
    return out;
  }
  if (id === "registered_nurse_degree_apprenticeship") return [
    "The Registered Nurse Degree Apprenticeship is Level 6, employer-led and requires an employer to sponsor and release you for study and placement. Vacancy availability varies by NHS trust, region and year — the checker cannot see live vacancies.",
    "Some employers and providers require specific maths, English and science equivalents. Confirm your qualifications against the employer's entry requirements before applying.",
  ];
  if (id === "nursing_associate_to_registered_nurse") return ["Top-up route length and recognition of prior learning are provider decisions. Confirm the exact route length, entry criteria and funding with your employer and an NMC-approved provider."];
  if (id === "graduate_shortened_nursing_degree") return ["Whether your degree qualifies for a shortened route is a provider decision. Contact the specific university to confirm before applying."];
  if (id === "overseas_trained_nurse_registration") return ["Registration for nurses trained outside the UK is decided by the NMC and involves evidence of qualification, English-language competence, a Test of Competence (CBT + OSCE) and other checks. Start with the NMC overseas-trained nurses guidance."];
  return ["If your NMC registration has lapsed, you will normally need to complete an NMC-approved Return to Practice programme. Requirements depend on how long you have been off the register — check current NMC guidance."];
};

const immediate = (id: RouteId): string => {
  switch (id) {
    case "pre_registration_nursing_degree": return "Shortlist three NMC-approved nursing programmes via UCAS and confirm entry requirements with each admissions team.";
    case "registered_nurse_degree_apprenticeship": return "Ask your employer directly whether they run or sponsor Registered Nurse Degree Apprenticeship places, and check 'Find an apprenticeship' for L6 nursing vacancies in your region.";
    case "nursing_associate_to_registered_nurse": return "Ask your employer for a written progression plan onto a top-up route and identify at least one NMC-approved provider that accepts your prior learning.";
    case "graduate_shortened_nursing_degree": return "Contact two universities offering a shortened postgraduate nursing route and confirm whether your specific degree qualifies for their programme.";
    case "overseas_trained_nurse_registration": return "Start the NMC overseas application: gather qualification evidence and English-language evidence, and check current CBT/OSCE arrangements on the NMC website.";
    case "return_to_practice": return "Contact the NMC and an NHS employer offering a Return to Practice programme in your region to confirm current requirements and funding.";
  }
};

const critical = (s: Signals): string[] => {
  const m: string[] = [];
  if (!s.startingPoint) m.push("starting_point");
  if (!s.highestQualification) m.push("highest_qualification");
  if (!s.mathsEnglishScienceStatus) m.push("maths_english_science_status");
  if (!s.currentHealthcareEmployment) m.push("current_healthcare_employment");
  if (!s.studyPatternAvailable) m.push("study_pattern_available");
  return m;
};

export function runRegisteredNurseEngine(input: { signals: Signals }): EngineOutput {
  const s = input.signals;
  const missing = critical(s);
  if (missing.length > 0) {
    return {
      status: "insufficient_information",
      recommendedRouteId: null, alternativeRouteIds: [], affordabilityNotes: [], considerations: [],
      blockersAndChecks: [`We need answers on: ${missing.join(", ")} before we can compare nursing routes.`],
      immediateAction: "Go back and complete the outstanding questions so we can compare structural routes for you.",
      evidenceNotes: [], routeEvaluations: [], missingSignals: missing,
      verificationPrimaryRouteId: null, mayOpenLaterRouteIds: [],
    };
  }
  const ids: RouteId[] = [
    "pre_registration_nursing_degree","registered_nurse_degree_apprenticeship","nursing_associate_to_registered_nurse",
    "graduate_shortened_nursing_degree","overseas_trained_nurse_registration","return_to_practice",
  ];
  const eligFns: Record<RouteId, (s: Signals) => boolean> = {
    pre_registration_nursing_degree: isDegreeEligible,
    registered_nurse_degree_apprenticeship: isRNDAEligible,
    nursing_associate_to_registered_nurse: isNAProgressionEligible,
    graduate_shortened_nursing_degree: isGradShortenedEligible,
    overseas_trained_nurse_registration: isOverseas,
    return_to_practice: isRtP,
  };
  const evals: RouteEval[] = ids.map((id) => {
    const eligible = eligFns[id](s);
    const aff = { affordable: true, notes: [AFF_NOTES[id]] };
    const score = eligible ? baseScore(id, s) + priorityBonus(id, s.routePriorities) : -1;
    return {
      id, displayTitle: TITLES[id], eligible, affordability: aff, rankingScore: score,
      blockersAndChecks: eligible ? blockers(id, s) : [],
      immediateAction: immediate(id), evidenceNote: EVIDENCE[id],
    };
  });

  const stronger = isOverseas(s) || isRtP(s) || isCurrentOtherField(s);
  if (s.highestQualification === "unknown" && !stronger) {
    return {
      status: "insufficient_information",
      recommendedRouteId: null, alternativeRouteIds: [], affordabilityNotes: [], considerations: [],
      blockersAndChecks: ["We need your highest qualification level before comparing nursing routes."],
      immediateAction: "Confirm your highest completed qualification and update your answer.",
      evidenceNotes: [], routeEvaluations: evals, missingSignals: ["highest_qualification"],
      verificationPrimaryRouteId: null, mayOpenLaterRouteIds: [],
    };
  }

  const relevantEligible = evals.filter((r) => r.eligible);
  // Verification decisions
  if (isOverseas(s)) {
    const ukAlt = relevantEligible
      .filter((r) => r.id !== "overseas_trained_nurse_registration" && r.id !== "return_to_practice")
      .map((r) => r.id);
    return verificationOutput(evals, "overseas_trained_nurse_registration", ukAlt,
      "Your nursing qualification or registration is from outside the UK. The NMC is the statutory body that decides overseas-trained registration — that check comes before any UK training route.",
      "Start the NMC overseas application: gather qualification evidence and English-language evidence, and check current CBT/OSCE arrangements on the NMC website.",
      "The NMC is the UK authority for nurse registration and overseas-trained registration. UK ENIC can help with English-language and qualification-equivalence evidence.");
  }
  if (isRtP(s)) {
    return verificationOutput(evals, "return_to_practice", [],
      "You have previously been NMC-registered. Return to Practice is the standard route back — it is a verification-led programme, not a beginner degree.",
      "Contact the NMC and an NHS employer offering a Return to Practice programme in your region to confirm current requirements and funding.",
      "Return to Practice programmes are NMC-approved. Requirements vary with how long you have been off the register.");
  }
  if (isCurrentOtherField(s)) {
    return verificationOutput(evals, "graduate_shortened_nursing_degree", [],
      "You are currently NMC-registered in another nursing field. Field changes are decided by the NMC's scope-of-practice guidance and by individual providers — there is no single automatic route.",
      "Contact the NMC for scope-of-practice guidance and ask two NMC-approved providers about field-change top-up options relevant to your background.",
      "Field-change routes are provider-specific. The NMC decides scope of practice; the provider decides recognition of prior learning.");
  }
  if (isGradVerification(s)) {
    const ukAlt = relevantEligible.filter((r) => r.id === "pre_registration_nursing_degree").map((r) => r.id);
    return verificationOutput(evals, "graduate_shortened_nursing_degree", ukAlt,
      "A shortened graduate-entry nursing route may be relevant, but whether your specific degree qualifies is a provider decision — we cannot score that here.",
      "Contact two universities offering a shortened postgraduate nursing route and confirm whether your specific degree qualifies for their programme.",
      "Recognition of prior learning is a provider decision. NMC approves the programme; the provider decides your entry.");
  }

  const recommendable = evals.filter((r) => r.eligible && r.id !== "overseas_trained_nurse_registration" && r.id !== "return_to_practice");
  if (recommendable.length === 0) {
    const beginnerStart = s.startingPoint === "complete_beginner" || s.startingPoint === "some_health_or_care_experience";
    const lowQual = s.highestQualification === "none" || s.highestQualification === "gcse";
    const action = (beginnerStart && lowQual)
      ? "Check Access to HE (Nursing / Health Professions), a Level 3 health/science route, or entry-level healthcare support work as a bridging step. These experiences do not automatically lead to registration — an NMC-approved programme still applies."
      : "Bring one more signal into your profile — usually a Level 3 qualification, Access to HE Diploma, or a healthcare employment role with employer support — and re-run this checker.";
    return {
      status: "bridging_required",
      recommendedRouteId: null, alternativeRouteIds: [], affordabilityNotes: [], considerations: [],
      blockersAndChecks: ["None of the standard UK nursing routes are directly open from your current situation — a bridging step is needed first."],
      immediateAction: action,
      evidenceNotes: ["Common bridging steps: Access to HE Diploma (Nursing / Health Professions), Level 3 health or science qualification, entry-level healthcare support role as experience-building."],
      routeEvaluations: evals, missingSignals: [],
      verificationPrimaryRouteId: null, mayOpenLaterRouteIds: [],
    };
  }
  const ranked = [...recommendable].sort((a, b) => b.rankingScore - a.rankingScore);
  const best = ranked[0];
  const alt = ranked.slice(1);
  return {
    status: "route_recommended",
    recommendedRouteId: best.id,
    alternativeRouteIds: alt.map((r) => r.id),
    affordabilityNotes: ranked.flatMap((r) => r.affordability.notes),
    considerations: [],
    blockersAndChecks: best.blockersAndChecks,
    immediateAction: best.immediateAction,
    evidenceNotes: ranked.map((r) => r.evidenceNote),
    routeEvaluations: [...ranked, ...evals.filter((e) => !ranked.includes(e))],
    missingSignals: [],
    verificationPrimaryRouteId: null,
    mayOpenLaterRouteIds: [],
  };
}

function verificationOutput(
  evals: RouteEval[],
  primary: RouteId,
  mayOpenLater: RouteId[],
  reason: string,
  action: string,
  evidence: string,
): EngineOutput {
  return {
    status: "qualification_verification_required",
    recommendedRouteId: null, alternativeRouteIds: [], affordabilityNotes: [], considerations: [],
    blockersAndChecks: [reason],
    immediateAction: action,
    evidenceNotes: [evidence],
    routeEvaluations: evals, missingSignals: [],
    verificationPrimaryRouteId: primary,
    mayOpenLaterRouteIds: mayOpenLater,
  };
}

// Card for verification / recommend building.
function card(ev: RouteEval, kind: ModularRouteCard["kind"], fit: string): ModularRouteCard {
  return {
    kind, title: ev.displayTitle, fit,
    constraint: ev.blockersAndChecks[0] ?? "Confirm entry requirements with an NMC-approved provider or employer.",
    checks: ev.blockersAndChecks.slice(0, 3),
    timeCaveat: registeredNurseFlavor.timeCaveats[ev.id],
    costCaveat: registeredNurseFlavor.costCaveats[ev.id],
    patternCaveat: registeredNurseFlavor.patternCaveats[ev.id],
    nextAction: ev.immediateAction,
    affordable: ev.affordability.affordable,
  };
}

function buildVerificationPayload(out: EngineOutput): ModularRealityCheckPayload {
  const routes: ModularRouteCard[] = [];
  const primary = out.verificationPrimaryRouteId
    ? out.routeEvaluations.find((r) => r.id === out.verificationPrimaryRouteId)
    : undefined;
  if (primary) routes.push(card(primary, "investigate_after_check", registeredNurseFlavor.investigateAfterCheckFit));
  for (const id of out.mayOpenLaterRouteIds) {
    const ev = out.routeEvaluations.find((r) => r.id === id);
    if (ev) routes.push(card(ev, "may_open_later", registeredNurseFlavor.mayOpenLaterFit));
  }
  return {
    status: "qualification_verification_required",
    headline: "Your existing qualification or registration needs a formal check before any UK training route can be considered. Verification is a step, not a training route.",
    routes,
    checksBeforeCommitting: [...out.blockersAndChecks, NON_APPROVED_DIPLOMA_WARNING, NMC_APPROVED_FOOTER],
  };
}

function buildModularForNurse(out: EngineOutput): ModularRealityCheckPayload {
  if (out.status === "qualification_verification_required") return buildVerificationPayload(out);
  const base = buildModularPayload(out, registeredNurseFlavor);
  if (out.status === "insufficient_information") return base;
  return { ...base, checksBeforeCommitting: [...base.checksBeforeCommitting, NON_APPROVED_DIPLOMA_WARNING, NMC_APPROVED_FOOTER] };
}

export function buildRegisteredNurseResult(input: { signals: Signals }) {
  const out = runRegisteredNurseEngine(input);
  const readiness = out.status === "route_recommended" ? "ready_now"
    : out.status === "insufficient_information" ? "nearly_ready" : "needs_bridging";
  const overall = readiness === "ready_now" ? "Realistic"
    : readiness === "nearly_ready" ? "Realistic but hard" : "Long shot";
  const bestEval = out.recommendedRouteId ? out.routeEvaluations.find((r) => r.id === out.recommendedRouteId) : undefined;
  const altEval = out.alternativeRouteIds[0] ? out.routeEvaluations.find((r) => r.id === out.alternativeRouteIds[0]) : undefined;
  const bestRoute = bestEval
    ? {
        title: bestEval.displayTitle,
        summary: "This appears to be the strongest structural route from what you told us. Only NMC-approved programmes lead to registration — confirm the course is approved before applying.",
        whyThisFits: ["This route appears structurally relevant to your situation — it is not a promise of NMC registration."],
        estimatedTime: registeredNurseFlavor.timeCaveats[bestEval.id] ?? "Depends on the provider",
        likelyCost: registeredNurseFlavor.costCaveats[bestEval.id] ?? "Confirm current fees with the provider before committing",
        mainDifficulty: bestEval.blockersAndChecks[0] ?? "Confirm entry requirements with an NMC-approved provider or employer.",
        confidence: "medium",
      }
    : {
        title: out.status === "qualification_verification_required" ? "A formal check is needed before any UK training route can be considered"
          : out.status === "bridging_required" ? "A bridging step is needed before the standard nursing routes open"
          : "We need a few more answers before comparing nursing routes",
        summary: out.status === "qualification_verification_required" ? "The NMC is the UK authority for nurse registration. The check below is the next concrete step — it is not a training route in itself."
          : out.status === "bridging_required" ? "None of the standard UK nursing routes are directly open from your current situation. The step below is the bridging action, not a route."
          : "Some critical answers are missing. Complete them and we'll compare routes for you.",
        whyThisFits: [] as string[],
        estimatedTime: "Depends on the outcome of the step below",
        likelyCost: "Depends on the outcome of the step below",
        mainDifficulty: out.blockersAndChecks[0] ?? "",
        confidence: "low",
      };
  const backupRoute = altEval
    ? {
        title: altEval.displayTitle,
        summary: "A second structurally relevant route from your answers. Compare it against the recommended route and confirm entry requirements with the provider or employer.",
        tradeOff: "Different timeline and delivery model — see the caveats and blockers notes.",
      }
    : { title: "No secondary route from your current answers", summary: "Only one route was structurally relevant from what you told us.", tradeOff: "" };
  return {
    readiness, readinessReason:
      out.status === "route_recommended" ? "Your answers point to at least one structurally relevant UK nursing route. Only NMC-approved programmes lead to registration."
      : out.status === "qualification_verification_required" ? "A formal verification step is needed before any UK training route can be considered."
      : out.status === "bridging_required" ? "None of the standard UK nursing routes are directly open from your current situation — a bridging step is needed first."
      : "We need a few more answers before we can compare nursing routes.",
    biggestBlocker: out.blockersAndChecks[0] ?? "No single structural blocker stood out from what you told us.",
    immediateAction: out.immediateAction,
    overallVerdict: overall,
    bestRoute, backupRoute,
    routeToAvoid: {
      title: 'A non-NMC-approved "nursing diploma" course',
      whyRisky: 'Only NMC-approved programmes lead to registration as a nurse in the UK. Courses marketed as "nursing diplomas" that are not NMC-approved do not lead to NMC registration, regardless of how they are advertised.',
      whenItMightWork: "Never as a route to UK NMC registration. If the same content is later delivered inside an NMC-approved programme, that is a different situation — confirm the specific programme is on the NMC approved list.",
    },
    firstMoves: [out.immediateAction, "Check the course you are considering is on the NMC approved-programmes list before paying any fees."].slice(0, 3),
    modular: buildModularForNurse(out),
  };
}
