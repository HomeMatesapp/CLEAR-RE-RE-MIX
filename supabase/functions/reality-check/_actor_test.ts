// Deno parity test for the Actor engine.

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { runActorEngine } from "./_actor.ts";

const FIXTURE_PATH = new URL(
  "../../../shared/reality-check/actor-cases.json",
  import.meta.url,
);

interface FixtureCase {
  name: string;
  signals: Parameters<typeof runActorEngine>[0]["signals"];
  expected: {
    status?: string;
    recommendedRouteId?: string | null;
    recommendedRouteMustNotBe?: string;
  };
}

const fixtures: FixtureCase[] = JSON.parse(await Deno.readTextFile(FIXTURE_PATH));

for (const c of fixtures) {
  Deno.test(`actor deno mirror — ${c.name}`, () => {
    const out = runActorEngine({ signals: c.signals });
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
