// Registered Nurse adapter — deterministic engine → RealityCheckResult.
//
// The `qualification_verification_required` payload is built directly here
// (not via the shared modular-payload builder) so we can render:
//   - the primary verification route as `investigate_after_check`
//   - UK training routes as `may_open_later` (never as recommended/backup)
// in the same result. Every non-`insufficient_information` result also
// includes:
//   - the non-approved-diploma warning
//   - the NMC-approved-programme footer
// enforced by tests.

import type {
  ModularRealityCheckPayload,
  ModularRouteCard,
  RealityCheckResult,
} from "../types";
import { buildModularPayload } from "./modular-payload";
import { buildEngineResultV2 } from "./to-result-v2";
import type { LegacyEngineOutput } from "@shared/career-evaluator/v1";
import {
  NMC_APPROVED_FOOTER,
  NON_APPROVED_DIPLOMA_WARNING,
  ROUTE_TITLES,
  runRegisteredNurseEngine,
  type RegisteredNurseEngineInput,
  type RegisteredNurseEngineOutput,
  type RegisteredNurseRouteEvaluation,
  type RegisteredNurseRouteId,
} from "./registered-nurse";
import { registeredNurseFlavor } from "./registered-nurse-flavor";

const readinessForStatus = (
  status: RegisteredNurseEngineOutput["status"],
): RealityCheckResult["readiness"] => {
  switch (status) {
    case "route_recommended":
      return "ready_now";
    case "qualification_verification_required":
      return "needs_bridging";
    case "bridging_required":
      return "needs_bridging";
    case "insufficient_information":
      return "nearly_ready";
  }
};

const overallVerdictFor = (
  readiness: RealityCheckResult["readiness"],
): RealityCheckResult["overallVerdict"] => {
  switch (readiness) {
    case "ready_now":      return "Realistic";
    case "nearly_ready":   return "Realistic but hard";
    case "needs_bridging": return "Long shot";
    case "high_risk_now":  return "Probably not for you";
  }
};

const cardForEvaluation = (
  ev: RegisteredNurseRouteEvaluation,
  kind: ModularRouteCard["kind"],
  fit: string,
): ModularRouteCard => ({
  kind,
  title: ev.displayTitle,
  fit,
  constraint:
    ev.blockersAndChecks[0] ??
    "Confirm entry requirements with an NMC-approved provider or employer.",
  checks: ev.blockersAndChecks.slice(0, 3),
  timeCaveat: registeredNurseFlavor.timeCaveats[ev.id],
  costCaveat: registeredNurseFlavor.costCaveats[ev.id],
  patternCaveat: registeredNurseFlavor.patternCaveats[ev.id],
  nextAction: ev.immediateAction,
  affordable: ev.affordability.affordable,
});

/** Build the verification-required payload directly so we can mix
 *  `investigate_after_check` (primary) and `may_open_later` (UK alternatives)
 *  card kinds within one status. */
const buildVerificationPayload = (
  out: RegisteredNurseEngineOutput,
): ModularRealityCheckPayload => {
  const primary = out.verificationPrimaryRouteId
    ? out.routeEvaluations.find((r) => r.id === out.verificationPrimaryRouteId)
    : undefined;
  const routes: ModularRouteCard[] = [];
  if (primary) {
    routes.push(
      cardForEvaluation(
        primary,
        "investigate_after_check",
        registeredNurseFlavor.investigateAfterCheckFit,
      ),
    );
  }
  for (const id of out.mayOpenLaterRouteIds) {
    const ev = out.routeEvaluations.find((r) => r.id === id);
    if (!ev) continue;
    routes.push(
      cardForEvaluation(ev, "may_open_later", registeredNurseFlavor.mayOpenLaterFit),
    );
  }
  return {
    status: "qualification_verification_required",
    headline:
      "Your existing qualification or registration needs a formal check before any UK training route can be considered. Verification is a step, not a training route.",
    routes,
    checksBeforeCommitting: [
      ...out.blockersAndChecks,
      NON_APPROVED_DIPLOMA_WARNING,
      NMC_APPROVED_FOOTER,
    ],
  };
};

const buildModularForNurse = (
  out: RegisteredNurseEngineOutput,
): ModularRealityCheckPayload => {
  if (out.status === "qualification_verification_required") {
    return buildVerificationPayload(out);
  }
  const base = buildModularPayload<RegisteredNurseRouteId>(
    out,
    registeredNurseFlavor,
  );
  if (out.status === "insufficient_information") {
    return base;
  }
  // Append the non-approved-diploma warning and the NMC-approved footer
  // to every non-insufficient result. Tests enforce their presence.
  return {
    ...base,
    checksBeforeCommitting: [
      ...base.checksBeforeCommitting,
      NON_APPROVED_DIPLOMA_WARNING,
      NMC_APPROVED_FOOTER,
    ],
  };
};

const bestRouteForOutcome = (
  out: RegisteredNurseEngineOutput,
): RealityCheckResult["bestRoute"] => {
  if (out.status === "route_recommended" && out.recommendedRouteId) {
    const best = out.routeEvaluations.find(
      (r) => r.id === out.recommendedRouteId,
    )!;
    const whyThisFits: string[] = [
      "This route appears structurally relevant to your situation — it is not a promise of NMC registration.",
    ];
    if (out.alternativeRouteIds.length > 0) {
      whyThisFits.push(
        `Also worth comparing: ${out.alternativeRouteIds
          .map((id) => ROUTE_TITLES[id])
          .join("; ")}.`,
      );
    }
    return {
      title: best.displayTitle,
      summary:
        "This appears to be the strongest structural route from what you told us. Only NMC-approved programmes lead to registration — confirm the course is approved before applying.",
      whyThisFits,
      estimatedTime:
        registeredNurseFlavor.timeCaveats[best.id] ?? "Depends on the provider",
      likelyCost:
        registeredNurseFlavor.costCaveats[best.id] ??
        "Confirm current fees with the provider before committing",
      mainDifficulty:
        best.blockersAndChecks[0] ??
        "Confirm entry requirements with an NMC-approved provider or employer.",
      confidence: "medium",
    };
  }
  const title =
    out.status === "qualification_verification_required"
      ? "A formal check is needed before any UK training route can be considered"
      : out.status === "bridging_required"
        ? "A bridging step is needed before the standard nursing routes open"
        : "We need a few more answers before comparing nursing routes";
  return {
    title,
    summary:
      out.status === "qualification_verification_required"
        ? "The NMC is the UK authority for nurse registration. The check below is the next concrete step — it is not a training route in itself."
        : out.status === "bridging_required"
          ? "None of the standard UK nursing routes are directly open from your current situation. The step below is the bridging action, not a route."
          : "Some critical answers are missing. Complete them and we'll compare routes for you.",
    whyThisFits: [],
    estimatedTime: "Depends on the outcome of the step below",
    likelyCost: "Depends on the outcome of the step below",
    mainDifficulty: out.blockersAndChecks[0] ?? "",
    confidence: "low",
  };
};

const backupRouteForOutcome = (
  out: RegisteredNurseEngineOutput,
): RealityCheckResult["backupRoute"] => {
  const altId: RegisteredNurseRouteId | undefined = out.alternativeRouteIds[0];
  if (altId) {
    const alt = out.routeEvaluations.find((r) => r.id === altId)!;
    return {
      title: alt.displayTitle,
      summary:
        "A second structurally relevant route from your answers. Compare it against the recommended route and confirm entry requirements with the provider or employer.",
      tradeOff:
        "Different timeline and delivery model — see the caveats and blockers notes.",
    };
  }
  return {
    title: "No secondary route from your current answers",
    summary: "Only one route was structurally relevant from what you told us.",
    tradeOff: "",
  };
};

const routeToAvoidFor = (): RealityCheckResult["routeToAvoid"] => ({
  title: "A non-NMC-approved \"nursing diploma\" course",
  whyRisky:
    "Only NMC-approved programmes lead to registration as a nurse in the UK. Courses marketed as \"nursing diplomas\" that are not NMC-approved do not lead to NMC registration, regardless of how they are advertised.",
  whenItMightWork:
    "Never as a route to UK NMC registration. If the same content is later delivered inside an NMC-approved programme, that is a different situation — confirm the specific programme is on the NMC approved list.",
});

const firstMovesFor = (out: RegisteredNurseEngineOutput): string[] => {
  const moves = [out.immediateAction];
  if (out.status === "route_recommended" && out.alternativeRouteIds[0]) {
    const alt = out.routeEvaluations.find(
      (r) => r.id === out.alternativeRouteIds[0],
    )!;
    moves.push(`Compare the alternative route: ${alt.immediateAction}`);
  }
  moves.push(
    "Check the course you are considering is on the NMC approved-programmes list before paying any fees.",
  );
  return moves.slice(0, 3);
};

export const buildRegisteredNurseResult = (
  input: RegisteredNurseEngineInput,
  _answers?: unknown,
): RealityCheckResult => {
  void _answers;
  const out = runRegisteredNurseEngine(input);
  const readiness = readinessForStatus(out.status);
  const reason =
    out.status === "route_recommended"
      ? "Your answers point to at least one structurally relevant UK nursing route. Only NMC-approved programmes lead to registration."
      : out.status === "qualification_verification_required"
        ? "A formal verification step is needed before any UK training route can be considered."
        : out.status === "bridging_required"
          ? "None of the standard UK nursing routes are directly open from your current situation — a bridging step is needed first."
          : "We need a few more answers before we can compare nursing routes.";

  const biggestBlocker =
    out.blockersAndChecks[0] ??
    "No single structural blocker stood out from what you told us.";

  return {
    readiness,
    readinessReason: reason,
    biggestBlocker,
    immediateAction: out.immediateAction,
    overallVerdict: overallVerdictFor(readiness),
    bestRoute: bestRouteForOutcome(out),
    backupRoute: backupRouteForOutcome(out),
    routeToAvoid: routeToAvoidFor(),
    firstMoves: firstMovesFor(out),
    considerations: out.considerations.length ? out.considerations : undefined,
    modular: buildModularForNurse(out),
    resultV2: buildEngineResultV2(out as unknown as LegacyEngineOutput, registeredNurseFlavor, { engineId: "legacy:registered-nurse", slug: "registered-nurse", careerTitle: "Registered Nurse" }, (_answers ?? {}) as never),
  };
};

export { runRegisteredNurseEngine };
export type { RegisteredNurseEngineOutput };
