import { describe, it, expect } from "vitest";
import { scoreOpportunity, groupOf } from "./match";
import type { Opportunity } from "./types";
import { extractOutwardCode, matchesLocation } from "./postcode";

const baseOpp = (over: Partial<Opportunity> = {}): Opportunity => ({
  id: "o1",
  title: "Example",
  type: "job",
  status: "active",
  provider_name: null,
  employer_name: null,
  role_tags: ["registered-nurse"],
  route_tags: [],
  description: null,
  location_name: null,
  postcode: null,
  outward_code: null,
  is_remote: false,
  is_online: false,
  radius_miles: null,
  cost: null,
  salary: null,
  funding_type: null,
  entry_requirements: null,
  english_maths_requirements: null,
  qualification_level: null,
  application_url: null,
  source_url: null,
  deadline: null,
  start_date: null,
  verified_at: null,
  is_sponsored: false,
  sponsor_label: null,
  warning_notes: null,
  is_seed: true,
  created_at: "",
  updated_at: "",
  ...over,
});

const decision = (over: Record<string, unknown> = {}) => ({
  role_slug: "registered-nurse",
  role_name: "Registered Nurse",
  best_route_title: "MSc Nursing (pre-registration)",
  route_to_avoid_title: "Self-funded second BSc",
  first_move: "Check entry requirements",
  answers: {
    incomeNeed: "need_income",
    budget: "zero",
    englishMaths: "no",
    area: "LS1",
    commuteFlex: "30_min",
    ...over,
  } as Record<string, unknown>,
}) as Parameters<typeof scoreOpportunity>[1];

describe("postcode helper", () => {
  it("extracts outward codes from various formats", () => {
    expect(extractOutwardCode("m1 1aa")).toBe("M1");
    expect(extractOutwardCode("SE15 4AB")).toBe("SE15");
    expect(extractOutwardCode("M1")).toBe("M1");
    expect(extractOutwardCode("Leeds")).toBeNull();
    expect(extractOutwardCode("")).toBeNull();
  });

  it("matches by outward, area, remote, online", () => {
    expect(matchesLocation({ outward_code: "M1" }, "m1 1aa").matched).toBe(true);
    expect(matchesLocation({ location_name: "Leeds" }, "leeds").matched).toBe(true);
    expect(matchesLocation({ is_remote: true }, "Leeds").matched).toBe(true);
    expect(matchesLocation({ outward_code: "SE15" }, "M1").matched).toBe(false);
  });
});

describe("scoreOpportunity", () => {
  it("boosts functional skills when user lacks English/maths", () => {
    const fs = baseOpp({ type: "functional_skills", title: "Functional Skills Maths L2" });
    const r = scoreOpportunity(fs, decision());
    expect(r.score).toBeGreaterThan(40);
    expect(r.reasons.join(" ")).toMatch(/English\/maths/i);
  });

  it("prioritises income-paying options when user needs income", () => {
    const job = baseOpp({ type: "job", title: "HCA role", outward_code: "LS1" });
    const course = baseOpp({ id: "o2", type: "course", title: "SQL course" });
    const sJob = scoreOpportunity(job, decision());
    const sCourse = scoreOpportunity(course, decision());
    expect(sJob.score).toBeGreaterThan(sCourse.score);
  });

  it("demotes a paid bootcamp on low budget into paid_careful group", () => {
    const bc = baseOpp({ type: "bootcamp", title: "Paid bootcamp" });
    const r = scoreOpportunity(bc, decision());
    expect(r.group).toBe("paid_careful");
    expect(r.checks.some((c) => /Paid option/i.test(c))).toBe(true);
  });

  it("demotes opportunities matching the 'route to avoid'", () => {
    const avoid = baseOpp({ title: "Self-funded second BSc nursing", type: "course" });
    const ok = baseOpp({ id: "o2", title: "Apprenticeship", type: "apprenticeship" });
    const sAvoid = scoreOpportunity(avoid, decision());
    const sOk = scoreOpportunity(ok, decision());
    expect(sOk.score).toBeGreaterThan(sAvoid.score);
    expect(sAvoid.checks.some((c) => /risky/i.test(c))).toBe(true);
  });

  it("HARD RULE: sponsorship never increases score", () => {
    const plain = baseOpp({ id: "p", type: "job", outward_code: "LS1" });
    const sponsored = baseOpp({ id: "s", type: "job", outward_code: "LS1", is_sponsored: true, sponsor_label: "Sponsored" });
    const a = scoreOpportunity(plain, decision());
    const b = scoreOpportunity(sponsored, decision());
    expect(b.score).toBe(a.score);
  });

  it("matches by outward code and adds a location reason", () => {
    const job = baseOpp({ type: "job", outward_code: "LS1" });
    const r = scoreOpportunity(job, decision({ area: "LS1 4AB" }));
    expect(r.reasons.join(" ")).toMatch(/area \(LS1\)/);
  });
});

describe("groupOf", () => {
  it("places support_funding into support group", () => {
    expect(groupOf(baseOpp({ type: "support_funding" }), false)).toBe("support");
  });
});
