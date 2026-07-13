// Increment 11 — pack validation core tests.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { validatePackContent } from "../lib/validate-pack-core";

const __dirname_local = dirname(fileURLToPath(import.meta.url));
const load = (rel: string) =>
  JSON.parse(readFileSync(resolve(__dirname_local, "../../content/career-packs", rel), "utf-8"));

describe("validatePackContent", () => {
  it("passes both gate-ready packs cleanly", async () => {
    for (const rel of ["midwife/1.1.0.json", "social-worker/1.0.0.json"]) {
      const report = await validatePackContent(load(rel));
      expect(report.errors, rel).toEqual([]);
      expect(report.ok, rel).toBe(true);
      expect(report.stats.testProfiles).toBe(12);
    }
  });

  it("fails midwife 1.0.0 on gates by default, passes with --allow-gate-failures as warnings", async () => {
    const legacy = load("midwife/1.0.0.json");
    const strict = await validatePackContent(legacy);
    expect(strict.ok).toBe(false);
    expect(strict.errors.some((e) => e.startsWith("gate:"))).toBe(true);

    const lenient = await validatePackContent(legacy, { allowGateFailures: true });
    expect(lenient.ok).toBe(true);
    expect(lenient.warnings.some((w) => w.startsWith("gate:"))).toBe(true);
  });

  it("catches a broken expectation: a route expected blocked that is open", async () => {
    const pack = load("social-worker/1.0.0.json");
    pack.testProfiles[0].expect.blockedRouteIds = ["route_ug_degree"]; // school leaver: UG is open
    const report = await validatePackContent(pack);
    expect(report.ok).toBe(false);
    expect(report.errors.join("\n")).toContain("expected not_currently_available, got available_now");
  });

  it("catches forbidden language introduced into pack content", async () => {
    const pack = load("social-worker/1.0.0.json");
    pack.routes[0].summary = "This route is guaranteed to work out.";
    const report = await validatePackContent(pack);
    expect(report.ok).toBe(false);
    expect(report.errors.join("\n")).toContain('forbidden phrase "guaranteed"');
  });

  it("reports schema failures without cascading evaluation noise", async () => {
    const report = await validatePackContent({ schemaVersion: "career-decision-pack/v1" });
    expect(report.ok).toBe(false);
    expect(report.errors.every((e) => e.startsWith("schema:"))).toBe(true);
  });
});
