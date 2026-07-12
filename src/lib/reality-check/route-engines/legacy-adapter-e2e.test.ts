// Increment 1 — end-to-end proof that a real reviewed engine flows through
// the V2 adapter without changing any decision, with the exact participant
// payload (the one ModularResultView renders today) embedded unchanged.
//
// This test deliberately lives in src (src → @shared is the allowed
// dependency direction; shared code never imports src).
import { describe, expect, it } from "vitest";
import { runElectricianEngine, type ElectricianRouteId } from "./electrician";
import { electricianFlavor } from "./electrician-flavor";
import { buildModularPayload } from "./modular-payload";
import type { ElectricianSignals } from "../questionnaire/signals";
import {
  legacyEngineOutputToResultV2,
  realityCheckResultV2,
  FORBIDDEN_LANGUAGE,
  type LegacyEngineOutput,
} from "@shared/career-evaluator/v1";

const NOW = "2026-07-12T12:00:00.000Z";

const signals = (over: Partial<ElectricianSignals> = {}): ElectricianSignals => ({
  startingPoint: "career_changer",
  hasElectricalExperience: false,
  hasRelatedTradeExperience: false,
  electricalQualificationLevel: "none",
  mathsEnglishStatus: "both",
  availableTrainingPatterns: ["full_time_work_based"],
  trainingBudgetBand: null,
  travelRange: null,
  workingConditionsToCheck: [],
  routePriorities: [],
  ...over,
});

const adapt = (s: ElectricianSignals) => {
  const out = runElectricianEngine({ signals: s });
  const payload = buildModularPayload<ElectricianRouteId>(out, electricianFlavor);
  const v2 = legacyEngineOutputToResultV2(out as unknown as LegacyEngineOutput, {
    engineId: "legacy:electrician",
    slug: "electrician",
    careerTitle: "Electrician",
    assessmentId: "e2e-0001",
    now: NOW,
    answersSnapshot: { starting_point: s.startingPoint ?? "" },
    legacyPayload: payload,
  });
  return { out, payload, v2 };
};

describe("electrician engine → V2 adapter (end to end)", () => {
  it("route_recommended: decision preserved, payload embedded unchanged, V2 valid", () => {
    const { out, payload, v2 } = adapt(signals());
    expect(out.status).toBe("route_recommended");
    expect(v2.strongestRouteId).toBe(out.recommendedRouteId);
    expect(v2.routes.map((r) => r.routeId).sort()).toEqual(out.routeEvaluations.map((r) => r.id).sort());
    expect(v2.legacy).toBe(payload);
    const parsed = realityCheckResultV2.safeParse(v2);
    if (!parsed.success) throw new Error(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n"));
  });

  it("qualification_verification_required: no strongest route, checks surfaced", () => {
    const { out, v2 } = adapt(signals({ electricalQualificationLevel: "international" }));
    expect(out.status).toBe("qualification_verification_required");
    expect(v2.strongestRouteId).toBeNull();
    expect(v2.unresolvedChecks.length).toBeGreaterThan(0);
    expect(realityCheckResultV2.safeParse(v2).success).toBe(true);
  });

  it("insufficient_information: both axes insufficient", () => {
    const { out, v2 } = adapt(signals({ startingPoint: null, mathsEnglishStatus: null, availableTrainingPatterns: [] }));
    expect(out.status).toBe("insufficient_information");
    for (const r of v2.routes) {
      expect(r.eligibility).toBe("insufficient_information");
      expect(r.practicalFit).toBe("insufficient_information");
    }
    expect(realityCheckResultV2.safeParse(v2).success).toBe(true);
  });

  it("budget never changes eligibility across the adapter (axis invariant end to end)", () => {
    const rich = adapt(signals({ trainingBudgetBand: "over_5k" as ElectricianSignals["trainingBudgetBand"] }));
    const poor = adapt(signals({ trainingBudgetBand: "under_500" as ElectricianSignals["trainingBudgetBand"] }));
    const eligibilityOf = (v2: typeof rich.v2) =>
      Object.fromEntries(v2.routes.map((r) => [r.routeId, r.eligibility]));
    expect(eligibilityOf(poor.v2)).toEqual(eligibilityOf(rich.v2));
  });

  it("no forbidden language leaks through the adapted result", () => {
    const { v2 } = adapt(signals());
    const text = JSON.stringify(v2).toLowerCase();
    for (const phrase of FORBIDDEN_LANGUAGE) expect(text).not.toContain(phrase);
  });
});
