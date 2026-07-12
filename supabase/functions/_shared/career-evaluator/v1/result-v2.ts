// RealityCheckResultV2 — the standard result contract (Increment 1).
//
// Every decision path in the product converges on this shape:
//   • generic career packs via evaluateV2()            (sourceKind "career_pack")
//   • the eight reviewed legacy engines via adapters    (sourceKind "legacy_engine")
//
// Design invariants (binding, tested):
//   1. Formal ELIGIBILITY and PRACTICAL FIT are separate axes. Budget,
//      schedule and caring constraints may change practical fit; they can
//      NEVER change eligibility, and neither axis is derived from the other.
//   2. No probability language anywhere. Statuses describe the current
//      position, not chances of success (enforced by FORBIDDEN_LANGUAGE).
//   3. Results are immutable snapshots: answersSnapshot is copied at
//      evaluation time and never mutated afterwards.
//   4. Requirements the pack gave the evaluator no way to assess are reported
//      honestly under requirementsNotAssessed — never guessed into met/notMet.
//
// Runtime-neutral: imported by both the Vite frontend and Deno edge functions.

import { z } from "zod";
import type { AnswerMap, ImmediateAction } from "./types.ts";

// ── Status axes ─────────────────────────────────────────────────────────────

export const ELIGIBILITY_STATUSES = [
  "available_now",
  "available_with_conditions",
  "requires_verification",
  "not_currently_available",
  "insufficient_information",
] as const;
export type EligibilityStatus = (typeof ELIGIBILITY_STATUSES)[number];

export const PRACTICAL_FIT_STATUSES = [
  "appears_manageable",
  "constraints_to_weigh",
  "insufficient_information",
] as const;
export type PracticalFitStatus = (typeof PRACTICAL_FIT_STATUSES)[number];

/** Deterministic, language-safe explanations rendered to participants. */
export const ELIGIBILITY_EXPLANATION: Record<EligibilityStatus, string> = {
  available_now:
    "The formal entry conditions we could assess from your answers appear to be in place for this route.",
  available_with_conditions:
    "This route appears open, with trade-offs noted below to weigh up first.",
  requires_verification:
    "One or more entry conditions need formal verification before this route can be confirmed.",
  not_currently_available:
    "One or more entry conditions are not currently in place, so this route does not appear open right now.",
  insufficient_information:
    "We do not yet have enough answers to assess the entry conditions for this route.",
};

export const PRACTICAL_FIT_EXPLANATION: Record<PracticalFitStatus, string> = {
  appears_manageable:
    "Nothing in your answers flagged a practical constraint for this route.",
  constraints_to_weigh:
    "Your answers flagged practical constraints (such as time, cost or schedule) worth weighing before committing. These do not affect formal eligibility.",
  insufficient_information:
    "We do not yet have enough answers to comment on the practicalities of this route.",
};

// ── Route evaluation ────────────────────────────────────────────────────────

export interface RouteEvaluationV2 {
  routeId: string;
  routeTitle: string;
  /** Formal-eligibility axis. NEVER derived from practical fit. */
  eligibility: EligibilityStatus;
  /** Practical-fit axis. NEVER derived from eligibility. */
  practicalFit: PracticalFitStatus;
  /** Requirement labels, by evaluation outcome. */
  requirementsMet: readonly string[];
  requirementsNotMet: readonly string[];
  requirementsUnknown: readonly string[];
  /** Requirements attached to the route that the pack gave the evaluator no
   *  way to assess (no rule mark, no machineRule). Content-completeness
   *  signal; does not drive eligibility. Always empty for legacy engines. */
  requirementsNotAssessed: readonly string[];
  /** Practical constraints flagged for this route. */
  constraints: readonly string[];
  concerns: readonly string[];
  verificationsRequired: readonly string[];
  scheduleImplications: readonly string[];
  durationLabel: string;
  costLabel: string;
  evidenceRefs: readonly string[];
  immediateActionIds: readonly string[];
  /** Standard comparison fields (Increment 5 consumes these). */
  comparison: Readonly<Record<string, string>>;
  /** Deterministic participant-facing explanation of the two statuses. */
  participantExplanation: string;
}

// ── Evidence coverage (coverage, never a probability) ───────────────────────

export interface EvidenceCoverageV2 {
  level: "comprehensive" | "adequate" | "limited";
  completedAnswerCount: number;
  totalAnswerCount: number;
  note: string;
}

// ── Result ──────────────────────────────────────────────────────────────────

export interface RealityCheckResultV2 {
  schemaVersion: "reality-check-result/v2";
  /** Where the decision logic came from. */
  sourceKind: "career_pack" | "legacy_engine";
  /** Present when sourceKind === "career_pack". */
  packVersion?: string;
  /** Present when sourceKind === "legacy_engine", e.g. "legacy:solicitor". */
  engineId?: string;
  /** Canonical role id where known. */
  careerId?: string;
  slug: string;
  careerTitle: string;
  assessmentId: string;
  evaluatedAt: string;
  /** Immutable snapshot of the answers evaluated. */
  answersSnapshot: AnswerMap;
  routes: readonly RouteEvaluationV2[];
  /** Top non-blocked route, or null when nothing is currently open. */
  strongestRouteId: string | null;
  alternativeRouteIds: readonly string[];
  /** Language-safe overall summary. */
  summary: string;
  unresolvedChecks: readonly string[];
  considerations: readonly string[];
  immediateActions: readonly ImmediateAction[];
  evidenceRefs: readonly string[];
  limitations: readonly string[];
  evidenceCoverage?: EvidenceCoverageV2;
  /** Embedded legacy participant payload so the current UI renders unchanged
   *  during migration. Never used for new decisions. */
  legacy?: unknown;
}

// ── Zod schema (snapshot readers + publish gates) ───────────────────────────

const routeEvaluationV2 = z.object({
  routeId: z.string().min(1),
  routeTitle: z.string().min(1),
  eligibility: z.enum(ELIGIBILITY_STATUSES),
  practicalFit: z.enum(PRACTICAL_FIT_STATUSES),
  requirementsMet: z.array(z.string()),
  requirementsNotMet: z.array(z.string()),
  requirementsUnknown: z.array(z.string()),
  requirementsNotAssessed: z.array(z.string()),
  constraints: z.array(z.string()),
  concerns: z.array(z.string()),
  verificationsRequired: z.array(z.string()),
  scheduleImplications: z.array(z.string()),
  durationLabel: z.string(),
  costLabel: z.string(),
  evidenceRefs: z.array(z.string()),
  immediateActionIds: z.array(z.string()),
  comparison: z.record(z.string()),
  participantExplanation: z.string(),
});

export const realityCheckResultV2 = z.object({
  schemaVersion: z.literal("reality-check-result/v2"),
  sourceKind: z.enum(["career_pack", "legacy_engine"]),
  packVersion: z.string().optional(),
  engineId: z.string().optional(),
  careerId: z.string().optional(),
  slug: z.string().min(1),
  careerTitle: z.string().min(1),
  assessmentId: z.string().min(1),
  evaluatedAt: z.string().min(4),
  answersSnapshot: z.record(z.union([z.string(), z.array(z.string()), z.boolean(), z.number(), z.null()])),
  routes: z.array(routeEvaluationV2),
  strongestRouteId: z.string().nullable(),
  alternativeRouteIds: z.array(z.string()),
  summary: z.string().min(1),
  unresolvedChecks: z.array(z.string()),
  considerations: z.array(z.string()),
  immediateActions: z.array(z.object({
    actionTemplateId: z.string(),
    title: z.string(),
    description: z.string(),
    evidenceRefs: z.array(z.string()),
  })),
  evidenceRefs: z.array(z.string()),
  limitations: z.array(z.string()),
  evidenceCoverage: z.object({
    level: z.enum(["comprehensive", "adequate", "limited"]),
    completedAnswerCount: z.number(),
    totalAnswerCount: z.number(),
    note: z.string(),
  }).optional(),
  legacy: z.unknown().optional(),
});

/** UUID where the runtime provides one; deterministic-enough fallback for
 *  older runtimes. Injectable in tests via EvaluateV2Options.assessmentId. */
export const newAssessmentId = (): string => {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `assessment-${Date.now()}-${Math.floor(Math.random() * 1e9).toString(36)}`;
};
