// Deno mirror parity test for the Plumber engine.

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { runPlumberEngine } from "./_plumber.ts";

const FIXTURE_PATH = new URL(
  "../../../shared/reality-check/plumber-cases.json",
  import.meta.url,
);

interface FixtureCase {
  name: string;
  signals: Parameters<typeof runPlumberEngine>[0]["signals"];
  expected: {
    status: string;
    recommendedRouteId: string | null;
    recommendedRouteMustNotBe?: string;
    considerationsCountAtLeast?: number;
    experiencedWorkerRouteEligible?: boolean;
  };
}

const fixtures: FixtureCase[] = JSON.parse(await Deno.readTextFile(FIXTURE_PATH));

for (const c of fixtures) {
  Deno.test(`plumber deno mirror — ${c.name}`, () => {
    const out = runPlumberEngine({ signals: c.signals });
    assertEquals(out.status, c.expected.status);
    if (c.expected.recommendedRouteId !== undefined) {
      assertEquals(out.recommendedRouteId, c.expected.recommendedRouteId);
    }
    if (c.expected.recommendedRouteMustNotBe) {
      if (out.recommendedRouteId === c.expected.recommendedRouteMustNotBe) {
        throw new Error(
          `Route ${c.expected.recommendedRouteMustNotBe} was recommended but should not have been`,
        );
      }
    }
    if (c.expected.considerationsCountAtLeast !== undefined) {
      if (out.considerations.length < c.expected.considerationsCountAtLeast) {
        throw new Error(
          `Expected ≥${c.expected.considerationsCountAtLeast} considerations, got ${out.considerations.length}`,
        );
      }
    }
    if (c.expected.experiencedWorkerRouteEligible !== undefined) {
      const ewa = out.routeEvaluations.find((r) => r.id === "experienced_worker_route");
      assertEquals(ewa?.eligible, c.expected.experiencedWorkerRouteEligible);
    }
  });
}

Deno.test("plumber deno mirror — gas_heating + plumbing experience emits verification check", () => {
  const out = runPlumberEngine({
    signals: {
      startingPoint: "career_changer",
      hasPlumbingExperience: true,
      hasRelatedTradeExperience: true,
      plumbingQualificationLevel: "gas_heating",
      mathsEnglishStatus: "both",
      availableTrainingPatterns: ["full_time_work_based"],
      trainingBudgetBand: "over_2000",
      travelRange: "wider_area",
      workingConditionsToCheck: [],
      routePriorities: [],
    },
  });
  const ewa = out.routeEvaluations.find((r) => r.id === "experienced_worker_route");
  assertEquals(ewa?.eligible, true);
  const hasCheck = (ewa?.blockersAndChecks ?? []).some((c) =>
    /not automatically equivalent/i.test(c),
  );
  assertEquals(hasCheck, true);
});

Deno.test("plumber deno mirror — gas_heating WITHOUT plumbing experience is not eligible", () => {
  const out = runPlumberEngine({
    signals: {
      startingPoint: "career_changer",
      hasPlumbingExperience: false,
      hasRelatedTradeExperience: true,
      plumbingQualificationLevel: "gas_heating",
      mathsEnglishStatus: "both",
      availableTrainingPatterns: ["full_time_work_based"],
      trainingBudgetBand: "over_2000",
      travelRange: "wider_area",
      workingConditionsToCheck: [],
      routePriorities: [],
    },
  });
  const ewa = out.routeEvaluations.find((r) => r.id === "experienced_worker_route");
  assertEquals(ewa?.eligible, false);
});
