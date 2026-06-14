/**
 * Generator: AUDIT-RULES JSON  →  scripts/generated/_is_contaminated_field.sql
 *
 * DETERMINISTIC: the SQL function body is a pure function of the JSON.
 *   - Iteration order = JSON source order (wrong_sector_tokens first→last,
 *     family_forbidden[].forbidden[].patterns flattened in source order).
 *   - No timestamps, no UUIDs, no host info, no random ordering inside the
 *     function body. Re-running with identical JSON produces a byte-identical
 *     file, which is what the drift guard relies on.
 *
 * Run: bun run scripts/gen-contamination-fn.ts
 *      (writes scripts/generated/_is_contaminated_field.sql)
 *
 * The generated file is NOT auto-applied. It is staged for review and then
 * passed through the migration tool for explicit approval.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { loadRules, type Rules } from "./lib/contamination-rules";

const OUT_PATH = resolve(process.cwd(), "scripts/generated/_is_contaminated_field.sql");

function escapeSqlString(s: string): string {
  return s.replace(/'/g, "''");
}

export function generateSql(rules: Rules): string {
  const { anchor, min_token_hits } = rules.culture_cluster;
  const tokenLines = rules.wrong_sector_tokens.map((t) => {
    if (t.match === "word") {
      // Whole-word match via posix-regex with non-word boundaries on both sides.
      return `           (CASE WHEN v ~ '(^|[^A-Za-z0-9_])${escapeSqlString(t.token)}([^A-Za-z0-9_]|$)' THEN 1 ELSE 0 END)`;
    }
    return `           (CASE WHEN v LIKE '%${escapeSqlString(t.token)}%' THEN 1 ELSE 0 END)`;
  });
  const tokenBlock = tokenLines.join(" +\n");

  const forbiddenLines: string[] = [];
  for (const fam of rules.family_forbidden) {
    for (const group of fam.forbidden) {
      for (const pat of group.patterns) {
        forbiddenLines.push(`    WHEN v ILIKE '%${escapeSqlString(pat)}%' THEN true`);
      }
    }
  }

  return [
    "-- GENERATED FILE — do not edit by hand.",
    "-- Source: docs/audit/family-token-map.md (AUDIT-RULES JSON block).",
    "-- Regenerate with: bun run scripts/gen-contamination-fn.ts",
    "-- Then apply via the migration tool (Shape A: staged → approval → apply).",
    "",
    "CREATE OR REPLACE FUNCTION public._is_contaminated_field(v text)",
    " RETURNS boolean",
    " LANGUAGE sql",
    " IMMUTABLE",
    " SET search_path TO 'public'",
    "AS $function$",
    "  SELECT CASE",
    "    WHEN v IS NULL THEN false",
    `    WHEN v ~* '${escapeSqlString(anchor)}'`,
    "         AND (",
    tokenBlock,
    `         ) >= ${min_token_hits} THEN true`,
    ...forbiddenLines,
    "    ELSE false",
    "  END;",
    "$function$;",
    "",
  ].join("\n");
}

function main() {
  const rules = loadRules();
  const sql = generateSql(rules);
  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, sql, "utf8");
  console.log(`✓ Wrote ${OUT_PATH} (${sql.length} bytes)`);
  console.log("Next: review the file, then apply via the migration tool.");
}

// Run when invoked directly.
if (import.meta.main) main();
