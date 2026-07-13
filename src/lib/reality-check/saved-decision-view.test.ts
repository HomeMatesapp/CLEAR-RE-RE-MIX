// Increment 4 — saved-decision derivation tests.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describeSavedDecision } from "./saved-decision-view";
import { evaluateV2 } from "@shared/career-evaluator/v1/evaluate";
import type { CareerDecisionPackV1 } from "@shared/career-evaluator/v1/types";

const __dirname_local = dirname(fileURLToPath(import.meta.url));
const midwife = JSON.parse(
  readFileSync(resolve(__dirname_local, "../../../content/career-packs/midwife/1.1.0.json"), "utf-8"),
) as CareerDecisionPackV1;

const NOW = "2026-07-12T12:00:00.000Z";
const v2For = (profileId: string) => {
  const profile = midwife.testProfiles.find((p) => p.id === profileId)!;
  return evaluateV2(midwife, profile.answers, { now: NOW, assessmentId: "sdv-test" });
};

describe("describeSavedDecision", () => {
  it("treats legacy snapshots (and garbage) as legacy — existing rows render unchanged", () => {
    for (const snap of [null, undefined, {}, { readiness: "ready_now" }, { schemaVersion: "reality-check-result/v1" }, { schemaVersion: "reality-check-result/v2", routes: "broken" }]) {
      const view = describeSavedDecision(snap);
      expect(view.kind).toBe("legacy");
      expect(view.statusHeadline).toBe("");
      expect(view.actionTitles).toEqual([]);
    }
  });

  it("derives the strongest route, two-axis status and action titles from a V2 snapshot", () => {
    const v2 = v2For("registered_adult_nurse_head_start");
    const view = describeSavedDecision(JSON.parse(JSON.stringify(v2)));
    expect(view.kind).toBe("generic_v2");
    const strongest = v2.routes.find((r) => r.routeId === v2.strongestRouteId)!;
    expect(view.bestRouteTitle).toBe(strongest.routeTitle);
    expect(view.statusHeadline.length).toBeGreaterThan(5);
    expect(view.statusDetail.length).toBeGreaterThan(5);
    expect(view.actionTitles).toEqual(v2.immediateActions.map((a) => a.title));
  });

  it("handles the no-open-route case honestly", () => {
    const v2 = v2For("cannot_commit_placements"); // all routes blocked
    expect(v2.strongestRouteId).toBeNull();
    const view = describeSavedDecision(JSON.parse(JSON.stringify(v2)));
    expect(view.kind).toBe("generic_v2");
    expect(view.bestRouteTitle).toBeNull();
    expect(view.statusHeadline).toBe("No route currently appears open");
  });
});
