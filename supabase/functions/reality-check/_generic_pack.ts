// Edge-runtime wrapper for the shared generic career-pack evaluator.
//
// PR 1 exposes this only as a bundling-and-execution proof. PR 2 will call it
// from `index.ts` after server-side pack resolution via role_pack_bindings.
// The client NEVER supplies pack IDs; resolution is server-only.

import { evaluate, evaluateV2 } from "../_shared/career-evaluator/v1/evaluate.ts";
import { careerDecisionPackV1 } from "../_shared/career-evaluator/v1/schema.ts";
import type {
  AnswerMap,
  CareerDecisionPackV1,
  RealityCheckResultV1,
} from "../_shared/career-evaluator/v1/types.ts";
import type { RealityCheckResultV2 } from "../_shared/career-evaluator/v1/result-v2.ts";

export const evaluateGenericPack = (
  packJson: unknown,
  answers: AnswerMap,
): RealityCheckResultV1 => {
  const parsed = careerDecisionPackV1.safeParse(packJson);
  if (!parsed.success) {
    throw new Error(
      "generic pack failed schema validation: " +
        parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    );
  }
  return evaluate(parsed.data as CareerDecisionPackV1, answers);
};

/** Increment 2: standard-contract evaluation for the same pack + answers.
 *  Runs alongside evaluateGenericPack — the V1 result remains the payload the
 *  current UI renders; the V2 result is served and persisted so downstream
 *  increments can adopt it without re-evaluating. */
export const evaluateGenericPackV2 = (
  packJson: unknown,
  answers: AnswerMap,
  opts: { now?: string; assessmentId?: string } = {},
): RealityCheckResultV2 => {
  const parsed = careerDecisionPackV1.safeParse(packJson);
  if (!parsed.success) {
    throw new Error(
      "generic pack failed schema validation: " +
        parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    );
  }
  return evaluateV2(parsed.data as CareerDecisionPackV1, answers, opts);
};
