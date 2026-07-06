// Heating Engineer deterministic route engine — heating-engineer-v1.
//
// Mirrors the Plumber engine's contract:
//   - Eligibility is deterministic and independent of budget and priorities.
//   - Priorities may reorder eligible routes only.
//   - Budget never changes readiness or eligibility.
//   - Working conditions produce considerations only.
//   - Free text never affects eligibility.
//   - Older / international / unknown-level qualifications route to
//     `qualification_verification_required`.
//   - Missing critical signals route to `insufficient_information`.
//   - No eligible route routes to `bridging_required`.
//   - A gas / Gas Safe answer is NEVER treated as verified. It can only
//     make the experienced-worker route structurally relevant when paired
//     with real heating/gas/plumbing/building-services experience, and
//     always emits a verification check.

import type { HeatingEngineerSignals } from "../questionnaire/signals";

export type HeatingEngineerRouteId =
  | "apprenticeship"
  | "college_then_workplace_experience"
  | "experienced_worker_route";

export type HeatingEngineerOutcomeStatus =
  | "route_recommended"
  | "qualification_verification_required"
  | "bridging_required"
  | "insufficient_information";

export interface AffordabilityReport {
  affordable: boolean;
  notes: string[];
}

export interface RouteEvaluation {
  id: HeatingEngineerRouteId;
  displayTitle: string;
  eligible: boolean;
  affordability: AffordabilityReport;
  rankingScore: number;
  blockersAndChecks: string[];
  immediateAction: string;
  evidenceNote: string;
}

export interface HeatingEngineerEngineInput {
  signals: HeatingEngineerSignals;
  region?: string | null;
  serviceLevel?: string | null;
  role?: { role_slug?: string; role_name?: string } | null;
}

export interface HeatingEngineerEngineOutput {
  status: HeatingEngineerOutcomeStatus;
  recommendedRouteId: HeatingEngineerRouteId | null;
  alternativeRouteIds: HeatingEngineerRouteId[];
  affordabilityNotes: string[];
  considerations: string[];
  blockersAndChecks: string[];
  immediateAction: string;
  evidenceNotes: string[];
  routeEvaluations: RouteEvaluation[];
  missingSignals: string[];
}

const ROUTE_TITLES: Record<HeatingEngineerRouteId, string> = {
  apprenticeship: "Heating and building-services apprenticeship",
  college_then_workplace_experience: "College qualification followed by workplace experience",
  experienced_worker_route: "Experienced-worker assessment route",
};

const EVIDENCE_NOTES: Record<HeatingEngineerRouteId, string> = {
  apprenticeship:
    "Standards such as Plumbing and Domestic Heating Technician (Level 3) or Building Services Engineering Craftsperson apprenticeships; typical duration 3–4 years; paid. Gas Safe registration is separate and comes after further assessment.",
  college_then_workplace_experience:
    "College Level 2/3 qualifications in plumbing / heating / building services followed by NVQ requiring evidenced on-site work.",
  experienced_worker_route:
    "Experienced Worker Assessment routes require substantial evidenced heating / plumbing / building-services work history. Gas Safe status is a separate legal register and must be verified independently.",
};

const patternIncludes = (patterns: string[], ...anyOf: string[]): boolean =>
  patterns.some((p) => anyOf.includes(p));

const isApprenticeshipEligible = (s: HeatingEngineerSignals): boolean => {
  if (!s.availableTrainingPatterns.length) return false;
  return patternIncludes(
    s.availableTrainingPatterns,
    "full_time_work_based",
    "full_time_college",
    "one_or_two_weekdays",
  );
};

const isCollegeRouteEligible = (s: HeatingEngineerSignals): boolean =>
  patternIncludes(
    s.availableTrainingPatterns,
    "full_time_college",
    "one_or_two_weekdays",
    "weekday_evenings",
    "mixed_day_evening",
  );

// Experienced-worker route requires BOTH relevant experience AND a
// relevant qualification/registration signal. Gas-related experience
// alone is not sufficient.
const EXP_WORKER_QUAL_LEVELS: HeatingEngineerSignals["heatingQualificationLevel"][] = [
  "level_2",
  "level_3",
  "gas_or_gas_safe_claimed",
  "heat_pump_or_low_carbon",
];

const hasExperiencedWorkerExperience = (s: HeatingEngineerSignals): boolean =>
  s.hasHeatingExperience ||
  s.hasGasExperience ||
  s.hasPlumbingExperience ||
  s.hasBuildingServicesExperience;

const isExperiencedWorkerEligible = (s: HeatingEngineerSignals): boolean => {
  if (!hasExperiencedWorkerExperience(s)) return false;
  return EXP_WORKER_QUAL_LEVELS.includes(s.heatingQualificationLevel);
};

const evaluateAffordability = (
  routeId: HeatingEngineerRouteId,
  s: HeatingEngineerSignals,
): AffordabilityReport => {
  const budget = s.trainingBudgetBand;
  switch (routeId) {
    case "apprenticeship":
      return {
        affordable: true,
        notes: [
          "Apprenticeships are paid roles — you earn while training and course fees are covered.",
        ],
      };
    case "college_then_workplace_experience": {
      const notes = [
        "College course fees vary; funding may be available depending on age, prior qualifications and region — always check with the provider.",
      ];
      if (budget === "free_only" || budget === "up_to_500") {
        return {
          affordable: false,
          notes: [
            ...notes,
            "Your stated budget is likely below typical self-funded college fees for this route.",
          ],
        };
      }
      return { affordable: true, notes };
    }
    case "experienced_worker_route": {
      const notes = [
        "Experienced-worker assessment fees are usually in the low thousands and normally self-funded. Any subsequent Gas Safe registration involves additional ACS assessment and registration fees.",
      ];
      if (budget === "free_only" || budget === "up_to_500" || budget === "500_to_2000") {
        return {
          affordable: false,
          notes: [
            ...notes,
            "Your stated budget may not cover typical assessment costs — confirm current fees with an approved assessment centre.",
          ],
        };
      }
      return { affordable: true, notes };
    }
  }
};

const baseScore = (routeId: HeatingEngineerRouteId, s: HeatingEngineerSignals): number => {
  switch (routeId) {
    case "apprenticeship":
      return 100
        + (s.startingPoint === "still_at_school" ? 10 : 0)
        + (s.startingPoint === "recently_left_education" ? 8 : 0)
        + (s.startingPoint === "career_changer" ? 4 : 0);
    case "college_then_workplace_experience":
      return 80
        + (s.hasRelatedTradeExperience ? 5 : 0)
        + (s.startingPoint === "career_changer" ? 6 : 0);
    case "experienced_worker_route":
      return 60 + (hasExperiencedWorkerExperience(s) ? 20 : 0);
  }
};

const priorityBonus = (routeId: HeatingEngineerRouteId, priorities: string[]): number => {
  if (priorities.includes("not_sure_yet")) return 0;
  let bonus = 0;
  const w = 12;
  for (const p of priorities) {
    if (p === "earn_while_training" && routeId === "apprenticeship") bonus += w;
    if (p === "practical_experience" && routeId === "apprenticeship") bonus += w;
    if (p === "low_cost" && routeId === "apprenticeship") bonus += w;
    if (p === "strongest_employment" && routeId === "apprenticeship") bonus += 6;
    if (p === "recognised_qualification" && routeId === "college_then_workplace_experience") bonus += 15;
    if (p === "fit_around_commitments" && routeId === "college_then_workplace_experience") bonus += 8;
    if (p === "qualify_quickly" && routeId === "experienced_worker_route") bonus += w;
  }
  return bonus;
};

const affordabilityAdjustment = (aff: AffordabilityReport): number =>
  aff.affordable ? 0 : -20;

const routeBlockersAndChecks = (
  routeId: HeatingEngineerRouteId,
  s: HeatingEngineerSignals,
): string[] => {
  const out: string[] = [];
  if (routeId === "apprenticeship") {
    if (s.mathsEnglishStatus === "neither") {
      out.push(
        "Most heating and building-services apprenticeship providers require English and maths at level 2 (GCSE grade 4/C) or Functional Skills; you may need to complete these alongside or before starting.",
      );
    }
    if (s.mathsEnglishStatus === "international") {
      out.push(
        "Providers will need to see how your international qualifications map to English and maths at Level 2 — check with the training provider or UK ENIC.",
      );
    }
    if (s.travelRange === "local_no_car") {
      out.push(
        "Heating apprenticeship placements can span a wide area — check whether local employers hire apprentices you can reach without a car.",
      );
    }
  }
  if (routeId === "college_then_workplace_experience") {
    if (s.mathsEnglishStatus === "neither") {
      out.push(
        "Many colleges expect Level 2 maths and English for enrolment on Level 3 heating or building-services courses.",
      );
    }
    out.push(
      "The NVQ that follows the classroom course requires evidence of real on-site heating or building-services work — plan how you'll access that placement.",
    );
  }
  if (routeId === "experienced_worker_route") {
    if (s.heatingQualificationLevel === "gas_or_gas_safe_claimed") {
      // Gas Safe is a legal register. A self-reported gas qualification or
      // registration is NEVER treated as verified by the engine.
      out.push(
        "A gas qualification or Gas Safe registration needs verifying separately — Gas Safe is a legal register maintained by the Gas Safe Register and cannot be inferred from your answers. Confirm your current registration status and any ACS certificates directly.",
      );
    }
    if (s.heatingQualificationLevel === "heat_pump_or_low_carbon") {
      out.push(
        "A heat pump or low-carbon heating qualification is structurally relevant but does not imply gas authorisation or Gas Safe registration — confirm with an approved assessment centre how it maps to the specific route you want.",
      );
    }
    if (s.heatingQualificationLevel === "level_2" || s.heatingQualificationLevel === "level_3") {
      // Level 2/3 qualifications in plumbing / heating / building services
      // are adjacent to the target trade — worth flagging that mapping
      // needs checking.
      out.push(
        "Your existing Level 2/3 qualification may cover heating, plumbing or building services — confirm with an approved heating or building-services assessment centre exactly how it maps to the current requirements.",
      );
    }
    out.push(
      "You will need to evidence substantial recent heating, gas, plumbing or building-services work — check the current assessment portfolio requirements with an approved centre.",
    );
  }
  return out;
};

const routeImmediateAction = (routeId: HeatingEngineerRouteId): string => {
  switch (routeId) {
    case "apprenticeship":
      return "Search current heating, plumbing and building-services apprenticeship vacancies on the government's Find an Apprenticeship service and note the entry requirements for two employers you'd realistically apply to.";
    case "college_then_workplace_experience":
      return "Look up Level 2 plumbing / heating / building-services courses at colleges within your travel range and note their next intake and entry requirements.";
    case "experienced_worker_route":
      return "Request the current experienced-worker assessment guidance from an approved heating or building-services assessment centre and start listing the work you can evidence. If your goal includes gas work, contact the Gas Safe Register separately to confirm what registration will require.";
  }
};

const CONDITION_MESSAGES: Record<string, string> = {
  safety_critical_systems:
    "You noted working with safety-critical heating or gas systems as something to check. Heating and gas work is regulated — ask employers and providers what supervision, assessments and registrations sit around the specific systems you'd work on.",
  confined_or_plant_rooms:
    "You noted working in confined spaces, lofts or plant rooms as something to check. Heating work regularly involves these environments — ask employers about the typical mix of work.",
  lifting_bending:
    "You noted regular lifting, bending or kneeling as something to check. Ask a working heating engineer about typical physical demands on the routes you're considering.",
  customer_sites:
    "You noted working in homes, commercial buildings or occupied customer sites as something to check. Most heating work involves customer contact — a taster day or shadowing can give you a realistic picture.",
  emergency_callouts:
    "You noted emergency callouts or irregular hours as something to check. Some heating roles include on-call rotas; others don't — confirm what a typical week looks like for the employers you're considering.",
  travel_between_customers:
    "You noted travelling between customer sites as something to check. Domestic heating usually involves regular travel — confirm expected travel time and vehicle arrangements.",
  need_more_info:
    "You said you need more information about the working conditions — a taster day, work experience, or a call with an approved training provider can give you a realistic picture before committing.",
};

const buildConsiderations = (s: HeatingEngineerSignals): string[] =>
  s.workingConditionsToCheck
    .filter((c) => c !== "none")
    .map((c) => CONDITION_MESSAGES[c])
    .filter((m): m is string => !!m);

const VERIFICATION_LEVELS = new Set(["older_unknown", "international", "unknown_level"]);

const CRITICAL_SIGNALS_MISSING = (s: HeatingEngineerSignals): string[] => {
  const missing: string[] = [];
  if (!s.startingPoint) missing.push("starting_point");
  if (!s.heatingQualificationLevel) missing.push("heating_qualification");
  if (!s.mathsEnglishStatus) missing.push("maths_english_status");
  if (!s.availableTrainingPatterns.length) missing.push("training_availability");
  return missing;
};

export const runHeatingEngineerEngine = (
  input: HeatingEngineerEngineInput,
): HeatingEngineerEngineOutput => {
  const { signals: s } = input;
  const considerations = buildConsiderations(s);

  if (
    s.heatingQualificationLevel &&
    VERIFICATION_LEVELS.has(s.heatingQualificationLevel)
  ) {
    return {
      status: "qualification_verification_required",
      recommendedRouteId: null,
      alternativeRouteIds: [],
      affordabilityNotes: [],
      considerations,
      blockersAndChecks: [
        "We can't safely classify your existing heating, gas or building-services qualification without verification. Older UK qualifications may be superseded, and international qualifications need mapping to current UK requirements.",
      ],
      immediateAction:
        "Ask an approved heating or building-services training provider or awarding-body assessment centre to review your existing qualification and confirm what it maps to in the current UK system. If gas work is involved, contact the Gas Safe Register separately.",
      evidenceNotes: [
        "UK heating and gas qualifications are set by awarding bodies and assessment centres; equivalency is decided by them, not by self-report. Gas Safe registration is legally separate again.",
      ],
      routeEvaluations: [],
      missingSignals: [],
    };
  }

  const missing = CRITICAL_SIGNALS_MISSING(s);
  if (missing.length > 0) {
    return {
      status: "insufficient_information",
      recommendedRouteId: null,
      alternativeRouteIds: [],
      affordabilityNotes: [],
      considerations,
      blockersAndChecks: [
        `We need answers on: ${missing.join(", ")} before we can suggest a specific route.`,
      ],
      immediateAction:
        "Go back and complete the outstanding questions so we can identify the strongest structural route.",
      evidenceNotes: [],
      routeEvaluations: [],
      missingSignals: missing,
    };
  }

  const routeIds: HeatingEngineerRouteId[] = [
    "apprenticeship",
    "college_then_workplace_experience",
    "experienced_worker_route",
  ];

  const eligibilityFns: Record<HeatingEngineerRouteId, (s: HeatingEngineerSignals) => boolean> = {
    apprenticeship: isApprenticeshipEligible,
    college_then_workplace_experience: isCollegeRouteEligible,
    experienced_worker_route: isExperiencedWorkerEligible,
  };

  const evaluations: RouteEvaluation[] = routeIds.map((id) => {
    const eligible = eligibilityFns[id](s);
    const affordability = evaluateAffordability(id, s);
    const score = eligible
      ? baseScore(id, s) + priorityBonus(id, s.routePriorities) + affordabilityAdjustment(affordability)
      : -1;
    return {
      id,
      displayTitle: ROUTE_TITLES[id],
      eligible,
      affordability,
      rankingScore: score,
      blockersAndChecks: eligible ? routeBlockersAndChecks(id, s) : [],
      immediateAction: routeImmediateAction(id),
      evidenceNote: EVIDENCE_NOTES[id],
    };
  });

  const eligible = evaluations.filter((e) => e.eligible);

  if (eligible.length === 0) {
    const bridgingAction =
      !s.availableTrainingPatterns.length
        ? "Identify at least one training pattern you could commit to for a year, then come back — most routes need some regular weekday or evening availability."
        : s.availableTrainingPatterns.every((p) => p === "weekends" || p === "availability_varies" || p === "not_sure_yet")
        ? "Weekend-only or highly variable availability rules out most current heating training patterns. Explore whether you could restructure to include some weekday hours, or start with a short introductory course."
        : "Contact an approved heating or building-services training provider and ask which single next step would open the routes closest to your situation.";

    return {
      status: "bridging_required",
      recommendedRouteId: null,
      alternativeRouteIds: [],
      affordabilityNotes: [],
      considerations,
      blockersAndChecks: [
        "Given your current situation, none of the standard training routes are directly open right now — a bridging step is needed first.",
      ],
      immediateAction: bridgingAction,
      evidenceNotes: [
        "Bridging steps commonly used: short introductory heating or plumbing courses; Functional Skills to plug English/maths gaps; changes to availability that unlock apprenticeship applications.",
      ],
      routeEvaluations: evaluations,
      missingSignals: [],
    };
  }

  const ranked = [...eligible].sort((a, b) => b.rankingScore - a.rankingScore);
  const best = ranked[0];
  const alternatives = ranked.slice(1);

  return {
    status: "route_recommended",
    recommendedRouteId: best.id,
    alternativeRouteIds: alternatives.map((r) => r.id),
    affordabilityNotes: ranked.flatMap((r) => r.affordability.notes),
    considerations,
    blockersAndChecks: best.blockersAndChecks,
    immediateAction: best.immediateAction,
    evidenceNotes: ranked.map((r) => r.evidenceNote),
    routeEvaluations: [...ranked, ...evaluations.filter((e) => !e.eligible)],
    missingSignals: [],
  };
};

export const ROUTE_DISPLAY_TITLES = ROUTE_TITLES;
