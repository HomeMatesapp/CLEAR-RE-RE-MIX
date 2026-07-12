// Public entry point for the shared career evaluator.
// Consumers should import from "@shared/career-evaluator/v1".

export * from "./types.ts";
export * from "./regulatory.ts";
export * from "./phrases.ts";
export * from "./result-v2.ts";
export { evaluate, evaluateV2, matchesCondition } from "./evaluate.ts";
export { careerDecisionPackV1, validatePackCrossRefs, validatePublicationGates, collectPredicates } from "./schema.ts";
export { legacyEngineOutputToResultV2 } from "./legacy-adapter.ts";
export type { LegacyEngineOutput, LegacyAdapterMeta, LegacyEngineStatus } from "./legacy-adapter.ts";
