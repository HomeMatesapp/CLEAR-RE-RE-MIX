// Deno parity test for the Registered Nurse engine.
// Loads shared/reality-check/registered-nurse-cases.json.

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { runRegisteredNurseEngine } from "./_registered_nurse.ts";

const FIXTURE_PATH = new URL(
  "../../../shared/reality-check/registered-nurse-cases.json",
  import.meta.url,
);

// deno-lint-ignore no-explicit-any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fixtures: any[] = JSON.parse(await Deno.readTextFile(FIXTURE_PATH));

for (const c of fixtures) {
  Deno.test(`registered-nurse deno mirror — ${c.name}`, () => {
    const out = runRegisteredNurseEngine({ signals: c.signals });
    if (c.expected.status !== undefined) assertEquals(out.status, c.expected.status);
    if (c.expected.recommendedRouteId !== undefined) {
      assertEquals(out.recommendedRouteId, c.expected.recommendedRouteId);
    }
    if (c.expected.recommendedRouteMustNotBe) {
      if (out.recommendedRouteId === c.expected.recommendedRouteMustNotBe) {
        throw new Error(`Route ${c.expected.recommendedRouteMustNotBe} was recommended but should not have been`);
      }
    }
    if (c.expected.verificationPrimaryRouteId) {
      assertEquals(out.verificationPrimaryRouteId, c.expected.verificationPrimaryRouteId);
    }
  });
}
