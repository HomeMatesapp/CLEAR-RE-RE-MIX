// Increment 1 — schema extension tests.
//
// The extended DSL (recursive all/any/none, gte/lte/qual_level_gte/unknown,
// mark_requirement, flag_constraint, machineRule, contextOnly) must be
// additive: the published midwife 1.0.0 pack validates unchanged, and every
// new validator branch is exercised.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { careerDecisionPackV1, validatePackCrossRefs, validatePublicationGates, collectPredicates } from "@shared/career-evaluator/v1/schema";
import type { CareerDecisionPackV1 } from "@shared/career-evaluator/v1/types";

const __dirname_local = dirname(fileURLToPath(import.meta.url));
const midwife = JSON.parse(readFileSync(resolve(__dirname_local, "../../../content/career-packs/midwife/1.0.0.json"), "utf-8")) as CareerDecisionPackV1;

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

describe("extended schema stays additive", () => {
  it("the published midwife pack still parses and has no cross-ref errors", () => {
    const parsed = careerDecisionPackV1.safeParse(midwife);
    if (!parsed.success) throw new Error(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n"));
    expect(validatePackCrossRefs(midwife)).toEqual([]);
  });

  it("accepts recursive any/none conditions and new comparators", () => {
    const p = clone(midwife) as CareerDecisionPackV1 & { rules: unknown[] };
    const q = midwife.questionRefs[0].id;
    p.rules = [
      ...midwife.rules,
      {
        id: "nested_rule",
        when: {
          any: [
            { questionId: q, op: "unknown" },
            { all: [{ questionId: q, op: "present" }], none: [{ questionId: q, op: "eq", value: "never" }] },
          ],
        },
        then: [{ kind: "add_consideration", text: "nested condition fired", evidenceRefs: [] }],
      },
    ];
    expect(validatePackCrossRefs(p)).toEqual([]);
  });

  it("rejects a condition node with no combinator keys", () => {
    const p = clone(midwife) as CareerDecisionPackV1 & { rules: unknown[] };
    p.rules = [{ id: "bad", when: {}, then: [{ kind: "add_consideration", text: "x", evidenceRefs: [] }] }];
    const errs = validatePackCrossRefs(p);
    expect(errs.join("\n")).toContain("at least one of all/any/none");
  });

  it("flags qual_level_gte against a question without allowedValues, and against a value outside them", () => {
    const p = clone(midwife) as CareerDecisionPackV1 & { rules: unknown[]; questionRefs: unknown[] };
    p.questionRefs = [...midwife.questionRefs, { id: "free_text_q", label: "Free text" }];
    const ordered = midwife.questionRefs.find((q) => q.allowedValues?.length)!;
    p.rules = [
      ...midwife.rules,
      { id: "r_no_order", when: { all: [{ questionId: "free_text_q", op: "qual_level_gte", value: "x" }] }, then: [{ kind: "add_consideration", text: "x", evidenceRefs: [] }] },
      { id: "r_bad_value", when: { all: [{ questionId: ordered.id, op: "qual_level_gte", value: "___nope___" }] }, then: [{ kind: "add_consideration", text: "x", evidenceRefs: [] }] },
    ];
    const errs = validatePackCrossRefs(p).join("\n");
    expect(errs).toContain("no allowedValues ordering");
    expect(errs).toContain('not in its allowedValues');
  });

  it("detects contradictory requirement marks within one rule", () => {
    const p = clone(midwife) as CareerDecisionPackV1 & { rules: unknown[] };
    const reqId = midwife.requirements[0].id;
    p.rules = [
      ...midwife.rules,
      {
        id: "contradictory",
        when: { all: [] },
        then: [
          { kind: "mark_requirement", requirementId: reqId, status: "met", evidenceRefs: [] },
          { kind: "mark_requirement", requirementId: reqId, status: "not_met", evidenceRefs: [] },
        ],
      },
    ];
    expect(validatePackCrossRefs(p).join("\n")).toContain(`marks requirement ${reqId} both met and not_met`);
  });

  it("flags mark_requirement / machineRule references to unknown ids", () => {
    const p = clone(midwife) as unknown as { rules: unknown[]; requirements: unknown[] } & Omit<CareerDecisionPackV1, "rules" | "requirements">;
    p.rules = [
      ...midwife.rules,
      { id: "bad_mark", when: { all: [] }, then: [{ kind: "mark_requirement", requirementId: "ghost_req", status: "met", evidenceRefs: [] }] },
    ];
    p.requirements = midwife.requirements.map((r, i) => i === 0
      ? { ...r, machineRule: { all: [{ questionId: "ghost_question", op: "present" as const }] } }
      : r);
    const errs = validatePackCrossRefs(p).join("\n");
    expect(errs).toContain("unknown requirement ghost_req");
    expect(errs).toContain("machineRule references unknown question ghost_question");
  });
});

describe("collectPredicates", () => {
  it("flattens nested conditions", () => {
    const preds = collectPredicates({
      all: [{ questionId: "a", op: "present" }],
      any: [{ none: [{ questionId: "b", op: "eq", value: "x" }] }],
    });
    expect(preds.map((p) => p.questionId).sort()).toEqual(["a", "b"]);
  });
});

describe("publication gates", () => {
  const gateReady = (): CareerDecisionPackV1 => {
    const p = clone(midwife);
    for (const req of p.requirements as unknown as Array<{ requirementType?: string }>) {
      req.requirementType = "participant_verification";
    }
    for (const q of p.questionRefs as unknown as Array<{ id: string; contextOnly?: boolean; answerType?: string; options?: { value: string; label: string }[]; allowedValues?: string[] }>) {
      if (q.id === "starting_point") q.contextOnly = true;
      // Increment 3 renderability gate: every question needs an answerType,
      // and selects need participant-facing options.
      q.answerType = "single_select";
      q.options = (q.allowedValues ?? []).map((v) => ({ value: v, label: `Option: ${v}` }));
    }
    return p;
  };

  it("passes once every requirement is declared assessable and context questions are declared", () => {
    expect(validatePublicationGates(gateReady())).toEqual([]);
  });

  it("the published midwife 1.0.0 does NOT yet meet the stricter gates (requirements unassessable, one dead question)", () => {
    const errs = validatePublicationGates(midwife).join("\n");
    expect(errs).toContain("is not assessable");
    expect(errs).toContain("dead question");
  });

  it("flags routes without evidence", () => {
    const p = gateReady();
    (p.routes[0] as unknown as { evidenceRefs: string[] }).evidenceRefs = [];
    expect(validatePublicationGates(p).join("\n")).toContain(`route ${p.routes[0].id} has no evidence`);
  });

  it("flags references to withdrawn evidence", () => {
    const p = gateReady();
    const usedEvidenceId = p.routes[0].evidenceRefs[0];
    const rec = (p.evidenceRecords as unknown as Array<{ id: string; withdrawn?: boolean }>).find((e) => e.id === usedEvidenceId)!;
    rec.withdrawn = true;
    expect(validatePublicationGates(p).join("\n")).toContain(`references withdrawn evidence ${usedEvidenceId}`);
  });

  it("a machineRule or a mark_requirement rule also satisfies assessability", () => {
    const p = gateReady();
    const reqs = p.requirements as unknown as Array<{ id: string; requirementType?: string; machineRule?: unknown }>;
    delete reqs[0].requirementType;
    reqs[0].machineRule = { all: [{ questionId: midwife.questionRefs[0].id, op: "present" }] };
    if (reqs.length > 1) {
      delete reqs[1].requirementType;
      (p.rules as unknown[]).push({
        id: "marker",
        when: { all: [] },
        then: [{ kind: "mark_requirement", requirementId: reqs[1].id, status: "unknown", evidenceRefs: [] }],
      });
    }
    expect(validatePublicationGates(p)).toEqual([]);
  });
});
