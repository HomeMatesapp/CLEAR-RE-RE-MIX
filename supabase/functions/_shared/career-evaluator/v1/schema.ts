// Zod schema for CareerDecisionPackV1.
// Runtime validation used by:
//   • the pack CLI (repo-first validate / test / import in PR 2)
//   • the edge function's server-side pack resolver (PR 2)
//   • the deterministic evaluator tests here in PR 1
//
// Import is a bare "zod" specifier. Vite resolves the installed npm package
// (^3.25.76). The Deno edge runtime resolves it via `supabase/functions/import_map.json`.

import { z } from "zod";
import { REGULATORY_STATUSES, REGULATORY_APPLIES_TO } from "./regulatory.ts";

const answerValue = z.union([
  z.string(),
  z.array(z.string()),
  z.boolean(),
  z.number(),
  z.null(),
]);

const predicate = z.object({
  questionId: z.string().min(1),
  op: z.enum(["eq", "neq", "in", "not_in", "present", "absent", "gte", "lte", "qual_level_gte", "unknown"]),
  value: answerValue.optional(),
});

// Recursive condition node: predicates and nested all/any/none combinators.
// A node must carry at least one combinator key; entries are predicates
// (identified by questionId) or nested nodes.
type ConditionNodeShape = {
  all?: unknown[];
  any?: unknown[];
  none?: unknown[];
};
const conditionEntry: z.ZodType<unknown> = z.lazy(() => z.union([predicate, conditionNode]));
export const conditionNode: z.ZodType<ConditionNodeShape> = z.lazy(() =>
  z.object({
    all: z.array(conditionEntry).optional(),
    any: z.array(conditionEntry).optional(),
    none: z.array(conditionEntry).optional(),
  }).refine(
    (n) => n.all !== undefined || n.any !== undefined || n.none !== undefined,
    { message: "condition node must define at least one of all/any/none" },
  ),
);

const ruleEffect = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("block_route"), routeId: z.string(), reason: z.string(), evidenceRefs: z.array(z.string()) }),
  z.object({ kind: z.literal("flag_concern"), routeId: z.string(), concern: z.string(), evidenceRefs: z.array(z.string()) }),
  z.object({ kind: z.literal("require_verification"), routeId: z.string(), check: z.string(), evidenceRefs: z.array(z.string()) }),
  z.object({ kind: z.literal("add_action"), actionTemplateId: z.string(), routeId: z.string().optional() }),
  z.object({ kind: z.literal("add_consideration"), text: z.string(), evidenceRefs: z.array(z.string()) }),
  z.object({ kind: z.literal("mark_requirement"), requirementId: z.string(), status: z.enum(["met", "not_met", "unknown"]), note: z.string().optional(), evidenceRefs: z.array(z.string()) }),
  z.object({ kind: z.literal("flag_constraint"), routeId: z.string(), constraint: z.string(), evidenceRefs: z.array(z.string()) }),
]);

export const rule = z.object({
  id: z.string().min(1),
  when: conditionNode,
  then: z.array(ruleEffect).min(1),
});

export const evidenceRecord = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  publisher: z.string().min(1),
  url: z.string().url(),
  publishedOrRetrievedOn: z.string().min(4),
  verifiedOn: z.string().min(4),
  publiclyAccessible: z.boolean(),
  withdrawn: z.boolean().optional(),
});

export const routeRef = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  typicalDurationLabel: z.string().min(1),
  typicalCostLabel: z.string().min(1),
  requirementIds: z.array(z.string()),
  evidenceRefs: z.array(z.string()),
  actionTemplateIds: z.array(z.string()).optional(),
  comparisonFields: z.record(z.string()).optional(),
});

export const requirementRef = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1),
  verifiedBy: z.string().min(1),
  evidenceRefs: z.array(z.string()),
  machineRule: conditionNode.optional(),
  requirementType: z.enum(["machine_assessable", "participant_verification"]).optional(),
});

export const questionRef = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  helpText: z.string().optional(),
  allowedValues: z.array(z.string()).optional(),
  contextOnly: z.boolean().optional(),
});

export const actionTemplate = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  effortLabel: z.string().min(1),
  evidenceRefs: z.array(z.string()),
});

export const testProfile = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  answers: z.record(answerValue),
  expect: z.object({
    rankedRouteIds: z.array(z.string()).optional(),
    blockedRouteIds: z.array(z.string()).optional(),
    mustMention: z.array(z.string()).optional(),
    mustNotMention: z.array(z.string()).optional(),
    requiredActionIds: z.array(z.string()).optional(),
  }),
});

export const careerIdentity = z.object({
  canonicalTitle: z.string().min(1),
  participantTitle: z.string().min(1),
  aliases: z.array(z.string()),
  sector: z.string().min(1),
  occupationalFamily: z.string().min(1),
  regulatory: z.object({
    status: z.enum(REGULATORY_STATUSES),
    body: z.string().optional(),
    protectedTitle: z.string().optional(),
    requiredRegisterOrLicence: z.string().optional(),
    appliesTo: z.enum(REGULATORY_APPLIES_TO),
    note: z.string().optional(),
  }),
  geographicScope: z.array(z.string()).min(1),
});

export const contentReview = z.object({
  ownerDisplayName: z.string().min(1),
  reviewerDisplayName: z.string().min(1),
  lastReviewedAt: z.string().min(4),
  nextReviewDueAt: z.string().min(4),
  sourcesAsOf: z.string().min(4),
});

export const careerDecisionPackV1 = z.object({
  schemaVersion: z.literal("career-decision-pack/v1"),
  packVersion: z.string().regex(/^\d+\.\d+\.\d+$/, "packVersion must be semver"),
  roleId: z.string().uuid(),
  slug: z.string().min(1),
  archetypeId: z.string().min(2),
  careerIdentity,
  routes: z.array(routeRef).min(1),
  requirements: z.array(requirementRef),
  questionRefs: z.array(questionRef).min(1),
  rules: z.array(rule),
  evidenceRecords: z.array(evidenceRecord).min(1),
  actionTemplates: z.array(actionTemplate),
  testProfiles: z.array(testProfile).min(12, "packs require at least 12 test profiles"),
  contentReview,
});

// Cross-field integrity checks that Zod cannot express structurally.
export const validatePackCrossRefs = (pack: unknown): string[] => {
  const result = careerDecisionPackV1.safeParse(pack);
  if (!result.success) return result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
  const p = result.data;
  const errs: string[] = [];
  const evidenceIds = new Set(p.evidenceRecords.map((e) => e.id));
  const routeIds = new Set(p.routes.map((r) => r.id));
  const requirementIds = new Set(p.requirements.map((r) => r.id));
  const questionIds = new Set(p.questionRefs.map((q) => q.id));
  const actionIds = new Set(p.actionTemplates.map((a) => a.id));

  for (const r of p.routes) {
    for (const rq of r.requirementIds) if (!requirementIds.has(rq)) errs.push(`route ${r.id} references unknown requirement ${rq}`);
    for (const ev of r.evidenceRefs) if (!evidenceIds.has(ev)) errs.push(`route ${r.id} references unknown evidence ${ev}`);
  }
  for (const req of p.requirements) for (const ev of req.evidenceRefs) if (!evidenceIds.has(ev)) errs.push(`requirement ${req.id} references unknown evidence ${ev}`);
  for (const a of p.actionTemplates) for (const ev of a.evidenceRefs) if (!evidenceIds.has(ev)) errs.push(`action ${a.id} references unknown evidence ${ev}`);

  const referencedQuestions = new Set<string>();
  for (const rule of p.rules) {
    for (const pr of collectPredicates(rule.when)) {
      referencedQuestions.add(pr.questionId);
      if (!questionIds.has(pr.questionId)) errs.push(`rule ${rule.id} references unknown question ${pr.questionId}`);
      if (pr.op === "qual_level_gte") {
        const q = p.questionRefs.find((qq) => qq.id === pr.questionId);
        if (q && !q.allowedValues?.length) errs.push(`rule ${rule.id} uses qual_level_gte on question ${pr.questionId} which has no allowedValues ordering`);
        if (q?.allowedValues?.length && typeof pr.value === "string" && !q.allowedValues.includes(pr.value)) {
          errs.push(`rule ${rule.id} compares question ${pr.questionId} against value "${pr.value}" not in its allowedValues`);
        }
      }
    }
    // Contradictory-effect detection: one rule must not mark the same
    // requirement with two different statuses, or both block a route and
    // mark all of that route's requirements met.
    const marks = new Map<string, string>();
    for (const eff of rule.then) {
      if (eff.kind === "mark_requirement") {
        const prev = marks.get(eff.requirementId);
        if (prev && prev !== eff.status) errs.push(`rule ${rule.id} marks requirement ${eff.requirementId} both ${prev} and ${eff.status}`);
        marks.set(eff.requirementId, eff.status);
        if (!requirementIds.has(eff.requirementId)) errs.push(`rule ${rule.id} references unknown requirement ${eff.requirementId}`);
      }
      if ("routeId" in eff && eff.routeId && !routeIds.has(eff.routeId)) errs.push(`rule ${rule.id} references unknown route ${eff.routeId}`);
      if (eff.kind === "add_action" && !actionIds.has(eff.actionTemplateId)) errs.push(`rule ${rule.id} references unknown action ${eff.actionTemplateId}`);
      if ("evidenceRefs" in eff) for (const ev of eff.evidenceRefs) if (!evidenceIds.has(ev)) errs.push(`rule ${rule.id} references unknown evidence ${ev}`);
    }
  }
  for (const req of p.requirements) {
    if (req.machineRule) {
      for (const pr of collectPredicates(req.machineRule)) {
        referencedQuestions.add(pr.questionId);
        if (!questionIds.has(pr.questionId)) errs.push(`requirement ${req.id} machineRule references unknown question ${pr.questionId}`);
      }
    }
  }
  for (const r of p.routes) {
    for (const aid of r.actionTemplateIds ?? []) if (!actionIds.has(aid)) errs.push(`route ${r.id} references unknown action ${aid}`);
  }
  // participant title guard: must include the canonical title as a substring
  // OR be identical. Prevents "Midwife" being renamed to "Home-birth midwife".
  const canon = p.careerIdentity.canonicalTitle.toLowerCase();
  const part = p.careerIdentity.participantTitle.toLowerCase();
  if (part !== canon && !part.includes(canon)) {
    errs.push(`participantTitle "${p.careerIdentity.participantTitle}" narrows canonicalTitle "${p.careerIdentity.canonicalTitle}"`);
  }
  return errs;
};

// ── Condition traversal ──────────────────────────────────────────────────────

interface PredicateShape { questionId: string; op: string; value?: unknown }
const isPredicate = (n: unknown): n is PredicateShape =>
  !!n && typeof n === "object" && "questionId" in (n as Record<string, unknown>);

/** Flatten a (possibly nested) condition node into its predicates. */
export const collectPredicates = (node: unknown): PredicateShape[] => {
  if (!node || typeof node !== "object") return [];
  if (isPredicate(node)) return [node];
  const out: PredicateShape[] = [];
  const n = node as { all?: unknown[]; any?: unknown[]; none?: unknown[] };
  for (const list of [n.all, n.any, n.none]) {
    if (!list) continue;
    for (const entry of list) out.push(...collectPredicates(entry));
  }
  return out;
};

// ── Publication gates (Increment 1) ─────────────────────────────────────────
//
// Stricter than cross-ref validation. A pack that passes validatePackCrossRefs
// may still be refused publication if its content is not decision-complete:
//   1. every route must cite at least one evidence record;
//   2. every requirement must be ASSESSABLE — it has a machineRule, or at
//      least one rule marks it, or it is explicitly declared
//      participant_verification;
//   3. nothing may reference withdrawn evidence.
export const validatePublicationGates = (pack: unknown): string[] => {
  const structural = validatePackCrossRefs(pack);
  if (structural.length) return structural;
  const p = careerDecisionPackV1.parse(pack);
  const errs: string[] = [];

  const withdrawn = new Set(p.evidenceRecords.filter((e) => e.withdrawn).map((e) => e.id));
  const markedRequirements = new Set<string>();
  for (const r of p.rules) for (const eff of r.then) if (eff.kind === "mark_requirement") markedRequirements.add(eff.requirementId);

  for (const route of p.routes) {
    if (route.evidenceRefs.length === 0) errs.push(`route ${route.id} has no evidence`);
    for (const ev of route.evidenceRefs) if (withdrawn.has(ev)) errs.push(`route ${route.id} references withdrawn evidence ${ev}`);
  }
  for (const req of p.requirements) {
    const assessable = !!req.machineRule || markedRequirements.has(req.id) || req.requirementType === "participant_verification";
    if (!assessable) errs.push(`requirement ${req.id} is not assessable: add a machineRule, a mark_requirement rule, or declare it participant_verification`);
    for (const ev of req.evidenceRefs) if (withdrawn.has(ev)) errs.push(`requirement ${req.id} references withdrawn evidence ${ev}`);
  }
  for (const a of p.actionTemplates) for (const ev of a.evidenceRefs) if (withdrawn.has(ev)) errs.push(`action ${a.id} references withdrawn evidence ${ev}`);
  for (const r of p.rules) for (const eff of r.then) {
    if ("evidenceRefs" in eff) for (const ev of eff.evidenceRefs) if (withdrawn.has(ev)) errs.push(`rule ${r.id} references withdrawn evidence ${ev}`);
  }
  // Dead-question gate: every question must be referenced by a rule predicate
  // or a machineRule, or be explicitly declared contextOnly. Otherwise it
  // silently collects answers that can never influence a result.
  const referenced = new Set<string>();
  for (const r of p.rules) for (const pr of collectPredicates(r.when)) referenced.add(pr.questionId);
  for (const req of p.requirements) if (req.machineRule) for (const pr of collectPredicates(req.machineRule)) referenced.add(pr.questionId);
  for (const q of p.questionRefs) {
    if (!referenced.has(q.id) && !q.contextOnly) errs.push(`question ${q.id} is never referenced by any rule or machineRule (dead question); declare it contextOnly if intentional`);
  }
  return errs;
};
