// Increment 1 — legacy engine adapter tests.
//
// The adapter must map every legacy engine status onto the V2 contract
// WITHOUT changing any decision, keep the two status axes separate, and embed
// the exact participant-facing payload unchanged so rendering is
// bit-identical during migration.
import { describe, expect, it } from "vitest";
import { legacyEngineOutputToResultV2, type LegacyEngineOutput } from "../legacy-adapter";
import { realityCheckResultV2 } from "../result-v2";
import { FORBIDDEN_LANGUAGE } from "../phrases";

const NOW = "2026-07-12T12:00:00.000Z";
const AID = "legacy-assessment-0001";

const baseRoute = (over: Partial<LegacyEngineOutput["routeEvaluations"][number]> = {}) => ({
  id: "apprenticeship",
  displayTitle: "Apprenticeship",
  eligible: true,
  affordability: { affordable: true, notes: [] as string[] },
  blockersAndChecks: [] as string[],
  immediateAction: "Search current vacancies.",
  ...over,
});

const baseOutput = (over: Partial<LegacyEngineOutput> = {}): LegacyEngineOutput => ({
  status: "route_recommended",
  recommendedRouteId: "apprenticeship",
  alternativeRouteIds: ["college_route"],
  considerations: ["Shift patterns vary by employer."],
  blockersAndChecks: [],
  immediateAction: "Search current vacancies.",
  missingSignals: [],
  routeEvaluations: [
    baseRoute(),
    baseRoute({ id: "college_route", displayTitle: "College route", affordability: { affordable: false, notes: ["Course fees may exceed your stated budget."] } }),
  ],
  ...over,
});

const meta = (legacyPayload?: unknown) => ({
  engineId: "legacy:electrician",
  slug: "electrician",
  careerTitle: "Electrician",
  assessmentId: AID,
  now: NOW,
  answersSnapshot: { starting_point: "career_changer" },
  legacyPayload,
});

describe("status mapping", () => {
  it("route_recommended → strongest route set, eligible routes available_now", () => {
    const r = legacyEngineOutputToResultV2(baseOutput(), meta());
    expect(r.strongestRouteId).toBe("apprenticeship");
    expect(r.routes.find((x) => x.routeId === "apprenticeship")!.eligibility).toBe("available_now");
    expect(r.sourceKind).toBe("legacy_engine");
    expect(r.engineId).toBe("legacy:electrician");
  });

  it("qualification_verification_required → eligible routes requires_verification, no strongest route", () => {
    const out = baseOutput({
      status: "qualification_verification_required",
      recommendedRouteId: null,
      blockersAndChecks: ["Have your international certificate formally compared (UK ENIC)."],
      routeEvaluations: [baseRoute({ blockersAndChecks: ["Confirm your certificate maps to Level 3."] })],
    });
    const r = legacyEngineOutputToResultV2(out, meta());
    expect(r.strongestRouteId).toBeNull();
    const route = r.routes[0];
    expect(route.eligibility).toBe("requires_verification");
    expect(route.verificationsRequired).toEqual(["Confirm your certificate maps to Level 3."]);
    expect(route.concerns).toEqual([]);
    expect(r.unresolvedChecks).toContain("Have your international certificate formally compared (UK ENIC).");
  });

  it("bridging_required → ineligible routes not_currently_available, no strongest route", () => {
    const out = baseOutput({
      status: "bridging_required",
      recommendedRouteId: null,
      blockersAndChecks: ["GCSE maths and English needed first."],
      routeEvaluations: [baseRoute({ eligible: false, blockersAndChecks: ["Requires GCSE maths and English."] })],
    });
    const r = legacyEngineOutputToResultV2(out, meta());
    expect(r.strongestRouteId).toBeNull();
    expect(r.routes[0].eligibility).toBe("not_currently_available");
    expect(r.unresolvedChecks).toContain("GCSE maths and English needed first.");
  });

  it("insufficient_information → both axes insufficient on every route, missing signals surfaced", () => {
    const out = baseOutput({
      status: "insufficient_information",
      recommendedRouteId: null,
      missingSignals: ["training_availability", "maths_english_status"],
    });
    const r = legacyEngineOutputToResultV2(out, meta());
    for (const route of r.routes) {
      expect(route.eligibility).toBe("insufficient_information");
      expect(route.practicalFit).toBe("insufficient_information");
    }
    expect(r.strongestRouteId).toBeNull();
    expect(r.unresolvedChecks).toEqual(["training_availability", "maths_english_status"]);
  });
});

describe("axis separation", () => {
  it("affordability affects practicalFit only — never eligibility", () => {
    const r = legacyEngineOutputToResultV2(baseOutput(), meta());
    const college = r.routes.find((x) => x.routeId === "college_route")!;
    expect(college.eligibility).toBe("available_now");
    expect(college.practicalFit).toBe("constraints_to_weigh");
    expect(college.constraints).toEqual(["Course fees may exceed your stated budget."]);
    const apprenticeship = r.routes.find((x) => x.routeId === "apprenticeship")!;
    expect(apprenticeship.practicalFit).toBe("appears_manageable");
  });
});

describe("contract and migration safety", () => {
  it("validates against the V2 zod schema for every status", () => {
    for (const status of ["route_recommended", "qualification_verification_required", "bridging_required", "insufficient_information"] as const) {
      const r = legacyEngineOutputToResultV2(baseOutput({ status, recommendedRouteId: status === "route_recommended" ? "apprenticeship" : null }), meta());
      const parsed = realityCheckResultV2.safeParse(r);
      if (!parsed.success) throw new Error(`${status}: ` + parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n"));
    }
  });

  it("embeds the legacy participant payload unchanged (same reference, deep-equal)", () => {
    const payload = { status: "route_recommended", headline: "…", routes: [{ kind: "recommended", title: "Apprenticeship" }] };
    const before = JSON.parse(JSON.stringify(payload));
    const r = legacyEngineOutputToResultV2(baseOutput(), meta(payload));
    expect(r.legacy).toBe(payload);
    expect(r.legacy).toEqual(before);
  });

  it("snapshots answers immutably and stamps deterministic metadata", () => {
    const m = meta();
    const r = legacyEngineOutputToResultV2(baseOutput(), m);
    (m.answersSnapshot as Record<string, unknown>).starting_point = "mutated";
    expect(r.answersSnapshot.starting_point).toBe("career_changer");
    expect(r.evaluatedAt).toBe(NOW);
    expect(r.assessmentId).toBe(AID);
  });

  it("contains no forbidden language", () => {
    for (const status of ["route_recommended", "qualification_verification_required", "bridging_required", "insufficient_information"] as const) {
      const r = legacyEngineOutputToResultV2(baseOutput({ status }), meta());
      const text = JSON.stringify(r).toLowerCase();
      for (const phrase of FORBIDDEN_LANGUAGE) expect(text).not.toContain(phrase);
    }
  });

  it("is deterministic across two runs", () => {
    const a = legacyEngineOutputToResultV2(baseOutput(), meta());
    const b = legacyEngineOutputToResultV2(baseOutput(), meta());
    expect(a).toEqual(b);
  });
});
