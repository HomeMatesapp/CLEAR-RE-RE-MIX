/**
 * Shared types + loader for the AUDIT-RULES JSON block in
 * docs/audit/family-token-map.md. Used by both audit-families.ts and
 * gen-contamination-fn.ts so they cannot drift on schema.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export type WrongSectorRule = {
  token: string;
  legitimate_families: number[];
  match: "substring" | "word";
  note?: string;
};
export type ForbiddenRule = { label: string; patterns: string[] };
export type FamilyForbidden = {
  family: number;
  family_name: string;
  forbidden: ForbiddenRule[];
};
export type CultureCluster = {
  min_token_hits: number;
  anchor: string; // POSIX regex used in SQL (`~*`) and JS (case-insensitive)
};
export type Rules = {
  fields_scanned: string[];
  attribution_fields: string[];
  culture_cluster: CultureCluster;
  family_forbidden: FamilyForbidden[];
  wrong_sector_tokens: WrongSectorRule[];
};

export const MAP_PATH = resolve(process.cwd(), "docs/audit/family-token-map.md");

export function loadRules(): Rules {
  const md = readFileSync(MAP_PATH, "utf8");
  const m = md.match(
    /<!-- AUDIT-RULES:BEGIN -->[\s\S]*?```json\s*([\s\S]*?)\s*```[\s\S]*?<!-- AUDIT-RULES:END -->/,
  );
  if (!m) {
    console.error("ERROR: AUDIT-RULES JSON block not found in", MAP_PATH);
    process.exit(2);
  }
  let parsed: Rules;
  try {
    parsed = JSON.parse(m[1]) as Rules;
  } catch (err) {
    console.error("ERROR: AUDIT-RULES block is not valid JSON:", err);
    process.exit(2);
  }
  // Required-field validation. Loud failure beats silent default.
  const missing: string[] = [];
  if (!Array.isArray(parsed.fields_scanned)) missing.push("fields_scanned");
  if (!Array.isArray(parsed.attribution_fields)) missing.push("attribution_fields");
  if (!parsed.culture_cluster) missing.push("culture_cluster");
  else {
    if (typeof parsed.culture_cluster.min_token_hits !== "number")
      missing.push("culture_cluster.min_token_hits");
    if (typeof parsed.culture_cluster.anchor !== "string")
      missing.push("culture_cluster.anchor");
  }
  if (!Array.isArray(parsed.family_forbidden)) missing.push("family_forbidden");
  if (!Array.isArray(parsed.wrong_sector_tokens)) missing.push("wrong_sector_tokens");
  if (missing.length > 0) {
    console.error("ERROR: AUDIT-RULES JSON missing required field(s):", missing.join(", "));
    process.exit(2);
  }
  return parsed;
}

/**
 * Canonical contamination-detector signature. Computed from JSON (the
 * source of truth) and also extracted from the deployed SQL function for
 * drift-guard comparison. Comparing structured signatures — not rendered
 * SQL text — keeps the guard robust against Postgres formatting.
 *
 * Order rule: arrays preserve JSON source order. The generator follows
 * the same order, so a canonicalised signature is invariant to
 * pg_get_functiondef's whitespace/casing but sensitive to semantic change.
 */
export type ContaminationSignature = {
  anchor: string;
  min_token_hits: number;
  tokens: Array<{ token: string; match: "substring" | "word" }>;
  forbidden_patterns: string[];
};

export function signatureFromRules(r: Rules): ContaminationSignature {
  return {
    anchor: r.culture_cluster.anchor,
    min_token_hits: r.culture_cluster.min_token_hits,
    tokens: r.wrong_sector_tokens.map((t) => ({ token: t.token, match: t.match })),
    forbidden_patterns: r.family_forbidden.flatMap((f) =>
      f.forbidden.flatMap((g) => g.patterns),
    ),
  };
}

export function canonicaliseSignature(s: ContaminationSignature): string {
  // Stable JSON: sort tokens by token text, forbidden_patterns alphabetically,
  // so two structurally-equal signatures stringify to the same canonical form
  // even if upstream order differs cosmetically.
  return JSON.stringify({
    anchor: s.anchor,
    min_token_hits: s.min_token_hits,
    tokens: [...s.tokens].sort((a, b) => a.token.localeCompare(b.token)),
    forbidden_patterns: [...s.forbidden_patterns].sort(),
  });
}

/**
 * String-match primitives shared by the scanner loops in audit-families.ts
 * and by the classifier in classify.ts. Kept here so both consumers can
 * import without creating a dependency from the scanner onto the classifier.
 */
export function matches(haystack: string, token: string, mode: "substring" | "word"): boolean {
  if (mode === "word") {
    const re = new RegExp(`(?<![A-Za-z0-9_])${escapeRegex(token)}(?![A-Za-z0-9_])`);
    return re.test(haystack);
  }
  return haystack.includes(token);
}

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
