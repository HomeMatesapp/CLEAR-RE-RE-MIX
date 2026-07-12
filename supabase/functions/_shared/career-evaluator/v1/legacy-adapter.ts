// Compatibility adapter: legacy modular engine output → RealityCheckResultV2.
//
// The eight reviewed engines (electrician, plumber, heating engineer,
// software engineer, registered nurse, police officer, actor, solicitor) are
// NOT modified. Their outputs all conform structurally to LegacyEngineOutput
// (mirroring ModularEngineOutputShape in
// src/lib/reality-check/route-engines/modular-payload.ts and its Deno
// mirror). This adapter maps that output onto the V2 contract WITHOUT
// changing any decision:
//
//   engine status                        → result-level meaning
//   ─────────────────────────────────────────────────────────────────────
//   route_recommended                    → strongestRouteId = recommended
//   qualification_verification_required → eligible routes are
//                                          requires_verification
//   bridging_required                    → no route currently available
//   insufficient_information             → insufficient information
//
//   per-route eligible flag              → eligibility axis
//   per-route affordability + blockers   → practical-fit axis
//
// Eligibility and practical fit remain SEPARATE axes: the legacy engines
// already keep budget out of eligibility (asserted in their own tests), so
// this mapping loses nothing.
//
// requirementsMet / requirementsNotMet are always empty here: the legacy
// engines do not expose per-requirement outcomes. Their blockers surface as
// concerns/verifications, and missing signals surface as unresolved checks.

import type { AnswerMap } from "./types.ts";
import {
  newAssessmentId,
  type EligibilityStatus,
  type PracticalFitStatus,
  type RealityCheckResultV2,
  type RouteEvaluationV2,
} from "./result-v2.ts";
import { ELIGIBILITY_EXPLANATION, PRACTICAL_FIT_EXPLANATION } from "./result-v2.ts";

export type LegacyEngineStatus =
  | "route_recommended"
  | "qualification_verification_required"
  | "bridging_required"
  | "insufficient_information";

/** Structural mirror of ModularEngineOutputShape — every reviewed engine's
 *  output satisfies this without modification. */
export interface LegacyEngineOutput {
  status: LegacyEngineStatus;
  recommendedRouteId: string | null;
  alternativeRouteIds: readonly string[];
  considerations: readonly string[];
  blockersAndChecks: readonly string[];
  immediateAction: string;
  missingSignals: readonly string[];
  routeEvaluations: readonly {
    id: string;
    displayTitle: string;
    eligible: boolean;
    affordability: { affordable: boolean; notes: readonly string[] };
    blockersAndChecks: readonly string[];
    immediateAction: string;
  }[];
}

export interface LegacyAdapterMeta {
  /** e.g. "legacy:electrician" */
  engineId: string;
  slug: string;
  careerTitle: string;
  careerId?: string;
  assessmentId?: string;
  /** ISO datetime; injectable so tests are deterministic. */
  now?: string;
  /** The answers/signals the engine was run against (snapshotted). */
  answersSnapshot: AnswerMap;
  /** The exact participant-facing payload the current UI renders (e.g. the
   *  ModularRealityCheckPayload). Embedded unchanged under `legacy` so
   *  rendering is bit-identical during migration. */
  legacyPayload?: unknown;
  /** Optional per-route descriptor labels (from the engine flavor). */
  durationLabels?: Readonly<Record<string, string>>;
  costLabels?: Readonly<Record<string, string>>;
}

const SUMMARY_FOR_STATUS: Record<LegacyEngineStatus, string> = {
  route_recommended:
    "At least one training route appears structurally suitable from your answers. Formal eligibility and practical fit are assessed separately below.",
  qualification_verification_required:
    "Your existing qualification needs formal verification before any route can be confirmed. Verification is a bridging step, not a training route.",
  bridging_required:
    "None of the standard training routes are directly open from your current situation — a bridging step is needed first.",
  insufficient_information:
    "We need a few more answers before we can compare training routes for you.",
};

const routeEligibility = (
  status: LegacyEngineStatus,
  eligible: boolean,
): EligibilityStatus => {
  if (status === "insufficient_information") return "insufficient_information";
  if (!eligible) return "not_currently_available";
  if (status === "qualification_verification_required") return "requires_verification";
  return "available_now";
};

const routePracticalFit = (
  status: LegacyEngineStatus,
  affordable: boolean,
): PracticalFitStatus => {
  if (status === "insufficient_information") return "insufficient_information";
  return affordable ? "appears_manageable" : "constraints_to_weigh";
};

export const legacyEngineOutputToResultV2 = (
  output: LegacyEngineOutput,
  meta: LegacyAdapterMeta,
): RealityCheckResultV2 => {
  const routes: RouteEvaluationV2[] = output.routeEvaluations.map((ev) => {
    const eligibility = routeEligibility(output.status, ev.eligible);
    const practicalFit = routePracticalFit(output.status, ev.affordability.affordable);
    const constraints = ev.affordability.affordable ? [] : [...ev.affordability.notes];
    const isVerification = output.status === "qualification_verification_required" && ev.eligible;
    return {
      routeId: ev.id,
      routeTitle: ev.displayTitle,
      eligibility,
      practicalFit,
      requirementsMet: [],
      requirementsNotMet: [],
      requirementsUnknown: [],
      requirementsNotAssessed: [],
      constraints,
      concerns: isVerification ? [] : [...ev.blockersAndChecks],
      verificationsRequired: isVerification ? [...ev.blockersAndChecks] : [],
      scheduleImplications: [],
      durationLabel: meta.durationLabels?.[ev.id] ?? "Varies by provider — check before committing.",
      costLabel: meta.costLabels?.[ev.id] ?? "Varies by provider — check before committing.",
      evidenceRefs: [],
      immediateActionIds: [],
      comparison: {},
      participantExplanation:
        `${ELIGIBILITY_EXPLANATION[eligibility]} ${PRACTICAL_FIT_EXPLANATION[practicalFit]}`,
    };
  });

  const strongestRouteId =
    output.status === "route_recommended" && typeof output.recommendedRouteId === "string"
      ? output.recommendedRouteId
      : null;

  const unresolvedChecks = [
    ...new Set([
      ...(output.status === "qualification_verification_required" || output.status === "bridging_required"
        ? output.blockersAndChecks
        : []),
      ...output.missingSignals,
    ]),
  ];

  return {
    schemaVersion: "reality-check-result/v2",
    sourceKind: "legacy_engine",
    engineId: meta.engineId,
    careerId: meta.careerId,
    slug: meta.slug,
    careerTitle: meta.careerTitle,
    assessmentId: meta.assessmentId ?? newAssessmentId(),
    evaluatedAt: meta.now ?? new Date().toISOString(),
    answersSnapshot: { ...meta.answersSnapshot },
    routes,
    strongestRouteId,
    alternativeRouteIds: output.alternativeRouteIds.filter((id) => id !== strongestRouteId),
    summary: SUMMARY_FOR_STATUS[output.status],
    unresolvedChecks,
    considerations: [...output.considerations],
    immediateActions: output.immediateAction
      ? [{
          actionTemplateId: "legacy_immediate_action",
          title: "Immediate next step",
          description: output.immediateAction,
          evidenceRefs: [],
        }]
      : [],
    evidenceRefs: [],
    limitations: [
      "This result was produced by a reviewed role-specific engine and adapted to the standard contract. Per-requirement outcomes are shown as blockers and checks rather than itemised requirements.",
    ],
    legacy: meta.legacyPayload,
  };
};
