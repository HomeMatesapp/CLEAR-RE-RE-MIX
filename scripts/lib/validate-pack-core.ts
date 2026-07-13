// Pack validation core (Increment 11).
//
// One function that runs EVERY check a career pack must pass, in order:
//   1. Schema parse (career-decision-pack/v1, with all Increment extensions)
//   2. Cross-reference integrity
//   3. Publication gates (renderability, assessability, evidence, dead
//      questions) — errors by default; downgradable to warnings for
//      pre-Increment legacy packs
//   4. Every test profile evaluated through BOTH contracts:
//        • determinism (hash-compared double run, pinned clock)
//        • V2 result validates against the Zod contract
//        • declared expectations honoured (blockedRouteIds → V2
//          not_currently_available; mustMention / mustNotMention against the
//          combined result text; requiredActionIds present)
//   5. Forbidden-language scan of participant-facing pack content AND of
//      every profile's V1 + V2 results (QA fixtures excluded from the pack
//      scan — their mustNotMention lists legitimately contain the phrases)
//
// Used by the CLI (scripts/validate-pack.ts) and by vitest. The publish
// pipeline's server-side checks remain authoritative; this is the authoring
// loop's fast, complete local answer.

import { careerDecisionPackV1, validatePackCrossRefs, validatePublicationGates } from "../../supabase/functions/_shared/career-evaluator/v1/schema";
import { evaluate, evaluateV2 } from "../../supabase/functions/_shared/career-evaluator/v1/evaluate";
import { realityCheckResultV2 } from "../../supabase/functions/_shared/career-evaluator/v1/result-v2";
import { canonicalHash } from "../../supabase/functions/_shared/career-evaluator/v1/hash";
import { FORBIDDEN_LANGUAGE } from "../../supabase/functions/_shared/career-evaluator/v1/phrases";
import type { CareerDecisionPackV1 } from "../../supabase/functions/_shared/career-evaluator/v1/types";

export interface PackValidationReport {
  ok: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    routes: number;
    requirements: number;
    questions: number;
    rules: number;
    evidenceRecords: number;
    testProfiles: number;
    machineAssessableRequirements: number;
  };
}

export interface ValidatePackOptions {
  /** Downgrade publication-gate failures to warnings (for inspecting
   *  pre-Increment legacy packs such as midwife 1.0.0). Default false:
   *  new packs must pass the gates. */
  allowGateFailures?: boolean;
  /** Pinned clock for deterministic evaluation. */
  now?: string;
}

const NOW_DEFAULT = "2026-01-01T00:00:00.000Z";

export const validatePackContent = async (
  packJson: unknown,
  opts: ValidatePackOptions = {},
): Promise<PackValidationReport> => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const now = opts.now ?? NOW_DEFAULT;

  // 1. Schema
  const parsed = careerDecisionPackV1.safeParse(packJson);
  if (!parsed.success) {
    for (const i of parsed.error.issues) errors.push(`schema: ${i.path.join(".")}: ${i.message}`);
    return { ok: false, errors, warnings, stats: emptyStats() };
  }
  const pack = parsed.data as CareerDecisionPackV1;

  // 2. Cross-refs
  for (const e of validatePackCrossRefs(packJson)) errors.push(`cross-ref: ${e}`);

  // 3. Publication gates
  const gateErrors = validatePackCrossRefs(packJson).length ? [] : validatePublicationGates(packJson);
  for (const g of gateErrors) {
    if (opts.allowGateFailures) warnings.push(`gate: ${g}`);
    else errors.push(`gate: ${g}`);
  }

  // 5a. Forbidden language in participant-facing pack content
  const { testProfiles: _qa, ...participantFacing } = pack as CareerDecisionPackV1 & Record<string, unknown>;
  const packText = JSON.stringify(participantFacing).toLowerCase();
  for (const phrase of FORBIDDEN_LANGUAGE) {
    if (packText.includes(phrase)) errors.push(`language: pack content contains forbidden phrase "${phrase}"`);
  }

  // 4 + 5b. Profiles through both contracts
  if (errors.some((e) => e.startsWith("cross-ref:"))) {
    // Evaluation on a structurally broken pack would just cascade noise.
    return { ok: false, errors, warnings, stats: statsFor(pack) };
  }
  for (const profile of pack.testProfiles) {
    const tag = `profile ${profile.id}`;
    try {
      const v1a = evaluate(pack, profile.answers, { now });
      const v1b = evaluate(pack, profile.answers, { now });
      if ((await canonicalHash(v1a)) !== (await canonicalHash(v1b))) {
        errors.push(`${tag}: V1 evaluation is not deterministic`);
      }
      const v2a = evaluateV2(pack, profile.answers, { now, assessmentId: `validate-${profile.id}` });
      const v2b = evaluateV2(pack, profile.answers, { now, assessmentId: `validate-${profile.id}` });
      if ((await canonicalHash(v2a)) !== (await canonicalHash(v2b))) {
        errors.push(`${tag}: V2 evaluation is not deterministic`);
      }
      const v2parsed = realityCheckResultV2.safeParse(v2a);
      if (!v2parsed.success) {
        errors.push(`${tag}: V2 result fails the contract: ${v2parsed.error.issues.map((i) => i.message).join("; ")}`);
      }

      const combinedText = (JSON.stringify(v1a) + JSON.stringify(v2a)).toLowerCase();
      for (const phrase of FORBIDDEN_LANGUAGE) {
        if (combinedText.includes(phrase)) errors.push(`${tag}: result contains forbidden phrase "${phrase}"`);
      }
      for (const phrase of profile.expect.mustNotMention ?? []) {
        if (combinedText.includes(phrase.toLowerCase())) errors.push(`${tag}: result mentions "${phrase}" (mustNotMention)`);
      }
      for (const phrase of profile.expect.mustMention ?? []) {
        if (!combinedText.includes(phrase.toLowerCase())) errors.push(`${tag}: result does not mention "${phrase}" (mustMention)`);
      }
      for (const blockedId of profile.expect.blockedRouteIds ?? []) {
        const route = v2a.routes.find((r) => r.routeId === blockedId);
        if (!route) errors.push(`${tag}: expected blocked route ${blockedId} does not exist`);
        else if (route.eligibility !== "not_currently_available") {
          errors.push(`${tag}: route ${blockedId} expected not_currently_available, got ${route.eligibility}`);
        }
      }
      for (const actionId of profile.expect.requiredActionIds ?? []) {
        if (!v2a.immediateActions.some((a) => a.actionTemplateId === actionId)) {
          errors.push(`${tag}: expected action ${actionId} missing from immediateActions`);
        }
      }
      if (profile.expect.rankedRouteIds?.length) {
        const actual = v2a.routes.map((r) => r.routeId).slice(0, profile.expect.rankedRouteIds.length);
        if (JSON.stringify(actual) !== JSON.stringify(profile.expect.rankedRouteIds)) {
          errors.push(`${tag}: ranked routes ${JSON.stringify(actual)} != expected ${JSON.stringify(profile.expect.rankedRouteIds)}`);
        }
      }
    } catch (e) {
      errors.push(`${tag}: evaluation threw: ${(e as Error).message}`);
    }
  }

  return { ok: errors.length === 0, errors, warnings, stats: statsFor(pack) };
};

const emptyStats = () => ({
  routes: 0, requirements: 0, questions: 0, rules: 0, evidenceRecords: 0, testProfiles: 0,
  machineAssessableRequirements: 0,
});

const statsFor = (pack: CareerDecisionPackV1) => ({
  routes: pack.routes.length,
  requirements: pack.requirements.length,
  questions: pack.questionRefs.length,
  rules: pack.rules.length,
  evidenceRecords: pack.evidenceRecords.length,
  testProfiles: pack.testProfiles.length,
  machineAssessableRequirements: pack.requirements.filter((r) => r.machineRule).length,
});
