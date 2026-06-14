/**
 * Contamination-finding classifier.
 *
 * Extracted from scripts/audit-families.ts so it can be unit-tested in
 * isolation. The behaviour is byte-identical to the previous inline
 * closure inside main(): same construction order of anchorRe /
 * forbiddenAllPatterns / attributionFields, same branch order, same
 * return shapes. Tests live in scripts/lib/classify.test.ts.
 *
 * Three template_leak branches (in order):
 *   (1) culture_cluster: ≥ min_token_hits wrong-sector tokens + anchor regex
 *   (2) family_forbidden_residue: any family-forbidden pattern present
 *   (3) wrong_sector_attribution: single wrong-sector token in an
 *       attribution field, outside that token's legitimate families
 * Otherwise: in_prose (legitimate-until-triaged).
 *
 * Self-contained: given (value, sourceKind, ctx), returns the correct
 * classification with no caller preconditions. In particular, branch (3)
 * re-verifies that ctx.rule.token actually matches `value` before flagging
 * — callers may invoke freely without an upstream `matches()` guard.
 */
import { matches, type Rules, type WrongSectorRule } from "./contamination-rules";

export type FindingReason =
  | "culture_cluster"
  | "family_forbidden_residue"
  | "wrong_sector_attribution"
  | "in_prose";

export type FindingShape = "template_leak" | "in_prose";
export type FindingKind = "family_forbidden" | "wrong_sector";

export type ClassifyContext = {
  field: string;
  rule?: WrongSectorRule;
  family: number;
};

export type ClassifyResult = { shape: FindingShape; reason: FindingReason };

export type Classifier = (
  value: string,
  sourceKind: FindingKind,
  ctx: ClassifyContext,
) => ClassifyResult;

export function makeClassifier(rules: Rules): Classifier {
  const anchorRe = new RegExp(rules.culture_cluster.anchor, "i");
  const forbiddenAllPatterns = rules.family_forbidden.flatMap((f) =>
    f.forbidden.flatMap((g) => g.patterns),
  );
  const attributionFields = new Set(rules.attribution_fields);

  return function classify(value, sourceKind, ctx) {
    // (1) culture-cluster
    const hits = rules.wrong_sector_tokens.filter((t) => matches(value, t.token, t.match)).length;
    if (hits >= rules.culture_cluster.min_token_hits && anchorRe.test(value)) {
      return { shape: "template_leak", reason: "culture_cluster" };
    }
    // (2) family-forbidden residue
    const ci = value.toLowerCase();
    if (forbiddenAllPatterns.some((p) => ci.includes(p.toLowerCase()))) {
      return { shape: "template_leak", reason: "family_forbidden_residue" };
    }
    // (3) wrong-sector token in an attribution field, outside legitimate families.
    //     Self-guarding: re-verify the token is actually present in `value`
    //     so the classifier is correct as a unit, not just when the upstream
    //     scan loop has already filtered. Production callers already satisfy
    //     this, so the audit baseline is unchanged; the guard removes a
    //     latent footgun for any future caller.
    if (
      sourceKind === "wrong_sector" &&
      ctx.rule &&
      matches(value, ctx.rule.token, ctx.rule.match) &&
      attributionFields.has(ctx.field) &&
      !ctx.rule.legitimate_families.includes(ctx.family)
    ) {
      return { shape: "template_leak", reason: "wrong_sector_attribution" };
    }
    // Otherwise: in-prose mention (legitimate-until-triaged).
    return { shape: "in_prose", reason: "in_prose" };
  };
}
