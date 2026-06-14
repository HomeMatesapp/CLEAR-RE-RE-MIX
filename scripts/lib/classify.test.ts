/**
 * Classifier tests. Mirrors live family-token-map.md so the classifier is
 * exercised against the real rule shapes it sees in production.
 *
 * If any case fails, it's a finding about the classifier, not a test to
 * "fix" — we verified these behaviors against live pages (e.g. archivist's
 * CILIP-in-prose correctly stayed in_prose). The test agreeing with the
 * spec is the contract.
 */
import { describe, it, expect } from "vitest";
import { makeClassifier } from "./classify";
import type { Rules, WrongSectorRule } from "./contamination-rules";

const RULES: Rules = {
  fields_scanned: [
    "salary_source",
    "demand_source",
    "pathway_source_text",
    "raw_why_text",
    "pathway_adjacent",
    "short_description",
  ],
  attribution_fields: [
    "salary_source",
    "demand_source",
    "pathway_source_text",
    "raw_why_text",
  ],
  culture_cluster: { min_token_hits: 3, anchor: "sector data 20[0-9]{2}" },
  family_forbidden: [
    {
      family: 31,
      family_name: "Marketing, PR & Communications",
      forbidden: [
        {
          label: "fam-22 sales residue",
          patterns: [
            "commission or account ownership",
            "field sales, account management",
            "target-and-commission worlds",
            "target-driven cultures",
          ],
        },
        {
          label: "fam-19 journalism residue",
          patterns: ["NCTJ", "bylines", "editorial assistant"],
        },
        {
          label: "fam-27 political-connections residue",
          patterns: ["ex-SpAd", "party involvement", "parliamentary researchers"],
        },
      ],
    },
  ],
  wrong_sector_tokens: [
    { token: "CILIP", legitimate_families: [15], match: "substring" },
    { token: "ARA", legitimate_families: [7], match: "word" },
    { token: "NRCPD", legitimate_families: [26], match: "substring" },
    { token: "RBSLI", legitimate_families: [26], match: "substring" },
  ],
};

const classify = makeClassifier(RULES);
const araRule: WrongSectorRule = RULES.wrong_sector_tokens.find((t) => t.token === "ARA")!;

describe("classify — Group A: culture-cluster", () => {
  it("real stamp with 4 tokens + anchor → template_leak / culture_cluster", () => {
    const v =
      "UK culture, knowledge, creative, and fashion sector data 2025/26 (CILIP, ARA, NRCPD/RBSLI, Prospects)";
    expect(classify(v, "wrong_sector", { field: "salary_source", rule: araRule, family: 31 }))
      .toEqual({ shape: "template_leak", reason: "culture_cluster" });
  });

  it("2 tokens + anchor (below threshold) → does NOT culture_cluster", () => {
    const v = "UK sector data 2025/26 (CILIP, ARA, Prospects)";
    const out = classify(v, "wrong_sector", { field: "pathway_adjacent", rule: araRule, family: 31 });
    expect(out.reason).not.toBe("culture_cluster");
  });

  it("3 tokens but NO anchor → does NOT culture_cluster", () => {
    const v = "Citing CILIP, ARA and NRCPD as sources, no anchor phrase here";
    const out = classify(v, "wrong_sector", { field: "pathway_adjacent", rule: araRule, family: 31 });
    expect(out.reason).not.toBe("culture_cluster");
  });
});

describe("classify — Group B: field-awareness boundary", () => {
  // The heart of the design. Same token, same wrong family — attribution
  // gates, prose doesn't. If 4 and 5 ever return the same shape, the
  // field-awareness is broken.
  it("ARA in attribution field, wrong family → template_leak / wrong_sector_attribution", () => {
    const v = "Pay data from ARA 2025 sector survey";
    expect(classify(v, "wrong_sector", { field: "salary_source", rule: araRule, family: 19 }))
      .toEqual({ shape: "template_leak", reason: "wrong_sector_attribution" });
  });

  it("ARA in narrative field, wrong family → in_prose", () => {
    const v = "The route is the ARA-accredited MA in Archives & Records Management";
    expect(classify(v, "wrong_sector", { field: "pathway_adjacent", rule: araRule, family: 19 }))
      .toEqual({ shape: "in_prose", reason: "in_prose" });
  });

  it("ARA in attribution field, legitimate family (fam 7) → in_prose", () => {
    const v = "Pay data from ARA 2025 sector survey";
    expect(classify(v, "wrong_sector", { field: "salary_source", rule: araRule, family: 7 }))
      .toEqual({ shape: "in_prose", reason: "in_prose" });
  });
});

describe("classify — Group C: family_forbidden residue", () => {
  it("real fam-31 forbidden pattern → template_leak / family_forbidden_residue", () => {
    const v = "Backgrounds include field sales, account management roles";
    expect(classify(v, "family_forbidden", { field: "typical_backgrounds", family: 31 }))
      .toEqual({ shape: "template_leak", reason: "family_forbidden_residue" });
  });

  it("forbidden pattern is case-insensitive", () => {
    const v = "Backgrounds include FIELD SALES, ACCOUNT MANAGEMENT roles";
    expect(classify(v, "family_forbidden", { field: "typical_backgrounds", family: 31 }))
      .toEqual({ shape: "template_leak", reason: "family_forbidden_residue" });
  });
});

describe("classify — Group D: clean / negatives", () => {
  it("fam-31 canonical source string → in_prose (CIM/CIPR/PRCA must not flag)", () => {
    const v = "UK technology and digital pay data 2025/26 (CIM, CIPR, PRCA, ONS)";
    expect(classify(v, "wrong_sector", { field: "salary_source", rule: araRule, family: 31 }))
      .toEqual({ shape: "in_prose", reason: "in_prose" });
  });

  it("empty string → in_prose (no crash, no false positive)", () => {
    expect(classify("", "wrong_sector", { field: "salary_source", rule: araRule, family: 31 }))
      .toEqual({ shape: "in_prose", reason: "in_prose" });
  });
});

describe("classify — Group E: branch precedence", () => {
  it("string matching BOTH culture_cluster AND forbidden pattern → culture_cluster wins (branch 1)", () => {
    const v =
      "UK culture sector data 2025/26 (CILIP, ARA, NRCPD) — field sales, account management";
    expect(classify(v, "wrong_sector", { field: "salary_source", rule: araRule, family: 31 }))
      .toEqual({ shape: "template_leak", reason: "culture_cluster" });
  });
});
