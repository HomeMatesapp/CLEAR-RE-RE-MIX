// Solicitor adapter — deterministic engine → RealityCheckResult.
//
// Verification payloads are built directly here so the LPC / transfer path
// never renders a `recommended` or `backup` route card. The scope note is
// appended to every non-insufficient result via checksBeforeCommitting.

import type {
  ModularRealityCheckPayload,
  ModularRouteCard,
  RealityCheckResult,
} from "../types";
import { buildModularPayload } from "./modular-payload";
import { buildEngineResultV2 } from "./to-result-v2";
import type { LegacyEngineOutput } from "@shared/career-evaluator/v1";
import {
  ROUTE_TITLES,
  runSolicitorEngine,
  type SolicitorEngineInput,
  type SolicitorEngineOutput,
  type SolicitorRouteEvaluation,
  type SolicitorRouteId,
} from "./solicitor";
import { CHARACTER_SUITABILITY_CAVEAT, solicitorFlavor } from "./solicitor-flavor";

export const SOLICITOR_SCOPE_NOTE =
  "This checker compares SQE, apprenticeship, degree, conversion, paralegal/QWE, qualified-lawyer transfer and LPC transitional routes into solicitor qualification in England & Wales. The SRA is the authority — this is not legal advice and does not decide eligibility.";

const readinessForStatus = (
  status: SolicitorEngineOutput["status"],
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
    case "ready_now":      return "Realistic but hard";
    case "nearly_ready":   return "Realistic but hard";
    case "needs_bridging": return "Long shot";
    case "high_risk_now":  return "Probably not for you";
  }
};

const cardForEvaluation = (
  ev: SolicitorRouteEvaluation,
  kind: ModularRouteCard["kind"],
  fit: string,
): ModularRouteCard => ({
  kind,
  title: ev.displayTitle,
  fit,
  constraint:
    ev.blockersAndChecks[0] ??
    "Confirm SRA requirements before committing to this route.",
  checks: ev.blockersAndChecks.slice(0, 3),
  timeCaveat: solicitorFlavor.timeCaveats[ev.id],
  costCaveat: solicitorFlavor.costCaveats[ev.id],
  patternCaveat: solicitorFlavor.patternCaveats[ev.id],
  nextAction: ev.immediateAction,
  affordable: ev.affordability.affordable,
});

const buildVerificationPayload = (
  out: SolicitorEngineOutput,
): ModularRealityCheckPayload => {
  const routes: ModularRouteCard[] = [];

  // LPC verification: render the LPC route as investigate_after_check primary.
  // Transfer verification: NO route card fabricated — the SRA sets the path.
  if (out.isLpcVerification && out.verificationPrimaryRouteId) {
    const primary = out.routeEvaluations.find(
      (r) => r.id === out.verificationPrimaryRouteId,
    );
    if (primary) {
      routes.push(
        cardForEvaluation(
          primary,
          "investigate_after_check",
          solicitorFlavor.investigateAfterCheckFit,
        ),
      );
    }
  }

  for (const id of out.mayOpenLaterRouteIds) {
    const ev = out.routeEvaluations.find((r) => r.id === id);
    if (!ev) continue;
    routes.push(
      cardForEvaluation(ev, "may_open_later", solicitorFlavor.mayOpenLaterFit),
    );
  }

  return {
    status: "qualification_verification_required",
    headline: out.isTransferVerification
      ? "An SRA check is needed before a UK solicitor route can be compared. Qualified-lawyer / exemption rules are set by the SRA, not this checker."
      : "An SRA transitional check is needed before a UK solicitor route can be confirmed. The LPC route is transitional and time-limited.",
    routes,
    checksBeforeCommitting: [
      ...out.blockersAndChecks,
      CHARACTER_SUITABILITY_CAVEAT,
      SOLICITOR_SCOPE_NOTE,
    ],
  };
};

const buildModularForSolicitor = (
  out: SolicitorEngineOutput,
): ModularRealityCheckPayload => {
  if (out.status === "qualification_verification_required") {
    return buildVerificationPayload(out);
  }
  const base = buildModularPayload<SolicitorRouteId>(out, solicitorFlavor);
  if (out.status === "insufficient_information") return base;
  return {
    ...base,
    checksBeforeCommitting: [
      ...base.checksBeforeCommitting,
      CHARACTER_SUITABILITY_CAVEAT,
      SOLICITOR_SCOPE_NOTE,
    ],
  };
};

const bestRouteForOutcome = (
  out: SolicitorEngineOutput,
): RealityCheckResult["bestRoute"] => {
  if (out.status === "route_recommended" && out.recommendedRouteId) {
    const best = out.routeEvaluations.find(
      (r) => r.id === out.recommendedRouteId,
    )!;
    const whyThisFits: string[] = [
      "This route appears structurally relevant to your answers. It is not a promise of qualification — the SRA is the authority.",
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
        "This appears to be the strongest structural route from your answers. Final admission is decided by the SRA, not this checker.",
      whyThisFits,
      estimatedTime:
        solicitorFlavor.timeCaveats[best.id] ?? "Depends on your route and QWE",
      likelyCost:
        solicitorFlavor.costCaveats[best.id] ??
        "Confirm total training and SQE costs before committing",
      mainDifficulty:
        best.blockersAndChecks[0] ??
        "Confirm SRA requirements before committing to this route.",
      confidence: "medium",
    };
  }
  const title =
    out.status === "qualification_verification_required"
      ? out.isTransferVerification
        ? "An SRA qualified-lawyer / exemption check is needed before a UK solicitor route can be compared"
        : "An SRA LPC transitional check is needed before a UK solicitor route can be confirmed"
      : out.status === "bridging_required"
        ? "A bridging step is needed before the standard solicitor routes open"
        : "We need a few more answers before comparing solicitor routes";
  return {
    title,
    summary:
      out.status === "qualification_verification_required"
        ? "The SRA is the authority for this check. The step below is the next concrete action — it is not a training route in itself."
        : out.status === "bridging_required"
          ? "None of the standard solicitor routes are directly open from your current situation. The step below is the bridging action, not a route."
          : "Some critical answers are missing. Complete them and we'll compare routes for you.",
    whyThisFits: [],
    estimatedTime: "Depends on the outcome of the step below",
    likelyCost: "Depends on the outcome of the step below",
    mainDifficulty: out.blockersAndChecks[0] ?? "",
    confidence: "low",
  };
};

const backupRouteForOutcome = (
  out: SolicitorEngineOutput,
): RealityCheckResult["backupRoute"] => {
  const altId: SolicitorRouteId | undefined = out.alternativeRouteIds[0];
  if (altId) {
    const alt = out.routeEvaluations.find((r) => r.id === altId)!;
    return {
      title: alt.displayTitle,
      summary:
        "A second structurally relevant route from your answers. Compare against the recommended route and confirm SRA requirements for your situation.",
      tradeOff:
        "Different timeline, cost and evidence value — see the caveats and checks on the card.",
    };
  }
  return {
    title: "No secondary route from your current answers",
    summary: "Only one structural route was relevant from what you told us.",
    tradeOff: "",
  };
};

const routeToAvoidFor = (): RealityCheckResult["routeToAvoid"] => ({
  title:
    "Paying for a conversion course or SQE prep course without checking SRA rules and outcome claims",
  whyRisky:
    "Conversion (PGDL / equivalent) is not always formally required for SQE. SQE prep providers vary widely in cost and outcome evidence. Paying before confirming SRA rules is the most common expensive wrong turn.",
  whenItMightWork:
    "When you've independently confirmed the SRA rules for your situation, checked prep-provider claims (pass-rate methodology, refund terms, outcome evidence) and treated the course as SQE preparation only — not as proof of admission.",
});

const firstMovesFor = (out: SolicitorEngineOutput): string[] => {
  const moves = [out.immediateAction];
  if (out.status === "route_recommended" && out.alternativeRouteIds[0]) {
    const alt = out.routeEvaluations.find(
      (r) => r.id === out.alternativeRouteIds[0],
    )!;
    moves.push(`Compare the alternative route: ${alt.immediateAction}`);
  }
  moves.push(
    "Read the SRA SQE, QWE and admission guidance directly before paying for any conversion or prep course.",
  );
  return moves.slice(0, 3);
};

export const buildSolicitorResult = (
  input: SolicitorEngineInput,
  _answers?: unknown,
): RealityCheckResult => {
  void _answers;
  const out = runSolicitorEngine(input);
  const readiness = readinessForStatus(out.status);
  const reason =
    out.status === "route_recommended"
      ? "Your answers point to at least one structurally relevant SQE-family route. Final admission is decided by the SRA."
      : out.status === "qualification_verification_required"
        ? out.isTransferVerification
          ? "An SRA qualified-lawyer / exemption check is needed before a UK solicitor route can be compared."
          : "An SRA LPC transitional check is needed before a UK solicitor route can be confirmed."
        : out.status === "bridging_required"
          ? "None of the standard UK solicitor routes are directly open from your current situation — a bridging step is needed first."
          : "We need a few more answers before we can compare solicitor routes.";

  const biggestBlocker =
    out.blockersAndChecks[0] ??
    "No single structural blocker stood out from what you told us — but confirm SRA requirements before committing.";

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
    modular: buildModularForSolicitor(out),
    resultV2: buildEngineResultV2(out as unknown as LegacyEngineOutput, { timeCaveats: {}, costCaveats: {} }, { engineId: "legacy:solicitor", slug: "solicitor", careerTitle: "Solicitor" }, (_answers ?? {}) as never),
  };
};

export { runSolicitorEngine };
export type { SolicitorEngineOutput };
