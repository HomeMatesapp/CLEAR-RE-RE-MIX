// Deno parity test — proves the shared evaluator bundles and runs inside the
// Supabase edge runtime with `zod` resolved via ../import_map.json.
//
// Passes iff:
//   • the shared module resolves under Deno's TS resolution
//   • `zod` is resolved via the import map to npm:zod
//   • the midwife pack validates
//   • evaluate() produces a RealityCheckResultV1 whose schemaVersion is correct

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { evaluateGenericPack, evaluateGenericPackV2 } from "./_generic_pack.ts";

const PACK_PATH = new URL(
  "../../../content/career-packs/midwife/1.0.0.json",
  import.meta.url,
);

const pack = JSON.parse(await Deno.readTextFile(PACK_PATH));

Deno.test("generic pack — midwife school-leaver profile evaluates under Deno", () => {
  const result = evaluateGenericPack(pack, {
    starting_point: "school_leaver",
    gcse_maths_english_science_status: "yes",
    level3_status: "yes_science",
    relevant_first_degree_status: "no",
    current_registration: "no",
    income_need: "can_study_full_time",
    weekly_placement_hours: "yes",
    dbs_check_barriers: "none",
    occupational_health_concerns: "none",
  });
  assertEquals(result.schemaVersion, "reality-check-result/v1");
  assertEquals(result.roleId, "f2e9c333-c373-4cca-add2-3b7bd1cd50d7");
  assertEquals(result.slug, "midwife");
  assertEquals(result.geographicScope, ["England"]);
  assertEquals(result.regulatoryStatus, "statutory_registration");
  assertEquals(result.routes[0].routeId, "bsc_midwifery");
  // Blocked routes for a school leaver with no degree and not on NMC register
  const blocked = result.routes.filter((r) => r.classification === "not_currently_available_to_you").map((r) => r.routeId).sort();
  assertEquals(blocked, ["msc_pre_reg_midwifery", "nurse_to_midwife"]);
});

Deno.test("generic pack — evaluateGenericPackV2 emits the standard contract under Deno", () => {
  const answers = {
    starting_point: "school_leaver",
    gcse_maths_english_science_status: "yes",
    level3_status: "yes_science",
    relevant_first_degree_status: "no",
    current_registration: "no",
    income_need: "can_study_full_time",
    weekly_placement_hours: "yes",
    dbs_check_barriers: "none",
    occupational_health_concerns: "none",
  };
  const v2 = evaluateGenericPackV2(pack, answers, {
    now: "2026-07-12T12:00:00.000Z",
    assessmentId: "deno-parity-0001",
  });
  assertEquals(v2.schemaVersion, "reality-check-result/v2");
  assertEquals(v2.sourceKind, "career_pack");
  assertEquals(v2.slug, "midwife");
  assertEquals(v2.packVersion, "1.0.0");
  assertEquals(v2.answersSnapshot, answers);
  // Same decision authority as V1: the routes blocked for this profile under
  // V1 must be exactly the routes not currently available under V2.
  const v1 = evaluateGenericPack(pack, answers);
  const v1Blocked = v1.routes.filter((r) => r.classification === "not_currently_available_to_you").map((r) => r.routeId).sort();
  const v2Blocked = v2.routes.filter((r) => r.eligibility === "not_currently_available").map((r) => r.routeId).sort();
  assertEquals(v2Blocked, v1Blocked);
});
