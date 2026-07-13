#!/usr/bin/env bun
// Career-pack validation CLI (Increment 11).
//
// Usage:
//   bun run scripts/validate-pack.ts <pack-json> [--allow-gate-failures]
//
// Runs the complete local check-set for a pack: schema, cross-refs,
// publication gates, every test profile through both contracts
// (determinism, V2 validity, expectations), and the forbidden-language
// scan of both pack content and results. Exit 0 = publishable-shape,
// exit 1 = problems (listed).
//
// --allow-gate-failures downgrades publication gates to warnings, for
// inspecting pre-Increment legacy packs (e.g. midwife 1.0.0).

import { readFileSync } from "node:fs";
import { validatePackContent } from "./lib/validate-pack-core";

const main = async () => {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith("--"));
  const allowGateFailures = args.includes("--allow-gate-failures");
  if (!file) {
    console.error("usage: bun run scripts/validate-pack.ts <pack-json> [--allow-gate-failures]");
    process.exit(2);
  }
  const json = JSON.parse(readFileSync(file, "utf-8"));
  const report = await validatePackContent(json, { allowGateFailures });

  const s = report.stats;
  console.log(`\n${file}`);
  console.log(`  ${s.routes} routes · ${s.requirements} requirements (${s.machineAssessableRequirements} machine-assessable) · ${s.questions} questions · ${s.rules} rules · ${s.evidenceRecords} evidence records · ${s.testProfiles} profiles\n`);
  for (const w of report.warnings) console.log(`  WARN  ${w}`);
  for (const e of report.errors) console.log(`  ERROR ${e}`);
  console.log(report.ok ? "\n  ✓ pack passes every local check\n" : `\n  ✗ ${report.errors.length} problem(s)\n`);
  process.exit(report.ok ? 0 : 1);
};

main();
