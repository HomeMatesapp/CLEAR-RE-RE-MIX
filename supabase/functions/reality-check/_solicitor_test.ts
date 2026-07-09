// Deno parity test for the Solicitor engine.

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { runSolicitorEngine } from "./_solicitor.ts";

const FIXTURE_PATH = new URL(
  "../../../shared/reality-check/solicitor-cases.json",
  import.meta.url,
);

interface FixtureCase {
  name: string;
  signals: Parameters<typeof runSolicitorEngine>[0]["signals"];
  expected: {
    status?: string;
    recommendedRouteId?: string | null;
    recommendedRouteMustNotBe?: string;
  };
}

const fixtures: FixtureCase[] = JSON.parse(await Deno.readTextFile(FIXTURE_PATH));

for (const c of fixtures) {
  Deno.test(`solicitor deno mirror — ${c.name}`, () => {
    const out = runSolicitorEngine({ signals: c.signals });
    if (c.expected.status !== undefined) assertEquals(out.status, c.expected.status);
    if (c.expected.recommendedRouteId !== undefined) {
      assertEquals(out.recommendedRouteId, c.expected.recommendedRouteId);
    }
    if (c.expected.recommendedRouteMustNotBe) {
      if (out.recommendedRouteId === c.expected.recommendedRouteMustNotBe) {
        throw new Error(`Route ${c.expected.recommendedRouteMustNotBe} was recommended but should not have been`);
      }
    }
  });
}
