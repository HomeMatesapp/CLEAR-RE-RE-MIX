// Registered Nurse deterministic route engine — v1.
//
// Runtime-neutral. Deno mirror at
// supabase/functions/reality-check/_registered_nurse.ts is kept identical
// via shared/reality-check/registered-nurse-cases.json.
//
// Contract (per Design Brief v3):
//   - Eligibility is deterministic and independent of budget and priorities.
//     There is no budget signal; funding appears only in caveat copy.
//   - Priorities may reorder eligible routes only.
//   - No free text affects eligibility (there is none captured here).
//   - `overseas_nursing_qualification` NEVER counts toward hasLevel3Signal.
//   - `highestQualification = "unknown"` → insufficient_information, unless a
//     stronger verification trigger applies (overseas / lapsed / other-field).
//   - `mathsEnglishScienceStatus = "unsure"` does NOT satisfy the maths /
//     English / science gate for degree or RNDA direct eligibility.
//   - For overseas-trained users, `overseas_trained_nurse_registration` is
//     the ONLY primary verification card; UK routes appear only as
//     `may_open_later` alternatives (encoded via `mayOpenLaterRouteIds`).
//   - `qualification_verification_required` results never render `recommended`
//     or `backup` card kinds (enforced in the adapter).
//   - The checker never says "you are eligible to register".

import type {
  RegisteredNurseHighestQualification,
  RegisteredNurseRegistrationBackground,
  RegisteredNurseSignals,
  RegisteredNurseStartingPoint,
} from "../questionnaire/signals";

export type RegisteredNurseRouteId =
  | "pre_registration_nursing_degree"
  | "registered_nurse_degree_apprenticeship"
  | "nursing_associate_to_registered_nurse"
  | "graduate_shortened_nursing_degree"
  | "overseas_trained_nurse_registration"
  | "return_to_practice";

export type RegisteredNurseOutcomeStatus =
  | "route_recommended"
  | "qualification_verification_required"
  | "bridging_required"
  | "insufficient_information";

export interface RegisteredNurseAffordability {
  affordable: boolean;
  notes: string[];
}

export interface RegisteredNurseRouteEvaluation {
  id: RegisteredNurseRouteId;
  displayTitle: string;
  eligible: boolean;
  affordability: RegisteredNurseAffordability;
  rankingScore: number;
  blockersAndChecks: string[];
  immediateAction: string;
  evidenceNote: string;
}

/** Extra metadata driving the verification-status card mix. */
export interface RegisteredNurseEngineOutput {
  status: RegisteredNurseOutcomeStatus;
  recommendedRouteId: RegisteredNurseRouteId | null;
  alternativeRouteIds: RegisteredNurseRouteId[];
  affordabilityNotes: string[];
  considerations: string[];
  blockersAndChecks: string[];
  immediateAction: string;
  evidenceNotes: string[];
  routeEvaluations: RegisteredNurseRouteEvaluation[];
  missingSignals: string[];
  /** For verification status: the route to render as the primary
   *  `investigate_after_check` card. Null otherwise. */
  verificationPrimaryRouteId: RegisteredNurseRouteId | null;
  /** For verification status: routes to render as `may_open_later` cards
   *  (never as recommended/backup). Empty otherwise. */
  mayOpenLaterRouteIds: RegisteredNurseRouteId[];
}

export interface RegisteredNurseEngineInput {
  signals: RegisteredNurseSignals;
  region?: string | null;
  serviceLevel?: string | null;
  role?: { role_slug?: string; role_name?: string } | null;
}

export const ROUTE_TITLES: Record<RegisteredNurseRouteId, string> = {
  pre_registration_nursing_degree: "NMC-approved nursing degree",
  registered_nurse_degree_apprenticeship: "Registered Nurse Degree Apprenticeship (L6)",
  nursing_associate_to_registered_nurse: "Nursing associate / assistant practitioner progression",
  graduate_shortened_nursing_degree: "Graduate-entry shortened nursing route",
  overseas_trained_nurse_registration: "Overseas-trained nurse — NMC registration check",
  return_to_practice: "Return to practice",
};

const EVIDENCE_NOTES: Record<RegisteredNurseRouteId, string> = {
  pre_registration_nursing_degree:
    "Usually three years full-time, with roughly half spent on supervised clinical practice. Only NMC-approved programmes lead to registration.",
  registered_nurse_degree_apprenticeship:
    "Level 6 apprenticeship standard (Skills England / IfATE). Employer-led, requires sponsorship. Availability varies by region and trust.",
  nursing_associate_to_registered_nurse:
    "Top-up route length and recognition of prior learning are provider decisions. Confirm with your employer and an NMC-approved provider.",
  graduate_shortened_nursing_degree:
    "Some universities offer shortened postgraduate nursing routes (typically ~2 years) for graduates with a relevant degree. Whether your degree qualifies is a provider decision.",
  overseas_trained_nurse_registration:
    "The NMC decides overseas-trained registration. Expect evidence of qualification, English-language competence, a Test of Competence (CBT + OSCE) and other checks.",
  return_to_practice:
    "If your NMC registration has lapsed you will normally need an NMC-approved Return to Practice programme.",
};

// ── Non-approved diploma warning + universal footer (used by adapter) ────────

export const NON_APPROVED_DIPLOMA_WARNING =
  "Courses marketed as \"nursing diplomas\" that are not NMC-approved do not lead to NMC registration in the UK. Check the NMC approved-programmes list before enrolling on any course.";

export const NMC_APPROVED_FOOTER =
  "Only NMC-approved programmes lead to registration as a nurse. Confirm any course is on the NMC's approved list before applying or paying fees.";

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * v3 brief: `overseas_nursing_qualification` is explicitly excluded — it
 * triggers verification, never counts as a UK Level 3 signal.
 */
const LEVEL_3_SIGNALS: ReadonlySet<RegisteredNurseHighestQualification> = new Set([
  "a_level",
  "l3_vocational",
  "access_to_he_health_science",
  "bachelors_health_related",
  "bachelors_other",
  "nursing_associate_foundation_degree",
]);

const hasLevel3Signal = (s: RegisteredNurseSignals): boolean =>
  s.highestQualification !== null && LEVEL_3_SIGNALS.has(s.highestQualification);

const isEmployedInHealthcare = (s: RegisteredNurseSignals): boolean =>
  s.currentHealthcareEmployment === "employed_healthcare_support_role" ||
  s.currentHealthcareEmployment === "employed_nursing_associate" ||
  s.currentHealthcareEmployment === "employed_assistant_practitioner" ||
  s.currentHealthcareEmployment === "employed_other_healthcare";

const hasEmployerSupport = (s: RegisteredNurseSignals): boolean =>
  s.employerSupport === "employer_support_confirmed" ||
  s.employerSupport === "employer_support_possible";

/** Only "met" and "science-missing" satisfy the maths/English/science gate.
 *  `unsure` and `maths_or_english_missing` do NOT. */
const mathsEnglishScienceGateMet = (s: RegisteredNurseSignals): boolean =>
  s.mathsEnglishScienceStatus === "english_maths_science_gcse_met" ||
  s.mathsEnglishScienceStatus === "english_maths_met_science_missing";

const isRelevantGraduateSubject = (s: RegisteredNurseSignals): boolean =>
  s.degreeBackgroundSubject === "health_related" ||
  s.degreeBackgroundSubject === "psychology" ||
  s.degreeBackgroundSubject === "life_sciences" ||
  s.degreeBackgroundSubject === "social_work";

// Verification-trigger helpers.
const OVERSEAS_START_POINTS: ReadonlySet<RegisteredNurseStartingPoint> = new Set([
  "trained_as_nurse_outside_uk",
]);
const OVERSEAS_REG_BACKGROUND: ReadonlySet<RegisteredNurseRegistrationBackground> = new Set([
  "overseas_trained_not_on_nmc_register",
]);

const isOverseasCase = (s: RegisteredNurseSignals): boolean =>
  (s.startingPoint !== null && OVERSEAS_START_POINTS.has(s.startingPoint)) ||
  (s.registrationBackground !== undefined && OVERSEAS_REG_BACKGROUND.has(s.registrationBackground)) ||
  s.highestQualification === "overseas_nursing_qualification";

const isReturnToPracticeCase = (s: RegisteredNurseSignals): boolean =>
  s.startingPoint === "previously_registered_nurse" ||
  s.registrationBackground === "previous_nmc_registration_lapsed";

const isCurrentlyRegisteredOtherFieldCase = (s: RegisteredNurseSignals): boolean =>
  s.startingPoint === "already_registered_nurse_other_field" ||
  s.registrationBackground === "current_nmc_registration_other_field";

const isGraduateVerificationCase = (s: RegisteredNurseSignals): boolean =>
  (s.highestQualification === "bachelors_health_related" ||
    s.highestQualification === "bachelors_other") &&
  (s.degreeBackgroundSubject === "other_subject" ||
    s.degreeBackgroundSubject === "unsure");

// ── Eligibility ──────────────────────────────────────────────────────────────

const isPreRegistrationDegreeEligible = (s: RegisteredNurseSignals): boolean =>
  hasLevel3Signal(s) && mathsEnglishScienceGateMet(s);

const isRNDAEligible = (s: RegisteredNurseSignals): boolean =>
  isEmployedInHealthcare(s) &&
  hasEmployerSupport(s) &&
  mathsEnglishScienceGateMet(s);

const isNursingAssociateProgressionEligible = (s: RegisteredNurseSignals): boolean =>
  s.startingPoint === "nursing_associate_or_assistant_practitioner" ||
  s.currentHealthcareEmployment === "employed_nursing_associate" ||
  s.currentHealthcareEmployment === "employed_assistant_practitioner";

const isGraduateShortenedEligible = (s: RegisteredNurseSignals): boolean =>
  (s.highestQualification === "bachelors_health_related" ||
    s.highestQualification === "bachelors_other") &&
  isRelevantGraduateSubject(s);

// The verification routes are marked "eligible" in the sense that they are
// structurally relevant; they surface via their own verification path rather
// than as recommended cards.
const isOverseasRouteRelevant = (s: RegisteredNurseSignals): boolean =>
  isOverseasCase(s);

const isReturnToPracticeRelevant = (s: RegisteredNurseSignals): boolean =>
  isReturnToPracticeCase(s);

// ── Affordability ────────────────────────────────────────────────────────────
// No budget field — nursing routes are student-loan funded or apprenticeship-
// paid. Every route is marked "affordable" with a caveat pointing at funding.

const AFFORDABILITY_NOTES: Record<RegisteredNurseRouteId, string> = {
  pre_registration_nursing_degree:
    "UK undergraduate tuition and living-cost support available via student finance for eligible students.",
  registered_nurse_degree_apprenticeship:
    "Paid apprenticeship — you earn a wage; tuition is covered by the employer via the apprenticeship levy.",
  nursing_associate_to_registered_nurse:
    "Usually employer-funded top-up. Confirm funding arrangements with your employer and provider.",
  graduate_shortened_nursing_degree:
    "Postgraduate nursing tuition costs vary; some students access student finance. Confirm with the provider.",
  overseas_trained_nurse_registration:
    "NMC application, CBT and OSCE fees apply. Costs are set by the NMC — check current fees before starting.",
  return_to_practice:
    "Return to Practice programmes may be free or subsidised via NHS employers or Health Education. Availability varies.",
};

const affordabilityFor = (id: RegisteredNurseRouteId): RegisteredNurseAffordability => ({
  affordable: true,
  notes: [AFFORDABILITY_NOTES[id]],
});

// ── Ranking ──────────────────────────────────────────────────────────────────

const baseScore = (id: RegisteredNurseRouteId, s: RegisteredNurseSignals): number => {
  switch (id) {
    case "pre_registration_nursing_degree":
      return s.studyPatternAvailable === "full_time_university_possible" ? 92 : 88;
    case "registered_nurse_degree_apprenticeship":
      return 94;
    case "nursing_associate_to_registered_nurse":
      return 96;
    case "graduate_shortened_nursing_degree":
      return 90;
    case "overseas_trained_nurse_registration":
      return 100;
    case "return_to_practice":
      return 100;
  }
};

const PRIORITY_BONUS: Partial<
  Record<string, Partial<Record<RegisteredNurseRouteId, number>>>
> = {
  fastest_route: {
    graduate_shortened_nursing_degree: 12,
    nursing_associate_to_registered_nurse: 8,
  },
  keep_earning: {
    registered_nurse_degree_apprenticeship: 12,
    nursing_associate_to_registered_nurse: 8,
  },
  employer_supported: {
    registered_nurse_degree_apprenticeship: 12,
    nursing_associate_to_registered_nurse: 8,
  },
  university_route: {
    pre_registration_nursing_degree: 12,
    graduate_shortened_nursing_degree: 6,
  },
  lowest_cost: {
    registered_nurse_degree_apprenticeship: 10,
    nursing_associate_to_registered_nurse: 6,
  },
  // patient_contact and mental_health_or_community_focus are caveat-only (v1).
};

const priorityBonus = (id: RegisteredNurseRouteId, priorities: string[]): number => {
  let bonus = 0;
  for (const p of priorities) {
    const row = PRIORITY_BONUS[p];
    if (!row) continue;
    bonus += row[id] ?? 0;
  }
  return bonus;
};

// ── Blockers / checks ────────────────────────────────────────────────────────

const routeBlockers = (id: RegisteredNurseRouteId, s: RegisteredNurseSignals): string[] => {
  const out: string[] = [];
  switch (id) {
    case "pre_registration_nursing_degree":
      out.push(
        "Confirm the course is NMC-approved and covers your chosen field (adult, child, mental health or learning disability) with the specific university before applying.",
      );
      if (s.mathsEnglishScienceStatus === "english_maths_met_science_missing") {
        out.push(
          "You may need to top up GCSE science (or an accepted equivalent) to meet entry requirements — check with the specific provider.",
        );
      }
      break;
    case "registered_nurse_degree_apprenticeship":
      out.push(
        "The Registered Nurse Degree Apprenticeship is Level 6, employer-led and requires an employer to sponsor and release you for study and placement. Vacancy availability varies by NHS trust, region and year — the checker cannot see live vacancies.",
      );
      out.push(
        "Some employers and providers require specific maths, English and science equivalents. Confirm your qualifications against the employer's entry requirements before applying.",
      );
      break;
    case "nursing_associate_to_registered_nurse":
      out.push(
        "Top-up route length and recognition of prior learning are provider decisions. Confirm the exact route length, entry criteria and funding with your employer and an NMC-approved provider.",
      );
      break;
    case "graduate_shortened_nursing_degree":
      out.push(
        "Whether your degree qualifies for a shortened route is a provider decision. Contact the specific university to confirm before applying.",
      );
      break;
    case "overseas_trained_nurse_registration":
      out.push(
        "Registration for nurses trained outside the UK is decided by the NMC and involves evidence of qualification, English-language competence, a Test of Competence (CBT + OSCE) and other checks. Start with the NMC overseas-trained nurses guidance.",
      );
      break;
    case "return_to_practice":
      out.push(
        "If your NMC registration has lapsed, you will normally need to complete an NMC-approved Return to Practice programme. Requirements depend on how long you have been off the register — check current NMC guidance.",
      );
      break;
  }
  return out;
};

const routeImmediate = (id: RegisteredNurseRouteId): string => {
  switch (id) {
    case "pre_registration_nursing_degree":
      return "Shortlist three NMC-approved nursing programmes via UCAS and confirm entry requirements with each admissions team.";
    case "registered_nurse_degree_apprenticeship":
      return "Ask your employer directly whether they run or sponsor Registered Nurse Degree Apprenticeship places, and check 'Find an apprenticeship' for L6 nursing vacancies in your region.";
    case "nursing_associate_to_registered_nurse":
      return "Ask your employer for a written progression plan onto a top-up route and identify at least one NMC-approved provider that accepts your prior learning.";
    case "graduate_shortened_nursing_degree":
      return "Contact two universities offering a shortened postgraduate nursing route and confirm whether your specific degree qualifies for their programme.";
    case "overseas_trained_nurse_registration":
      return "Start the NMC overseas application: gather qualification evidence and English-language evidence, and check current CBT/OSCE arrangements on the NMC website.";
    case "return_to_practice":
      return "Contact the NMC and an NHS employer offering a Return to Practice programme in your region to confirm current requirements and funding.";
  }
};

// ── Missing critical signals ─────────────────────────────────────────────────

const CRITICAL_MISSING = (s: RegisteredNurseSignals): string[] => {
  const missing: string[] = [];
  if (!s.startingPoint) missing.push("starting_point");
  if (!s.highestQualification) missing.push("highest_qualification");
  if (!s.mathsEnglishScienceStatus) missing.push("maths_english_science_status");
  if (!s.currentHealthcareEmployment) missing.push("current_healthcare_employment");
  if (!s.studyPatternAvailable) missing.push("study_pattern_available");
  return missing;
};

// ── Verification-only path ───────────────────────────────────────────────────

interface VerificationDecision {
  primaryRouteId: RegisteredNurseRouteId;
  reason: string;
  action: string;
  evidenceNote: string;
  mayOpenLater: RegisteredNurseRouteId[];
}

const decideVerification = (
  s: RegisteredNurseSignals,
  eligibleRoutes: RegisteredNurseRouteEvaluation[],
): VerificationDecision | null => {
  // Overseas takes precedence over all other verification triggers.
  if (isOverseasCase(s)) {
    // UK routes may only appear as may_open_later. Never as recommended.
    const ukAlternatives = eligibleRoutes
      .filter(
        (r) =>
          r.id !== "overseas_trained_nurse_registration" &&
          r.id !== "return_to_practice",
      )
      .map((r) => r.id);
    return {
      primaryRouteId: "overseas_trained_nurse_registration",
      reason:
        "Your nursing qualification or registration is from outside the UK. The NMC is the statutory body that decides overseas-trained registration — that check comes before any UK training route.",
      action:
        "Start the NMC overseas application: gather qualification evidence and English-language evidence, and check current CBT/OSCE arrangements on the NMC website.",
      evidenceNote:
        "The NMC is the UK authority for nurse registration and overseas-trained registration. UK ENIC can help with English-language and qualification-equivalence evidence.",
      mayOpenLater: ukAlternatives,
    };
  }
  if (isReturnToPracticeCase(s)) {
    return {
      primaryRouteId: "return_to_practice",
      reason:
        "You have previously been NMC-registered. Return to Practice is the standard route back — it is a verification-led programme, not a beginner degree.",
      action:
        "Contact the NMC and an NHS employer offering a Return to Practice programme in your region to confirm current requirements and funding.",
      evidenceNote:
        "Return to Practice programmes are NMC-approved. Requirements vary with how long you have been off the register.",
      mayOpenLater: [],
    };
  }
  if (isCurrentlyRegisteredOtherFieldCase(s)) {
    const gradShortened = eligibleRoutes.find(
      (r) => r.id === "graduate_shortened_nursing_degree",
    );
    return {
      primaryRouteId:
        gradShortened?.id ?? "graduate_shortened_nursing_degree",
      reason:
        "You are currently NMC-registered in another nursing field. Field changes are decided by the NMC's scope-of-practice guidance and by individual providers — there is no single automatic route.",
      action:
        "Contact the NMC for scope-of-practice guidance and ask two NMC-approved providers about field-change top-up options relevant to your background.",
      evidenceNote:
        "Field-change routes are provider-specific. The NMC decides scope of practice; the provider decides recognition of prior learning.",
      mayOpenLater: gradShortened ? [] : [],
    };
  }
  if (isGraduateVerificationCase(s)) {
    return {
      primaryRouteId: "graduate_shortened_nursing_degree",
      reason:
        "A shortened graduate-entry nursing route may be relevant, but whether your specific degree qualifies is a provider decision — we cannot score that here.",
      action:
        "Contact two universities offering a shortened postgraduate nursing route and confirm whether your specific degree qualifies for their programme.",
      evidenceNote:
        "Recognition of prior learning is a provider decision. NMC approves the programme; the provider decides your entry.",
      mayOpenLater: eligibleRoutes
        .filter((r) => r.id === "pre_registration_nursing_degree")
        .map((r) => r.id),
    };
  }
  return null;
};

// ── Bridging path ────────────────────────────────────────────────────────────

const isBridgingCandidate = (s: RegisteredNurseSignals): boolean => {
  const beginnerStart =
    s.startingPoint === "complete_beginner" ||
    s.startingPoint === "some_health_or_care_experience";
  const lowQual =
    s.highestQualification === "none" || s.highestQualification === "gcse";
  return beginnerStart && lowQual;
};

// ── Main entry point ─────────────────────────────────────────────────────────

export const runRegisteredNurseEngine = (
  input: RegisteredNurseEngineInput,
): RegisteredNurseEngineOutput => {
  const s = input.signals;

  // 1. Missing critical signals → insufficient_information.
  const missing = CRITICAL_MISSING(s);
  if (missing.length > 0) {
    return {
      status: "insufficient_information",
      recommendedRouteId: null,
      alternativeRouteIds: [],
      affordabilityNotes: [],
      considerations: [],
      blockersAndChecks: [
        `We need answers on: ${missing.join(", ")} before we can compare nursing routes.`,
      ],
      immediateAction:
        "Go back and complete the outstanding questions so we can compare structural routes for you.",
      evidenceNotes: [],
      routeEvaluations: [],
      missingSignals: missing,
      verificationPrimaryRouteId: null,
      mayOpenLaterRouteIds: [],
    };
  }

  // 2. Evaluate route eligibility (independent of budget and priorities).
  const routeIds: RegisteredNurseRouteId[] = [
    "pre_registration_nursing_degree",
    "registered_nurse_degree_apprenticeship",
    "nursing_associate_to_registered_nurse",
    "graduate_shortened_nursing_degree",
    "overseas_trained_nurse_registration",
    "return_to_practice",
  ];

  const eligibilityFns: Record<
    RegisteredNurseRouteId,
    (s: RegisteredNurseSignals) => boolean
  > = {
    pre_registration_nursing_degree: isPreRegistrationDegreeEligible,
    registered_nurse_degree_apprenticeship: isRNDAEligible,
    nursing_associate_to_registered_nurse: isNursingAssociateProgressionEligible,
    graduate_shortened_nursing_degree: isGraduateShortenedEligible,
    overseas_trained_nurse_registration: isOverseasRouteRelevant,
    return_to_practice: isReturnToPracticeRelevant,
  };

  const evaluations: RegisteredNurseRouteEvaluation[] = routeIds.map((id) => {
    const eligible = eligibilityFns[id](s);
    const affordability = affordabilityFor(id);
    const score = eligible
      ? baseScore(id, s) + priorityBonus(id, s.routePriorities)
      : -1;
    return {
      id,
      displayTitle: ROUTE_TITLES[id],
      eligible,
      affordability,
      rankingScore: score,
      blockersAndChecks: eligible ? routeBlockers(id, s) : [],
      immediateAction: routeImmediate(id),
      evidenceNote: EVIDENCE_NOTES[id],
    };
  });

  // 3. `unknown` qualification with no stronger verification trigger →
  //    insufficient_information (per v3 §6.2 correction). Verification
  //    triggers take precedence.
  const strongerVerification =
    isOverseasCase(s) ||
    isReturnToPracticeCase(s) ||
    isCurrentlyRegisteredOtherFieldCase(s);
  if (s.highestQualification === "unknown" && !strongerVerification) {
    return {
      status: "insufficient_information",
      recommendedRouteId: null,
      alternativeRouteIds: [],
      affordabilityNotes: [],
      considerations: [],
      blockersAndChecks: [
        "We need your highest qualification level before comparing nursing routes.",
      ],
      immediateAction:
        "Confirm your highest completed qualification and update your answer.",
      evidenceNotes: [],
      routeEvaluations: evaluations,
      missingSignals: ["highest_qualification"],
      verificationPrimaryRouteId: null,
      mayOpenLaterRouteIds: [],
    };
  }

  // 4. Verification-only outcomes.
  const relevantEligible = evaluations.filter((r) => r.eligible);
  const verification = decideVerification(s, relevantEligible);
  if (verification) {
    return {
      status: "qualification_verification_required",
      recommendedRouteId: null,
      alternativeRouteIds: [],
      affordabilityNotes: [],
      considerations: [],
      blockersAndChecks: [verification.reason],
      immediateAction: verification.action,
      evidenceNotes: [verification.evidenceNote],
      routeEvaluations: evaluations,
      missingSignals: [],
      verificationPrimaryRouteId: verification.primaryRouteId,
      mayOpenLaterRouteIds: verification.mayOpenLater,
    };
  }

  // 5. Recommendable eligible routes (excluding verification-only routes,
  //    which are handled above).
  const recommendable = evaluations.filter(
    (r) =>
      r.eligible &&
      r.id !== "overseas_trained_nurse_registration" &&
      r.id !== "return_to_practice",
  );

  if (recommendable.length === 0) {
    // 6. Bridging.
    const bridgingAction = isBridgingCandidate(s)
      ? "Check Access to HE (Nursing / Health Professions), a Level 3 health/science route, or entry-level healthcare support work as a bridging step. These experiences do not automatically lead to registration — an NMC-approved programme still applies."
      : "Bring one more signal into your profile — usually a Level 3 qualification, Access to HE Diploma, or a healthcare employment role with employer support — and re-run this checker.";
    return {
      status: "bridging_required",
      recommendedRouteId: null,
      alternativeRouteIds: [],
      affordabilityNotes: [],
      considerations: [],
      blockersAndChecks: [
        "None of the standard UK nursing routes are directly open from your current situation — a bridging step is needed first.",
      ],
      immediateAction: bridgingAction,
      evidenceNotes: [
        "Common bridging steps: Access to HE Diploma (Nursing / Health Professions), Level 3 health or science qualification, entry-level healthcare support role as experience-building.",
      ],
      routeEvaluations: evaluations,
      missingSignals: [],
      verificationPrimaryRouteId: null,
      mayOpenLaterRouteIds: [],
    };
  }

  // 7. Rank recommendable routes.
  const ranked = [...recommendable].sort(
    (a, b) => b.rankingScore - a.rankingScore,
  );
  const best = ranked[0];
  const alternatives = ranked.slice(1);

  return {
    status: "route_recommended",
    recommendedRouteId: best.id,
    alternativeRouteIds: alternatives.map((r) => r.id),
    affordabilityNotes: ranked.flatMap((r) => r.affordability.notes),
    considerations: [],
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
  };
};
