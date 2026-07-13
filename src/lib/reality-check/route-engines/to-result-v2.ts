// Convergence step 1 (Increment 10): every reviewed legacy engine's result
// carries the standard V2 contract alongside the modular payload it already
// renders. One shared attachment point; the decision comes from the engine
// unchanged — legacyEngineOutputToResultV2 maps it without altering it.

import {
  legacyEngineOutputToResultV2,
  type LegacyEngineOutput,
  type RealityCheckResultV2,
} from "@shared/career-evaluator/v1";
import type { AnswerMap } from "@shared/career-evaluator/v1/types";
import type { RealityCheckAnswers } from "@/lib/reality-check/types";

interface EngineMeta {
  engineId: string;
  slug: string;
  careerTitle: string;
}

interface FlavorLabels {
  timeCaveats: Partial<Record<string, string>>;
  costCaveats: Partial<Record<string, string>>;
}

export const buildEngineResultV2 = (
  out: LegacyEngineOutput,
  flavor: FlavorLabels,
  meta: EngineMeta,
  answers: RealityCheckAnswers,
): RealityCheckResultV2 =>
  legacyEngineOutputToResultV2(out, {
    engineId: meta.engineId,
    slug: meta.slug,
    careerTitle: meta.careerTitle,
    answersSnapshot: { ...(answers as unknown as AnswerMap) },
    durationLabels: flavor.timeCaveats as Record<string, string>,
    costLabels: flavor.costCaveats as Record<string, string>,
  });
