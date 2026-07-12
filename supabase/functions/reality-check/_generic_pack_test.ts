// Deno parity test — proves the shared evaluator bundles and runs inside the
// Supabase edge runtime with `zod` resolved via ../import_map.json.
//
// Passes iff:
//   • the shared module resolves under Deno's TS resolution
//   • `zod` is resolved via the import map to npm:zod
//   • the midwife pack validates
//   • evaluate() produces a RealityCheckResultV1 whose schemaVersion is correct

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { evaluateGenericPack } from "./_generic_pack.ts";

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
