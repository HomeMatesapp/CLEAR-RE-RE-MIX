// Internal consolidation summary for the six frozen deep-reviewed Reality
// Checks.
//
// Intentionally does NOT change any route logic. It only aggregates data that
// already lives in the questionnaire registry, the taxonomy JSON and the
// sources module so operators can inspect coverage in one place (and tests
// can assert full coverage across the frozen set).
//
// Adding a role here without also registering it in FROZEN_DEEP_ROLES,
// ROLE_CONFIGS and role-taxonomy.json will fail the accompanying test.

import { FROZEN_DEEP_ROLES, getTaxonomyEntry } from "@/lib/roles/role-taxonomy";
import {
  hasReviewedModularRealityCheck,
  resolveConfig,
  _internal as registryInternal,
} from "./questionnaire/registry";
import { getSourcesForResult } from "./sources";
import type { RoleContext } from "./types";

export interface ReviewedDeepRoleSummary {
  roleSlug: string;
  roleName: string;
  family: string | null;
  archetype: string | null;
  engineId: string;
  questionnaireVersion: string;
  /** localStorage key used by the modular wizard draft. */
  draftKey: string;
  /** Number of evidence sources cited on a typical result for this role. */
  sourceCount: number;
  /** Question count in the modular wizard. */
  questionCount: number;
}

/** Stable draft key used by the modular wizard. Kept in one place. */
export const draftKeyFor = (roleSlug: string, questionnaireVersion: string): string =>
  `reality-check-draft:${roleSlug}:${questionnaireVersion}`;

/**
 * Build a minimal RoleContext that exercises the shared source-selection
 * logic in `getSourcesForResult`. Used purely to count how many evidence
 * sources will attach to a typical result for the role.
 */
function stubRoleContext(slug: string, name: string): RoleContext {
  return {
    role_slug: slug,
    role_name: name,
    salary_entry: 25000,
    salary_experienced: 35000,
    salary_senior: 45000,
    demand: "medium",
    competition_level: "medium",
  };
}

export function buildReviewedDeepSummary(): ReviewedDeepRoleSummary[] {
  return FROZEN_DEEP_ROLES.map((slug) => {
    const cfg = resolveConfig(slug);
    if (!cfg) {
      throw new Error(
        `Frozen deep role "${slug}" has no questionnaire registered — add it to ROLE_CONFIGS.`,
      );
    }
    const taxonomy = getTaxonomyEntry(slug);
    const roleName = taxonomy?.roleName ?? slug;
    const sources = getSourcesForResult(
      stubRoleContext(slug, roleName),
      {} as Parameters<typeof getSourcesForResult>[1],
      null,
    );
    return {
      roleSlug: slug,
      roleName,
      family: taxonomy?.primaryFamily ?? null,
      archetype: taxonomy?.routeArchetype ?? null,
      engineId: cfg.engineId,
      questionnaireVersion: cfg.questionnaireVersion,
      draftKey: draftKeyFor(slug, cfg.questionnaireVersion),
      sourceCount: sources.length,
      questionCount: cfg.questions.length,
    };
  });
}

/**
 * All slugs that resolve a modular Reality Check config. Kept separate from
 * FROZEN_DEEP_ROLES so a test can assert the two lists match.
 */
export const registeredModularRoleSlugs = (): string[] =>
  Object.keys(registryInternal.ROLE_CONFIGS).sort();

/** Human-readable text table for internal inspection / support tooling. */
export function formatReviewedDeepSummary(): string {
  const rows = buildReviewedDeepSummary();
  const header = [
    "slug",
    "family",
    "archetype",
    "engineId",
    "questionnaireVersion",
    "questions",
    "sources",
    "draftKey",
  ];
  const lines = [header.join("\t")];
  for (const r of rows) {
    lines.push(
      [
        r.roleSlug,
        r.family ?? "-",
        r.archetype ?? "-",
        r.engineId,
        r.questionnaireVersion,
        String(r.questionCount),
        String(r.sourceCount),
        r.draftKey,
      ].join("\t"),
    );
  }
  return lines.join("\n");
}

/** Convenience predicate used by the CTA badge. */
export const isReviewedDeepRole = (roleSlug: string): boolean =>
  hasReviewedModularRealityCheck(roleSlug) &&
  (FROZEN_DEEP_ROLES as readonly string[]).includes(roleSlug);
