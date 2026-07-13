// Increment 3 — midwife 1.1.0.
//
// 1.1.0 adds render metadata (answerType, options, whyWeAsk), declares
// starting_point contextOnly, and declares every requirement
// participant_verification. It changes NO rules, routes or evidence, so it
// must be decision-identical to 1.0.0 — and, unlike 1.0.0, it must pass the
// publication gates, making it the first pack servable to a participant
// wizard.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { careerDecisionPackV1, validatePackCrossRefs, validatePublicationGates } from "@shared/career-evaluator/v1/schema";
import { evaluate, evaluateV2 } from "@shared/career-evaluator/v1/evaluate";
import { realityCheckResultV2 } from "@shared/career-evaluator/v1/result-v2";
import { FORBIDDEN_LANGUAGE } from "@shared/career-evaluator/v1/phrases";
import { canonicalHash } from "@shared/career-evaluator/v1/hash";
import type { CareerDecisionPackV1 } from "@shared/career-evaluator/v1/types";

const __dirname_local = dirname(fileURLToPath(import.meta.url));
const load = (v: string) =>
  JSON.parse(readFileSync(resolve(__dirname_local, `../../../content/career-packs/midwife/${v}.json`), "utf-8")) as CareerDecisionPackV1;

const v100 = load("1.0.0");
const v110 = load("1.1.0");
const NOW = "2026-07-12T12:00:00.000Z";
const AID = "midwife-110-test";

describe("midwife 1.1.0 — structure", () => {
  it("parses, cross-validates, and passes the publication gates", () => {
    const parsed = careerDecisionPackV1.safeParse(v110);
    if (!parsed.success) throw new Error(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n"));
    expect(validatePackCrossRefs(v110)).toEqual([]);
    expect(validatePublicationGates(v110)).toEqual([]);
  });

  it("every question is renderable with participant-facing option labels matching allowedValues", () => {
    for (const q of v110.questionRefs) {
      expect(q.answerType, q.id).toBe("single_select");
      expect(q.options?.length, q.id).toBe(q.allowedValues?.length);
      expect(q.options!.map((o) => o.value).sort()).toEqual([...q.allowedValues!].sort());
      for (const o of q.options!) expect(o.label.length).toBeGreaterThan(1);
      expect(q.whyWeAsk?.length, q.id).toBeGreaterThan(10);
    }
  });

  it("changes no decision content relative to 1.0.0", () => {
    expect(v110.rules).toEqual(v100.rules);
    expect(v110.routes).toEqual(v100.routes);
    expect(v110.evidenceRecords).toEqual(v100.evidenceRecords);
    expect(v110.actionTemplates).toEqual(v100.actionTemplates);
    expect(v110.testProfiles).toEqual(v100.testProfiles);
  });

  it("contains no forbidden language in participant-facing content", () => {
    // testProfiles are QA fixtures whose `mustNotMention` lists legitimately
    // contain forbidden phrases as assertions — exclude them from the scan.
    const { testProfiles: _qa, ...participantFacing } = v110;
    const text = JSON.stringify(participantFacing).toLowerCase();
    for (const phrase of FORBIDDEN_LANGUAGE) expect(text).not.toContain(phrase);
  });
});

describe("midwife 1.1.0 — decision identity with 1.0.0", () => {
  it("V1 results are identical for all 12 test profiles (packVersion aside)", async () => {
    for (const profile of v100.testProfiles) {
      const a = { ...evaluate(v100, profile.answers, { now: NOW }), packVersion: "X" };
      const b = { ...evaluate(v110, profile.answers, { now: NOW }), packVersion: "X" };
      expect(await canonicalHash(b)).toEqual(await canonicalHash(a));
    }
  });

  it("V2 results are identical for all 12 test profiles (packVersion aside) and schema-valid", () => {
    for (const profile of v100.testProfiles) {
      const a = { ...evaluateV2(v100, profile.answers, { now: NOW, assessmentId: AID }), packVersion: "X" };
      const b = { ...evaluateV2(v110, profile.answers, { now: NOW, assessmentId: AID }), packVersion: "X" };
      expect(b).toEqual(a);
      expect(realityCheckResultV2.safeParse(evaluateV2(v110, profile.answers, { now: NOW, assessmentId: AID })).success).toBe(true);
    }
  });
});
