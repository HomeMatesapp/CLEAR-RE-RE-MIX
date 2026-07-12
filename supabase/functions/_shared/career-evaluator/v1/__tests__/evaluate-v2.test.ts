// Increment 1 — evaluator V2 tests.
//
// A synthetic pack exercises every new construct: any/none conditions,
// gte/lte, unknown, qual_level_gte, machineRule-derived requirement statuses,
// requirement-mark effects, practical constraints, and the two SEPARATE V2
// status axes. Also proves V1 output is preserved for the real midwife pack.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { evaluate, evaluateV2, matchesCondition } from "../evaluate";
import { realityCheckResultV2 } from "../result-v2";
import { validatePackCrossRefs } from "../schema";
import { canonicalHash } from "../hash";
import { FORBIDDEN_LANGUAGE } from "../phrases";
import type { AnswerMap, CareerDecisionPackV1 } from "../types";

const __dirname_local = dirname(fileURLToPath(import.meta.url));
const midwife = JSON.parse(readFileSync(resolve(__dirname_local, "../../../../../../content/career-packs/midwife/1.0.0.json"), "utf-8")) as CareerDecisionPackV1;

const NOW = "2026-07-12T12:00:00.000Z";
const AID = "test-assessment-0001";

// ── Synthetic pack ───────────────────────────────────────────────────────────

const EVIDENCE = [{
  id: "ev1",
  title: "Synthetic evidence",
  publisher: "Test regulator",
  url: "https://example.org/evidence",
  publishedOrRetrievedOn: "2026-01-01",
  verifiedOn: "2026-01-02",
  publiclyAccessible: true,
}];

const pack = {
  schemaVersion: "career-decision-pack/v1",
  packVersion: "1.0.0",
  roleId: "0b8e37e6-85ac-4448-b634-10dfd4fa4320",
  slug: "synthetic-role",
  archetypeId: "regulated_degree",
  careerIdentity: {
    canonicalTitle: "Synthetic Role",
    participantTitle: "Synthetic Role",
    aliases: [],
    sector: "Testing",
    occupationalFamily: "Test",
    regulatory: { status: "statutory_registration", appliesTo: "all_routes" },
    geographicScope: ["England"],
  },
  routes: [
    {
      id: "route_direct",
      title: "Direct route",
      summary: "The direct route.",
      typicalDurationLabel: "Around three years",
      typicalCostLabel: "Fees typically apply",
      requirementIds: ["req_qual", "req_age", "req_reference"],
      evidenceRefs: ["ev1"],
      actionTemplateIds: ["act_check_provider"],
      comparisonFields: { pattern: "Full time" },
    },
    {
      id: "route_alt",
      title: "Alternative route",
      summary: "The alternative route.",
      typicalDurationLabel: "Around four years",
      typicalCostLabel: "Usually employer funded",
      requirementIds: ["req_qual"],
      evidenceRefs: ["ev1"],
    },
  ],
  requirements: [
    {
      id: "req_qual",
      label: "Qualification at level 2 or above",
      description: "A qualification at level 2 or above.",
      verifiedBy: "Certificate check",
      evidenceRefs: ["ev1"],
      machineRule: { all: [{ questionId: "q_qual", op: "qual_level_gte", value: "level_2" }] },
      requirementType: "machine_assessable",
    },
    {
      id: "req_age",
      label: "Aged 18 or over",
      description: "Must be 18 or over.",
      verifiedBy: "ID check",
      evidenceRefs: ["ev1"],
      machineRule: { all: [{ questionId: "q_age", op: "gte", value: 18 }] },
      requirementType: "machine_assessable",
    },
    {
      id: "req_reference",
      label: "Professional reference",
      description: "A professional reference.",
      verifiedBy: "Reference check",
      evidenceRefs: ["ev1"],
      // No machineRule and no mark rule: must land in requirementsNotAssessed.
    },
  ],
  questionRefs: [
    { id: "q_qual", label: "Highest qualification", allowedValues: ["none", "level_1", "level_2", "degree"] },
    { id: "q_age", label: "Age" },
    { id: "q_budget", label: "Training budget", allowedValues: ["under_1k", "1k_to_5k", "over_5k"] },
    { id: "q_history", label: "Relevant history", allowedValues: ["none", "some", "extensive"] },
  ],
  rules: [
    {
      // any/none nesting + unknown op: fires when budget is under_1k OR
      // (history answered AND not extensive).
      id: "rule_budget_constraint",
      when: {
        any: [
          { questionId: "q_budget", op: "eq", value: "under_1k" },
          { all: [{ questionId: "q_history", op: "present" }], none: [{ questionId: "q_history", op: "eq", value: "extensive" }] },
        ],
      },
      then: [
        { kind: "flag_constraint", routeId: "route_direct", constraint: "Fees may stretch the stated budget.", evidenceRefs: ["ev1"] },
      ],
    },
    {
      id: "rule_unknown_budget",
      when: { all: [{ questionId: "q_budget", op: "unknown" }] },
      then: [{ kind: "add_consideration", text: "Budget not stated; costs left unweighed.", evidenceRefs: ["ev1"] }],
    },
    {
      id: "rule_mark_reference_via_history",
      when: { all: [{ questionId: "q_history", op: "eq", value: "extensive" }] },
      then: [{ kind: "mark_requirement", requirementId: "req_reference", status: "met", evidenceRefs: ["ev1"] }],
    },
    {
      id: "rule_block_alt_when_under_16",
      when: { all: [{ questionId: "q_age", op: "lte", value: 15 }] },
      then: [{ kind: "block_route", routeId: "route_alt", reason: "Alternative route requires age 16+.", evidenceRefs: ["ev1"] }],
    },
    {
      id: "rule_action",
      when: { all: [{ questionId: "q_qual", op: "present" }] },
      then: [{ kind: "add_action", actionTemplateId: "act_check_provider" }],
    },
  ],
  evidenceRecords: EVIDENCE,
  actionTemplates: [{
    id: "act_check_provider",
    title: "Check with a provider",
    description: "Confirm entry requirements with a provider.",
    effortLabel: "An hour or two",
    evidenceRefs: ["ev1"],
  }],
  testProfiles: Array.from({ length: 12 }, (_, i) => ({
    id: `profile_${i}`,
    label: `Synthetic profile ${i}`,
    answers: { q_qual: "level_2", q_age: 20 + i },
    expect: {},
  })),
  contentReview: {
    ownerDisplayName: "Owner",
    reviewerDisplayName: "Reviewer",
    lastReviewedAt: "2026-01-01",
    nextReviewDueAt: "2027-01-01",
    sourcesAsOf: "2026-01-01",
  },
} as unknown as CareerDecisionPackV1;

const fullAnswers: AnswerMap = { q_qual: "level_2", q_age: 25, q_budget: "over_5k", q_history: "extensive" };

describe("synthetic pack sanity", () => {
  it("validates with no cross-ref errors", () => {
    expect(validatePackCrossRefs(pack)).toEqual([]);
  });
});

describe("tri-state conditions", () => {
  it("qual_level_gte respects the allowedValues ordering", () => {
    expect(matchesCondition(pack, { q_qual: "degree" }, { all: [{ questionId: "q_qual", op: "qual_level_gte", value: "level_2" }] })).toBe(true);
    expect(matchesCondition(pack, { q_qual: "level_1" }, { all: [{ questionId: "q_qual", op: "qual_level_gte", value: "level_2" }] })).toBe(false);
    expect(matchesCondition(pack, {}, { all: [{ questionId: "q_qual", op: "qual_level_gte", value: "level_2" }] })).toBe("indeterminate");
  });

  it("gte/lte are numeric and indeterminate on missing or non-numeric answers", () => {
    expect(matchesCondition(pack, { q_age: 18 }, { all: [{ questionId: "q_age", op: "gte", value: 18 }] })).toBe(true);
    expect(matchesCondition(pack, { q_age: 17 }, { all: [{ questionId: "q_age", op: "gte", value: 18 }] })).toBe(false);
    expect(matchesCondition(pack, {}, { all: [{ questionId: "q_age", op: "gte", value: 18 }] })).toBe("indeterminate");
    expect(matchesCondition(pack, { q_age: "not a number" }, { all: [{ questionId: "q_age", op: "gte", value: 18 }] })).toBe("indeterminate");
  });

  it("any / none compose tri-state correctly", () => {
    const cond = {
      any: [
        { questionId: "q_budget", op: "eq" as const, value: "under_1k" },
        { questionId: "q_history", op: "eq" as const, value: "extensive" },
      ],
    };
    expect(matchesCondition(pack, { q_history: "extensive" }, cond)).toBe(true);
    expect(matchesCondition(pack, { q_budget: "over_5k", q_history: "some" }, cond)).toBe(false);
    // One branch false, one indeterminate ⇒ indeterminate (could still be true).
    expect(matchesCondition(pack, { q_budget: "over_5k" }, cond)).toBe("indeterminate");
    expect(matchesCondition(pack, { q_history: "some" }, { none: [{ questionId: "q_history", op: "eq", value: "extensive" }] })).toBe(true);
    expect(matchesCondition(pack, {}, { none: [{ questionId: "q_history", op: "eq", value: "extensive" }] })).toBe("indeterminate");
  });

  it("unknown matches only unanswered questions", () => {
    expect(matchesCondition(pack, {}, { all: [{ questionId: "q_budget", op: "unknown" }] })).toBe(true);
    expect(matchesCondition(pack, { q_budget: "over_5k" }, { all: [{ questionId: "q_budget", op: "unknown" }] })).toBe(false);
  });
});

describe("evaluateV2 — requirement statuses and the two axes", () => {
  it("machineRules produce met / not_met / unknown; unassessable requirements land in notAssessed", () => {
    const r = evaluateV2(pack, { q_qual: "level_2", q_age: 25, q_history: "some" }, { now: NOW, assessmentId: AID });
    const direct = r.routes.find((x) => x.routeId === "route_direct")!;
    expect(direct.requirementsMet).toContain("Qualification at level 2 or above");
    expect(direct.requirementsMet).toContain("Aged 18 or over");
    expect(direct.requirementsNotAssessed).toEqual(["Professional reference"]);

    const notMet = evaluateV2(pack, { q_qual: "none", q_age: 25 }, { now: NOW, assessmentId: AID })
      .routes.find((x) => x.routeId === "route_direct")!;
    expect(notMet.requirementsNotMet).toContain("Qualification at level 2 or above");
    expect(notMet.eligibility).toBe("not_currently_available");

    const unknownQual = evaluateV2(pack, { q_age: 25 }, { now: NOW, assessmentId: AID })
      .routes.find((x) => x.routeId === "route_direct")!;
    expect(unknownQual.requirementsUnknown).toContain("Qualification at level 2 or above");
    expect(unknownQual.eligibility).toBe("requires_verification");
  });

  it("an explicit mark_requirement overrides notAssessed", () => {
    const r = evaluateV2(pack, fullAnswers, { now: NOW, assessmentId: AID });
    const direct = r.routes.find((x) => x.routeId === "route_direct")!;
    // q_history=extensive fires rule_mark_reference_via_history.
    expect(direct.requirementsMet).toContain("Professional reference");
    expect(direct.requirementsNotAssessed).toEqual([]);
  });

  it("practical constraints move practicalFit but NEVER eligibility", () => {
    const constrained = evaluateV2(pack, { q_qual: "level_2", q_age: 25, q_budget: "under_1k", q_history: "extensive" }, { now: NOW, assessmentId: AID });
    const unconstrained = evaluateV2(pack, fullAnswers, { now: NOW, assessmentId: AID });
    const cDirect = constrained.routes.find((x) => x.routeId === "route_direct")!;
    const uDirect = unconstrained.routes.find((x) => x.routeId === "route_direct")!;
    expect(cDirect.practicalFit).toBe("constraints_to_weigh");
    expect(cDirect.constraints).toEqual(["Fees may stretch the stated budget."]);
    expect(uDirect.practicalFit).toBe("appears_manageable");
    // Budget changed practical fit only:
    expect(cDirect.eligibility).toBe(uDirect.eligibility);
  });

  it("a rule whose condition is indeterminate does not fire", () => {
    // q_history absent: the `any` in rule_budget_constraint is indeterminate
    // (budget over_5k = false branch, history branch indeterminate).
    const r = evaluateV2(pack, { q_qual: "level_2", q_age: 25, q_budget: "over_5k" }, { now: NOW, assessmentId: AID });
    const direct = r.routes.find((x) => x.routeId === "route_direct")!;
    expect(direct.constraints).toEqual([]);
  });

  it("block_route drives eligibility to not_currently_available and strongest-route selection skips it", () => {
    const r = evaluateV2(pack, { q_qual: "level_2", q_age: 15 }, { now: NOW, assessmentId: AID });
    const alt = r.routes.find((x) => x.routeId === "route_alt")!;
    expect(alt.eligibility).toBe("not_currently_available");
    expect(r.strongestRouteId).not.toBe("route_alt");
  });

  it("nothing answered ⇒ insufficient_information on both axes, no strongest route", () => {
    const r = evaluateV2(pack, {}, { now: NOW, assessmentId: AID });
    for (const route of r.routes) {
      expect(route.eligibility).toBe("insufficient_information");
      expect(route.practicalFit).toBe("insufficient_information");
    }
    expect(r.strongestRouteId).toBeNull();
    expect(r.evidenceCoverage?.level).toBe("limited");
  });

  it("route actionTemplateIds and comparison fields flow through", () => {
    const r = evaluateV2(pack, fullAnswers, { now: NOW, assessmentId: AID });
    const direct = r.routes.find((x) => x.routeId === "route_direct")!;
    expect(direct.immediateActionIds).toContain("act_check_provider");
    expect(direct.comparison).toEqual({ duration: "Around three years", cost: "Fees typically apply", pattern: "Full time" });
    expect(typeof r.strongestRouteId === "string").toBe(true);
  });

  it("is deterministic (hash-compared) and validates against the V2 zod schema", () => {
    const a = evaluateV2(pack, fullAnswers, { now: NOW, assessmentId: AID });
    const b = evaluateV2(pack, fullAnswers, { now: NOW, assessmentId: AID });
    expect(canonicalHash(a)).toEqual(canonicalHash(b));
    const parsed = realityCheckResultV2.safeParse(a);
    if (!parsed.success) throw new Error(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n"));
  });

  it("contains no forbidden language anywhere in the result", () => {
    const r = evaluateV2(pack, fullAnswers, { now: NOW, assessmentId: AID });
    const text = JSON.stringify(r).toLowerCase();
    for (const phrase of FORBIDDEN_LANGUAGE) expect(text).not.toContain(phrase);
  });

  it("snapshots the answers immutably", () => {
    const answers = { ...fullAnswers };
    const r = evaluateV2(pack, answers, { now: NOW, assessmentId: AID });
    answers.q_qual = "degree";
    expect(r.answersSnapshot.q_qual).toBe("level_2");
  });
});

describe("V1 preservation for existing packs", () => {
  it("all midwife profile answers produce deterministic V1 results with the V1 shape", () => {
    for (const profile of midwife.testProfiles) {
      const a = evaluate(midwife, profile.answers, { now: NOW });
      const b = evaluate(midwife, profile.answers, { now: NOW });
      expect(a).toEqual(b);
      expect(a.schemaVersion).toBe("reality-check-result/v1");
    }
  });

  it("evaluateV2 on the midwife pack reports unassessed requirements honestly instead of guessing", () => {
    const r = evaluateV2(midwife, midwife.testProfiles[0].answers, { now: NOW, assessmentId: AID });
    // Midwife 1.0.0 predates machineRule / requirement marks: its requirements
    // must land in requirementsNotAssessed, never in met/notMet.
    for (const route of r.routes) {
      expect(route.requirementsMet).toEqual([]);
      expect(route.requirementsNotMet).toEqual([]);
    }
    const parsed = realityCheckResultV2.safeParse(r);
    expect(parsed.success).toBe(true);
  });
});
