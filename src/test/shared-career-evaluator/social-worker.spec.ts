// Increment 7 — the social worker pack.
//
// The second career pack, and the first authored against the full
// Increment 1 DSL: machineRules derive requirement statuses, explicit marks
// handle "not sure" answers, constraints touch practical fit only, and
// visibleWhen keeps graduate-only questions away from school leavers.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { careerDecisionPackV1, validatePackCrossRefs, validatePublicationGates } from "@shared/career-evaluator/v1/schema";
import { evaluateV2 } from "@shared/career-evaluator/v1/evaluate";
import { realityCheckResultV2 } from "@shared/career-evaluator/v1/result-v2";
import { canonicalHash } from "@shared/career-evaluator/v1/hash";
import { FORBIDDEN_LANGUAGE } from "@shared/career-evaluator/v1/phrases";
import type { CareerDecisionPackV1 } from "@shared/career-evaluator/v1/types";

const __dirname_local = dirname(fileURLToPath(import.meta.url));
const pack = JSON.parse(
  readFileSync(resolve(__dirname_local, "../../../content/career-packs/social-worker/1.0.0.json"), "utf-8"),
) as CareerDecisionPackV1;

const NOW = "2026-07-13T09:00:00.000Z";
const AID = "sw-pack-test";
const evalProfile = (id: string) => {
  const profile = pack.testProfiles.find((p) => p.id === id);
  if (!profile) throw new Error(`no profile ${id}`);
  return evaluateV2(pack, profile.answers, { now: NOW, assessmentId: AID });
};
const route = (r: ReturnType<typeof evalProfile>, id: string) => {
  const found = r.routes.find((x) => x.routeId === id);
  if (!found) throw new Error(`no route ${id}`);
  return found;
};

describe("social worker pack — structure", () => {
  it("parses, cross-validates and passes every publication gate", () => {
    const parsed = careerDecisionPackV1.safeParse(pack);
    if (!parsed.success) throw new Error(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n"));
    expect(validatePackCrossRefs(pack)).toEqual([]);
    expect(validatePublicationGates(pack)).toEqual([]);
  });

  it("has 12 profiles and no forbidden language in participant-facing content", () => {
    expect(pack.testProfiles.length).toBe(12);
    const { testProfiles: _qa, ...participantFacing } = pack;
    const text = JSON.stringify(participantFacing).toLowerCase();
    for (const phrase of FORBIDDEN_LANGUAGE) expect(text).not.toContain(phrase);
  });

  it("every profile evaluates deterministically to a schema-valid V2 result", async () => {
    for (const profile of pack.testProfiles) {
      const a = evaluateV2(pack, profile.answers, { now: NOW, assessmentId: AID });
      const b = evaluateV2(pack, profile.answers, { now: NOW, assessmentId: AID });
      expect(await canonicalHash(a)).toEqual(await canonicalHash(b));
      const parsed = realityCheckResultV2.safeParse(a);
      if (!parsed.success) throw new Error(`${profile.id}: ` + parsed.error.issues.map((i) => i.message).join("; "));
    }
  });

  it("honours each profile's declared expectations", () => {
    for (const profile of pack.testProfiles) {
      const r = evaluateV2(pack, profile.answers, { now: NOW, assessmentId: AID });
      const text = JSON.stringify(r).toLowerCase();
      for (const phrase of profile.expect.mustNotMention ?? []) expect(text).not.toContain(phrase.toLowerCase());
      for (const blocked of profile.expect.blockedRouteIds ?? []) {
        expect(route(r, blocked).eligibility, `${profile.id}/${blocked}`).toBe("not_currently_available");
      }
    }
  });
});

describe("social worker pack — machine-assessed decisions", () => {
  it("school leaver with Level 3: undergraduate route open now, graduate routes honestly closed", () => {
    const r = evalProfile("school_leaver_ready");
    const ug = route(r, "route_ug_degree");
    expect(ug.eligibility).toBe("available_now");
    expect(ug.requirementsMet).toContain("GCSE English at grade 4/C or above (or approved equivalent)");
    expect(ug.requirementsMet).toContain("Level 3 qualification for undergraduate entry");
    expect(ug.requirementsNotAssessed).toContain("Registration with Social Work England");
    expect(route(r, "route_step_up").eligibility).toBe("not_currently_available");
    expect(route(r, "route_step_up").requirementsNotMet).toContain("A 2:2 or above in a subject other than social work");
    expect(r.strongestRouteId).toBe("route_ug_degree");
  });

  it("graduate with experience: fast-tracks open; second UG degree flagged as a trade-off, not blocked", () => {
    const r = evalProfile("graduate_step_up_ready");
    expect(route(r, "route_step_up").eligibility).toBe("available_now");
    expect(route(r, "route_approach").eligibility).toBe("available_now");
    const ug = route(r, "route_ug_degree");
    expect(ug.eligibility).toBe("available_with_conditions");
    expect(ug.concerns.join(" ")).toContain("second undergraduate degree");
  });

  it("no experience closes Step Up but not Approach (which has no experience requirement)", () => {
    const r = evalProfile("graduate_no_experience");
    expect(route(r, "route_step_up").eligibility).toBe("not_currently_available");
    expect(route(r, "route_step_up").requirementsNotMet).toContain("6 months' direct experience with vulnerable groups");
    expect(route(r, "route_approach").eligibility).toBe("available_now");
  });

  it("employer backing opens the salaried apprenticeship with no practical constraints, while fee-paying study is constrained", () => {
    const r = evalProfile("care_worker_apprenticeship");
    const app = route(r, "route_apprenticeship");
    expect(app.eligibility).toBe("available_now");
    expect(app.practicalFit).toBe("appears_manageable");
    const ug = route(r, "route_ug_degree");
    expect(ug.practicalFit).toBe("constraints_to_weigh");
    // The constraint never leaks into eligibility.
    expect(ug.eligibility).toBe("available_now");
  });

  it("'not sure about GCSEs' becomes an honest unknown with a certificates action — never a guess", () => {
    const r = evalProfile("international_qualifications");
    for (const id of ["route_ug_degree", "route_pg_masters", "route_step_up", "route_approach"]) {
      const rt = route(r, id);
      expect(rt.eligibility).toBe("requires_verification");
      expect(rt.requirementsUnknown).toContain("GCSE English at grade 4/C or above (or approved equivalent)");
    }
    expect(r.immediateActions.map((a) => a.actionTemplateId)).toContain("act_order_certificates");
  });

  it("no GCSE English closes every route — machineRule not_met, no strongest route", () => {
    const r = evalProfile("no_gcse_english");
    for (const rt of r.routes) expect(rt.eligibility).toBe("not_currently_available");
    expect(r.strongestRouteId).toBeNull();
  });

  it("a predicted 2:2 keeps fast-tracks open as requires_verification with the confirm-your-grade check", () => {
    const r = evalProfile("final_year_predicted_2_2");
    const stepUp = route(r, "route_step_up");
    expect(stepUp.eligibility).toBe("requires_verification");
    expect(stepUp.requirementsUnknown).toContain("A 2:2 or above in a subject other than social work");
    expect(stepUp.verificationsRequired.join(" ")).toContain("predicted 2:2");
  });

  it("wanting adult social work makes the child-and-family fast-tracks conditional, not closed", () => {
    const r = evalProfile("adults_focus_graduate");
    expect(route(r, "route_step_up").eligibility).toBe("available_with_conditions");
    expect(route(r, "route_approach").concerns.join(" ")).toContain("child and family");
    expect(route(r, "route_pg_masters").eligibility).toBe("available_now");
  });

  it("visibleWhen keeps graduate questions from affecting school leavers: their pruned answers change nothing", () => {
    const school = pack.testProfiles.find((p) => p.id === "school_leaver_ready")!;
    const withStray = { ...school.answers, vulnerable_experience_6m: "yes", child_family_focus: "adults" };
    // The wizard prunes hidden answers before submission; the evaluator is
    // also honest if they arrive: step_up stays closed on the degree
    // requirement either way.
    const r = evaluateV2(pack, withStray, { now: NOW, assessmentId: AID });
    expect(route(r, "route_step_up").eligibility).toBe("not_currently_available");
  });

  it("minimal answers produce requires_verification with limited coverage — not fabricated availability", () => {
    const r = evalProfile("minimal_answers");
    expect(r.evidenceCoverage?.level).toBe("limited");
    for (const rt of r.routes) expect(rt.eligibility).toBe("requires_verification");
  });
});
