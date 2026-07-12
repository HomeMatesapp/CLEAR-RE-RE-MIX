// Increment 1 — versioned snapshot reader tests.
//
// Old saved results MUST keep loading: absent/unknown schemaVersion reads as
// legacy, a v2-labelled snapshot that fails validation downgrades to legacy
// handling, and nothing ever throws.
import { describe, expect, it } from "vitest";
import { readResultSnapshot, resultSnapshotVersion, isResultV2 } from "./result-snapshot";
import { legacyEngineOutputToResultV2, type LegacyEngineOutput } from "@shared/career-evaluator/v1";

const validV2 = legacyEngineOutputToResultV2(
  {
    status: "route_recommended",
    recommendedRouteId: "apprenticeship",
    alternativeRouteIds: [],
    considerations: [],
    blockersAndChecks: [],
    immediateAction: "Search current vacancies.",
    missingSignals: [],
    routeEvaluations: [{
      id: "apprenticeship",
      displayTitle: "Apprenticeship",
      eligible: true,
      affordability: { affordable: true, notes: [] },
      blockersAndChecks: [],
      immediateAction: "Search current vacancies.",
    }],
  } satisfies LegacyEngineOutput,
  {
    engineId: "legacy:electrician",
    slug: "electrician",
    careerTitle: "Electrician",
    assessmentId: "snap-0001",
    now: "2026-07-12T12:00:00.000Z",
    answersSnapshot: {},
  },
);

describe("resultSnapshotVersion", () => {
  it("classifies pre-versioned snapshots, v1 and v2", () => {
    expect(resultSnapshotVersion({ overallVerdict: "…" })).toBe("legacy");
    expect(resultSnapshotVersion(null)).toBe("legacy");
    expect(resultSnapshotVersion("modular")).toBe("legacy");
    expect(resultSnapshotVersion({ schemaVersion: "reality-check-result/v1" })).toBe("reality-check-result/v1");
    expect(resultSnapshotVersion(validV2)).toBe("reality-check-result/v2");
    expect(resultSnapshotVersion({ schemaVersion: "reality-check-result/v99" })).toBe("legacy");
  });
});

describe("readResultSnapshot", () => {
  it("returns a validated v2 payload for genuine v2 snapshots", () => {
    const read = readResultSnapshot(JSON.parse(JSON.stringify(validV2)));
    expect(read.version).toBe("reality-check-result/v2");
    expect(read.v2?.strongestRouteId).toBe("apprenticeship");
  });

  it("downgrades a v2-labelled but invalid snapshot to legacy handling instead of crashing", () => {
    const broken = { schemaVersion: "reality-check-result/v2", routes: "not-an-array" };
    const read = readResultSnapshot(broken);
    expect(read.version).toBe("legacy");
    expect(read.v2).toBeUndefined();
    expect(read.raw).toBe(broken);
  });

  it("passes legacy and v1 snapshots through untouched", () => {
    const legacy = { overallVerdict: "worth pursuing", bestRoute: { title: "Apprenticeship" } };
    const readLegacy = readResultSnapshot(legacy);
    expect(readLegacy.version).toBe("legacy");
    expect(readLegacy.raw).toBe(legacy);

    const v1 = { schemaVersion: "reality-check-result/v1", routes: [] };
    const readV1 = readResultSnapshot(v1);
    expect(readV1.version).toBe("reality-check-result/v1");
    expect(readV1.raw).toBe(v1);
  });

  it("never throws on garbage", () => {
    for (const junk of [undefined, null, 42, "x", [], { schemaVersion: 7 }, { schemaVersion: "reality-check-result/v2" }]) {
      expect(() => readResultSnapshot(junk)).not.toThrow();
    }
  });
});

describe("isResultV2", () => {
  it("is true only for validating v2 snapshots", () => {
    expect(isResultV2(validV2)).toBe(true);
    expect(isResultV2({ schemaVersion: "reality-check-result/v2" })).toBe(false);
    expect(isResultV2({ overallVerdict: "…" })).toBe(false);
  });
});
