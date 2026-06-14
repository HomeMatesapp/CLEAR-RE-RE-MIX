/**
 * Family contamination audit.
 *
 * Reads docs/audit/family-token-map.md, extracts the AUDIT-RULES JSON block,
 * queries the live `roles` table, and reports any role whose family-keyed
 * fields carry a forbidden or wrong-sector token.
 *
 * Run: bun run audit:families
 * Exits 0 on no findings (or report-only findings),
 *       1 on culture-cluster template_leak findings,
 *       2 on setup errors,
 *       3 on drift between AUDIT-RULES JSON and deployed _is_contaminated_field.
 *
 * REPORT-ONLY (first pass): family-forbidden template_leak findings are
 * classified and printed prominently, but do NOT flip the exit code yet.
 * Once the second cluster is triaged and cleaned, this gate goes live.
 */
import { EXPECTED_MIN_ROLES } from "./audit-config";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  canonicaliseSignature,
  loadRules,
  matches,
  signatureFromRules,
  type ContaminationSignature,
  type Rules,
  type WrongSectorRule,
} from "./lib/contamination-rules";
import {
  makeClassifier,
  type FindingKind,
  type FindingReason,
  type FindingShape,
} from "./lib/classify";
import { generateSql } from "./gen-contamination-fn";

type Finding = {
  kind: FindingKind;
  role_slug: string;
  field: string;
  family: number;
  token: string;
  label: string;
  excerpt: string;
  shape: FindingShape;
  reason: FindingReason;
};

const GENERATED_SQL_PATH = resolve(process.cwd(), "scripts/generated/_is_contaminated_field.sql");

function excerpt(text: string, token: string, ctx = 40): string {
  const i = text.toLowerCase().indexOf(token.toLowerCase());
  if (i < 0) return text.slice(0, 80);
  const start = Math.max(0, i - ctx);
  const end = Math.min(text.length, i + token.length + ctx);
  return (start > 0 ? "…" : "") + text.slice(start, end).replace(/\s+/g, " ") + (end < text.length ? "…" : "");
}

// ─────────────────────────────────────────────────────────────────────────────
// Drift guard: compare canonical signatures, not rendered SQL text.
//
// Two drift modes:
//   (a) JSON changed but generator not re-run → staged SQL file is stale.
//       Detected by regenerating in-memory and comparing to the file on disk.
//   (b) Generated file changed but migration not applied → deployed function
//       lags the staged file. Detected by extracting the deployed function's
//       tokens/patterns/anchor and comparing to the JSON-derived signature.
//
// Comparison is on canonical structured signatures (sorted, deduped) so it
// is invariant to whitespace/casing/ordering — the only way to drift is to
// change the actual rules, which is the thing we want to catch.
// ─────────────────────────────────────────────────────────────────────────────

function extractDeployedSignature(funcDef: string): ContaminationSignature | null {
  // Anchor: WHEN v ~* '<anchor>'
  const anchorMatch = funcDef.match(/WHEN\s+v\s*~\*\s*'([^']+)'/i);
  // Threshold: ) >= N
  const thresholdMatch = funcDef.match(/\)\s*>=\s*(\d+)\s+THEN\s+true/i);
  if (!anchorMatch || !thresholdMatch) return null;

  const tokens: Array<{ token: string; match: "substring" | "word" }> = [];
  // Substring tokens: CASE WHEN v LIKE '%TOKEN%' THEN 1 ELSE 0 END
  for (const m of funcDef.matchAll(/CASE\s+WHEN\s+v\s+LIKE\s+'%([^%']+)%'\s+THEN\s+1/gi)) {
    tokens.push({ token: m[1], match: "substring" });
  }
  // Word tokens: CASE WHEN v ~ '(^|[^A-Za-z0-9_])TOKEN([^A-Za-z0-9_]|$)' THEN 1
  for (const m of funcDef.matchAll(
    /CASE\s+WHEN\s+v\s+~\s+'\(\^\|\[\^A-Za-z0-9_\]\)([^()'\\]+)\(\[\^A-Za-z0-9_\]\|\$\)'\s+THEN\s+1/gi,
  )) {
    tokens.push({ token: m[1], match: "word" });
  }

  // Forbidden patterns: WHEN v ILIKE '%PAT%' THEN true
  const forbidden_patterns: string[] = [];
  for (const m of funcDef.matchAll(/WHEN\s+v\s+ILIKE\s+'%([^']+?)%'\s+THEN\s+true/gi)) {
    // Postgres returns escaped single-quotes as '' — unescape.
    forbidden_patterns.push(m[1].replace(/''/g, "'"));
  }

  return {
    anchor: anchorMatch[1],
    min_token_hits: Number(thresholdMatch[1]),
    tokens,
    forbidden_patterns,
  };
}

async function runDriftGuard(
  supabase: ReturnType<typeof createClient>,
  rules: Rules,
): Promise<void> {
  const expectedSig = signatureFromRules(rules);
  const expectedCanon = canonicaliseSignature(expectedSig);

  // ── Drift (a): staged SQL file vs current JSON.
  const generatedNow = generateSql(rules);
  if (!existsSync(GENERATED_SQL_PATH)) {
    console.error(
      `ERROR (drift): staged SQL not found at ${GENERATED_SQL_PATH}.\n` +
        `  Run: bun run scripts/gen-contamination-fn.ts`,
    );
    process.exit(3);
  }
  const onDisk = readFileSync(GENERATED_SQL_PATH, "utf8");
  if (onDisk !== generatedNow) {
    console.error(
      `ERROR (drift): ${GENERATED_SQL_PATH} is out of sync with AUDIT-RULES JSON.\n` +
        `  Run: bun run scripts/gen-contamination-fn.ts\n` +
        `  Then apply the regenerated file via the migration tool.`,
    );
    process.exit(3);
  }

  // ── Drift (b): deployed function signature vs JSON signature.
  // Requires the RPC public.get_contamination_fn_def() returning text.
  const { data, error } = await supabase.rpc("get_contamination_fn_def");
  if (error) {
    console.warn(
      `WARN (drift guard): could not fetch deployed function (${error.message}). ` +
        `Drift-mode-b skipped. Apply the migration that exposes ` +
        `public.get_contamination_fn_def() to enable it.`,
    );
    return;
  }
  const deployedSig = extractDeployedSignature(String(data ?? ""));
  if (!deployedSig) {
    console.error(
      "ERROR (drift): could not extract signature from deployed _is_contaminated_field.\n" +
        "  The deployed function body did not match the expected shape. " +
        "Regenerate and apply, or update the extractor if the shape has changed intentionally.",
    );
    process.exit(3);
  }
  const deployedCanon = canonicaliseSignature(deployedSig);
  if (deployedCanon !== expectedCanon) {
    console.error("ERROR (drift): deployed _is_contaminated_field does not match AUDIT-RULES JSON.");
    console.error("  expected:", expectedCanon);
    console.error("  deployed:", deployedCanon);
    console.error("  Regenerate: bun run scripts/gen-contamination-fn.ts");
    console.error("  Then apply the staged SQL via the migration tool.");
    process.exit(3);
  }
}

async function main() {
  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error(
      "ERROR: set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (or SUPABASE_URL / SUPABASE_ANON_KEY) in the env.",
    );
    process.exit(2);
  }
  const supabase = createClient(url, key);
  const rules = loadRules();

  // Drift guard FIRST. Distinct exit code (3). Single command, unforgettable.
  await runDriftGuard(supabase, rules);

  const select = ["role_slug", "pathway_family", "review_status", ...rules.fields_scanned].join(",");
  const { data, error } = await supabase.from("roles").select(select).limit(5000);
  if (error) {
    console.error("ERROR querying roles:", error.message);
    process.exit(2);
  }
  const all = (data ?? []) as unknown as Array<Record<string, string | number | null>>;
  const roles = all.filter(
    (r) => r.review_status !== "merged" && !String(r.role_slug ?? "").startsWith("_merged_"),
  );

  // Row-count guard: detect truncation, RLS lockout, or silent empty-read.
  // A small scan must NEVER be reported as "all clean".
  if (all.length < EXPECTED_MIN_ROLES) {
    console.error(
      `ERROR: scanned ${all.length} < ${EXPECTED_MIN_ROLES} — possible auth/RLS/data problem, this is NOT a clean result.`,
    );
    console.error(
      "  The table may be truncated, the anon role may have lost read access, the query may be wrong, or EXPECTED_MIN_ROLES in scripts/audit-config.ts needs updating after a bulk ingestion.",
    );
    process.exit(2);
  }

  // ── JSON-driven shape classifier.
  //
  // template_leak fires in any of three semantically-equivalent ways:
  //   (1) culture_cluster: ≥ min_token_hits of wrong_sector_tokens hit the
  //       value AND the anchor regex matches (the original detector).
  //   (2) family_forbidden_residue: ANY family_forbidden pattern appears in
  //       the value — family-incompatible residue.
  //   (3) wrong_sector_attribution (NEW, report-only): a SINGLE
  //       wrong_sector_token hit suffices when the field is an attribution
  //       field AND the role sits outside the token's legitimate_families.
  //       Rationale: there is no legitimate reason for a non-archives role
  //       to cite ARA *as a source*; the same token in narrative prose
  //       (e.g. "the ARA-accredited MA" in pathway_adjacent) is fine.
  //
  // Gate state (all three live):
  //   culture_cluster              → exit 1
  //   family_forbidden_residue     → exit 1
  //   wrong_sector_attribution     → exit 1 (verified-zero baseline 2026-06-13)
  const classify = makeClassifier(rules);

  const findings: Finding[] = [];

  for (const fam of rules.family_forbidden) {
    const inFam = roles.filter((r) => r.pathway_family === fam.family);
    for (const r of inFam) {
      for (const field of rules.fields_scanned) {
        const v = r[field];
        if (typeof v !== "string" || !v) continue;
        for (const group of fam.forbidden) {
          for (const pat of group.patterns) {
            if (matches(v, pat, "substring")) {
              const cls = classify(v, "family_forbidden", { field, family: fam.family });
              findings.push({
                kind: "family_forbidden",
                role_slug: String(r.role_slug),
                family: fam.family,
                field,
                token: pat,
                label: `fam-${fam.family} forbidden — ${group.label}`,
                excerpt: excerpt(v, pat),
                shape: cls.shape,
                reason: cls.reason,
              });
            }
          }
        }
      }
    }
  }

  for (const rule of rules.wrong_sector_tokens) {
    for (const r of roles) {
      const fam = Number(r.pathway_family);
      if (rule.legitimate_families.includes(fam)) continue;
      for (const field of rules.fields_scanned) {
        const v = r[field];
        if (typeof v !== "string" || !v) continue;
        if (matches(v, rule.token, rule.match)) {
          const cls = classify(v, "wrong_sector", { field, rule, family: fam });
          findings.push({
            kind: "wrong_sector",
            role_slug: String(r.role_slug),
            family: fam,
            field,
            token: rule.token,
            label: `wrong-sector token "${rule.token}" outside legitimate families${rule.note ? ` (${rule.note})` : ""}`,
            excerpt: excerpt(v, rule.token),
            shape: cls.shape,
            reason: cls.reason,
          });
        }
      }
    }
  }

  // ── Report.
  console.log(
    `Scanned ${roles.length} roles against ${rules.family_forbidden.length} family-forbidden rule(s) and ${rules.wrong_sector_tokens.length} wrong-sector token(s).`,
  );
  if (findings.length === 0) {
    console.log("✓ No contamination findings.");
    process.exit(0);
  }
  const cultureLeak = findings.filter((f) => f.reason === "culture_cluster");
  const residueLeak = findings.filter((f) => f.reason === "family_forbidden_residue");
  const wrongSectorAttr = findings.filter((f) => f.reason === "wrong_sector_attribution");
  const inProse = findings.filter((f) => f.reason === "in_prose");
  console.log(
    `\n✗ ${findings.length} finding(s): ${cultureLeak.length} culture-cluster template_leak (gates), ` +
      `${residueLeak.length} family-forbidden residue (gates), ` +
      `${wrongSectorAttr.length} wrong-sector-in-attribution (gates), ` +
      `${inProse.length} in-prose (triage).\n`,
  );

  const groupAndPrint = (title: string, list: Finding[]) => {
    if (list.length === 0) return;
    console.log(`▌ ${title} (${list.length})`);
    const grouped = new Map<string, Finding[]>();
    for (const f of list) {
      if (!grouped.has(f.label)) grouped.set(f.label, []);
      grouped.get(f.label)!.push(f);
    }
    for (const [label, items] of [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      console.log(`── ${label} (${items.length})`);
      for (const f of items) {
        console.log(`   ${f.role_slug}  [fam ${f.family}]  ${f.field}  →  ${f.excerpt}`);
      }
    }
    console.log("");
  };

  groupAndPrint("CULTURE-CLUSTER TEMPLATE_LEAK (gates exit-1)", cultureLeak);
  groupAndPrint("FAMILY-FORBIDDEN RESIDUE (gates exit-1)", residueLeak);
  groupAndPrint("WRONG-SECTOR TOKEN IN ATTRIBUTION FIELD (gates exit-1)", wrongSectorAttr);
  groupAndPrint("IN-PROSE (informational triage)", inProse);

  // All three gates live on verified-zero baseline (2026-06-13).
  const gating = cultureLeak.length + residueLeak.length + wrongSectorAttr.length;
  process.exit(gating > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("ERROR:", err);
  process.exit(2);
});
