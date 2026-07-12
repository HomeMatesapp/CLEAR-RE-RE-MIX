// Pure deterministic evaluator. No runtime-specific imports.
//
// Two entry points share one rule-application core:
//   evaluate(pack, answers)   -> RealityCheckResultV1  (unchanged behaviour)
//   evaluateV2(pack, answers) -> RealityCheckResultV2  (standard contract)
//
// Ordering, wording and classification are fully determined by the pack rules
// and the answers. Same inputs always produce the same output.
//
// Tri-state conditions (Increment 1): evaluateV2 distinguishes matched /
// not-matched / INDETERMINATE. A predicate over an unanswered question is
// indeterminate (except present/absent/unknown, which are about answeredness
// itself). A rule fires only when its condition is definitively true, and a
// requirement machineRule that is indeterminate reports the requirement as
// "unknown" rather than guessing. The V1 path collapses indeterminate to
// false, which reproduces the historical boolean behaviour exactly for every
// pre-Increment-1 pack (their ops never produce indeterminate under the old
// semantics' inputs — see evaluate-v2.test.ts's fixture-parity proof).

import type {
  AnswerMap,
  AnswerValue,
  CareerDecisionPackV1,
  ConditionNode,
  ImmediateAction,
  Predicate,
  RealityCheckResultV1,
  RequirementMarkStatus,
  RouteClassification,
  RouteEvaluation,
} from "./types.ts";
import { CONFIDENCE_PHRASE, TOP_ROUTE_PHRASE } from "./phrases.ts";
import {
  ELIGIBILITY_EXPLANATION,
  PRACTICAL_FIT_EXPLANATION,
  newAssessmentId,
  type EligibilityStatus,
  type PracticalFitStatus,
  type RealityCheckResultV2,
  type RouteEvaluationV2,
} from "./result-v2.ts";

// ── Tri-state predicate & condition evaluation ──────────────────────────────

type Tri = true | false | "indeterminate";

const isAnswered = (a: AnswerValue | undefined): boolean =>
  a !== undefined && a !== null && a !== "" && !(Array.isArray(a) && a.length === 0);

const matchPredicate = (answer: AnswerValue | undefined, p: Predicate): Tri => {
  if (p.op === "present") return isAnswered(answer);
  if (p.op === "absent") return !isAnswered(answer);
  if (p.op === "unknown") return !isAnswered(answer);
  if (!isAnswered(answer)) return "indeterminate";
  const asArray = Array.isArray(answer) ? answer : [answer];
  const valArray = Array.isArray(p.value) ? p.value : p.value === undefined ? [] : [p.value];
  switch (p.op) {
    case "eq":     return asArray.length === 1 && asArray[0] === p.value;
    case "neq":    return !(asArray.length === 1 && asArray[0] === p.value);
    case "in":     return asArray.some((a) => valArray.includes(a as string));
    case "not_in": return !asArray.some((a) => valArray.includes(a as string));
    case "gte":
    case "lte": {
      const n = typeof answer === "number" ? answer : Number(answer);
      const v = typeof p.value === "number" ? p.value : Number(p.value);
      if (!Number.isFinite(n) || !Number.isFinite(v)) return "indeterminate";
      return p.op === "gte" ? n >= v : n <= v;
    }
    case "qual_level_gte":
      // Ordinal comparison over the question's allowedValues ordering,
      // resolved by the caller via a levels lookup (see makeLevelResolver).
      return "indeterminate"; // handled in matchEntry with question context
  }
};

const isPredicate = (n: Predicate | ConditionNode): n is Predicate =>
  "questionId" in n;

/** AND over tri-states: any false ⇒ false; else any indeterminate ⇒ indeterminate; else true. */
const triAll = (xs: Tri[]): Tri =>
  xs.some((x) => x === false) ? false : xs.some((x) => x === "indeterminate") ? "indeterminate" : true;
/** OR over tri-states: any true ⇒ true; else any indeterminate ⇒ indeterminate; else false. */
const triAny = (xs: Tri[]): Tri =>
  xs.some((x) => x === true) ? true : xs.some((x) => x === "indeterminate") ? "indeterminate" : false;
const triNot = (x: Tri): Tri => (x === "indeterminate" ? "indeterminate" : !x);

/**
 * mode "v1": historic boolean semantics — an unanswered question makes
 *   neq/not_in match and every other value comparator fail (this is exactly
 *   the pre-Increment-1 `answerMatches` behaviour; proven by fixture parity).
 * mode "v2": tri-state — an unanswered question makes value comparators
 *   INDETERMINATE, so rules don't fire and machineRules report "unknown".
 */
const makeConditionEvaluator = (pack: CareerDecisionPackV1, answers: AnswerMap, mode: "v1" | "v2" = "v2") => {
  const levelOrder = new Map<string, readonly string[]>();
  for (const q of pack.questionRefs) if (q.allowedValues?.length) levelOrder.set(q.id, q.allowedValues);

  const matchEntry = (entry: Predicate | ConditionNode): Tri => {
    if (isPredicate(entry)) {
      if (entry.op === "qual_level_gte") {
        const answer = answers[entry.questionId];
        if (!isAnswered(answer)) return mode === "v1" ? false : "indeterminate";
        const order = levelOrder.get(entry.questionId);
        if (!order || typeof answer !== "string" || typeof entry.value !== "string") return "indeterminate";
        const ai = order.indexOf(answer);
        const vi = order.indexOf(entry.value);
        if (ai < 0 || vi < 0) return mode === "v1" ? false : "indeterminate";
        return ai >= vi;
      }
      const r = matchPredicate(answers[entry.questionId], entry);
      if (r === "indeterminate" && mode === "v1") {
        // Historic collapse: missing answer satisfied neq/not_in, failed the rest.
        return entry.op === "neq" || entry.op === "not_in";
      }
      return r;
    }
    return matchNode(entry);
  };

  const matchNode = (node: ConditionNode): Tri => {
    const parts: Tri[] = [];
    if (node.all) parts.push(triAll(node.all.map(matchEntry)));
    if (node.any) parts.push(triAny(node.any.map(matchEntry)));
    if (node.none) parts.push(triNot(triAny(node.none.map(matchEntry))));
    if (parts.length === 0) return true; // `{ all: [] }` (or empty node) = always
    return triAll(parts);
  };

  return matchNode;
};

/** Exported for tests and pack tooling. */
export const matchesCondition = (
  pack: CareerDecisionPackV1,
  answers: AnswerMap,
  node: ConditionNode,
  mode: "v1" | "v2" = "v2",
): Tri => makeConditionEvaluator(pack, answers, mode)(node);

// ── Shared rule-application core ────────────────────────────────────────────

interface RouteBucket {
  blocked: boolean;
  supportingReasons: string[];
  concerns: string[];
  verifications: string[];
  constraints: string[];
  evidenceRefs: Set<string>;
  actions: string[];
}

interface CoreOutput {
  perRoute: Record<string, RouteBucket>;
  considerations: string[];
  globalActions: Set<string>;
  /** Explicit requirement marks from fired rules (last mark wins, in pack rule order). */
  requirementMarks: Map<string, RequirementMarkStatus>;
  answeredCount: number;
  totalQuestionCount: number;
  coverageLevel: "comprehensive" | "adequate" | "limited";
}

const runCore = (pack: CareerDecisionPackV1, answers: AnswerMap, mode: "v1" | "v2"): CoreOutput => {
  const evalCondition = makeConditionEvaluator(pack, answers, mode);

  const perRoute: Record<string, RouteBucket> = {};
  for (const r of pack.routes) {
    perRoute[r.id] = {
      blocked: false,
      supportingReasons: [r.summary],
      concerns: [],
      verifications: [],
      constraints: [],
      evidenceRefs: new Set(r.evidenceRefs),
      actions: [],
    };
  }

  const considerations: string[] = [];
  const globalActions = new Set<string>();
  const requirementMarks = new Map<string, RequirementMarkStatus>();

  for (const rule of pack.rules) {
    // A rule fires only when its condition is definitively true. Indeterminate
    // collapses to "does not fire" — identical to the historical boolean
    // behaviour for pre-Increment-1 packs.
    if (evalCondition(rule.when) !== true) continue;
    for (const eff of rule.then) {
      switch (eff.kind) {
        case "block_route": {
          const bucket = perRoute[eff.routeId]; if (!bucket) break;
          bucket.blocked = true;
          bucket.concerns.push(eff.reason);
          for (const e of eff.evidenceRefs) bucket.evidenceRefs.add(e);
          break;
        }
        case "flag_concern": {
          const bucket = perRoute[eff.routeId]; if (!bucket) break;
          bucket.concerns.push(eff.concern);
          for (const e of eff.evidenceRefs) bucket.evidenceRefs.add(e);
          break;
        }
        case "require_verification": {
          const bucket = perRoute[eff.routeId]; if (!bucket) break;
          bucket.verifications.push(eff.check);
          for (const e of eff.evidenceRefs) bucket.evidenceRefs.add(e);
          break;
        }
        case "add_action": {
          if (eff.routeId && perRoute[eff.routeId]) perRoute[eff.routeId].actions.push(eff.actionTemplateId);
          else globalActions.add(eff.actionTemplateId);
          break;
        }
        case "add_consideration": {
          considerations.push(eff.text);
          break;
        }
        case "mark_requirement": {
          requirementMarks.set(eff.requirementId, eff.status);
          break;
        }
        case "flag_constraint": {
          const bucket = perRoute[eff.routeId]; if (!bucket) break;
          bucket.constraints.push(eff.constraint);
          for (const e of eff.evidenceRefs) bucket.evidenceRefs.add(e);
          break;
        }
      }
    }
  }

  const answeredCount = pack.questionRefs.filter((q) => isAnswered(answers[q.id])).length;
  const totalQuestionCount = pack.questionRefs.length;
  const coverageLevel: "comprehensive" | "adequate" | "limited" =
    totalQuestionCount === 0 ? "limited"
      : answeredCount / totalQuestionCount >= 0.85 ? "comprehensive"
      : answeredCount / totalQuestionCount >= 0.5 ? "adequate"
      : "limited";

  return { perRoute, considerations, globalActions, requirementMarks, answeredCount, totalQuestionCount, coverageLevel };
};

/** Deterministic ranking: fewer blockers → fewer concerns → fewer verifications → stable route order. */
const scoreRoute = (r: {
  blocked: boolean;
  concerns: number;
  verifications: number;
  index: number;
}): number => {
  return (
    (r.blocked ? 1_000_000 : 0) +
    r.concerns * 1_000 +
    r.verifications * 10 +
    r.index // stable tie-break
  );
};

const rankRoutes = (pack: CareerDecisionPackV1, core: CoreOutput) => {
  const scored = pack.routes.map((r, index) => ({
    route: r,
    index,
    bucket: core.perRoute[r.id],
    score: scoreRoute({
      blocked: core.perRoute[r.id].blocked,
      concerns: core.perRoute[r.id].concerns.length,
      verifications: core.perRoute[r.id].verifications.length,
      index,
    }),
  }));
  scored.sort((a, b) => a.score - b.score);
  return scored;
};

// ── V1 result (behaviour preserved exactly) ─────────────────────────────────

const classify = (
  concerns: number,
  verifications: number,
  blocked: boolean,
  isTop: boolean,
): RouteClassification => {
  if (blocked) return "not_currently_available_to_you";
  if (verifications > 0 && concerns === 0 && isTop) return "requires_further_verification";
  if (concerns > 0) return "possible_with_trade_offs";
  if (isTop) return "currently_looks_most_workable";
  return "possible_with_trade_offs";
};

export interface EvaluateOptions {
  /** ISO datetime; injectable so tests are deterministic. */
  now?: string;
}

export const evaluate = (
  pack: CareerDecisionPackV1,
  answers: AnswerMap,
  opts: EvaluateOptions = {},
): RealityCheckResultV1 => {
  const core = runCore(pack, answers, "v1");
  const scored = rankRoutes(pack, core);
  const topId = scored[0]?.route.id;

  const routes: RouteEvaluation[] = scored.map(({ route, bucket }) => ({
    routeId: route.id,
    routeTitle: route.title,
    classification: classify(bucket.concerns.length, bucket.verifications.length, bucket.blocked, route.id === topId),
    supportingReasons: bucket.supportingReasons,
    concerns: bucket.concerns,
    verificationsRequired: bucket.verifications,
    evidenceRefs: [...bucket.evidenceRefs].sort(),
  }));

  // Immediate actions: dedupe by template id, preserve pack order.
  const actionIds = new Set<string>();
  for (const id of core.globalActions) actionIds.add(id);
  for (const r of scored) for (const id of r.bucket.actions) actionIds.add(id);
  const immediateActions: ImmediateAction[] = pack.actionTemplates
    .filter((t) => actionIds.has(t.id))
    .map((t) => ({
      actionTemplateId: t.id,
      title: t.title,
      description: t.description,
      evidenceRefs: t.evidenceRefs,
    }));

  const topClass = routes[0]?.classification ?? "requires_further_verification";
  const limitations: string[] = [];
  if (pack.careerIdentity.geographicScope.length === 1 && pack.careerIdentity.geographicScope[0] === "England") {
    limitations.push("This Reality Check has been researched for England only. Rules, funding and regulators differ elsewhere in the UK.");
  }
  if (core.coverageLevel !== "comprehensive") {
    limitations.push("Some answers were left blank. Filling them in may change which route currently looks most workable.");
  }

  return {
    schemaVersion: "reality-check-result/v1",
    packVersion: pack.packVersion,
    roleId: pack.roleId,
    slug: pack.slug,
    evaluatedAt: opts.now ?? new Date().toISOString(),
    geographicScope: pack.careerIdentity.geographicScope,
    regulatoryStatus: pack.careerIdentity.regulatory.status,
    routes,
    considerations: core.considerations,
    immediateActions,
    evidenceCoverage: {
      level: core.coverageLevel,
      completedAnswerCount: core.answeredCount,
      totalAnswerCount: core.totalQuestionCount,
      note: CONFIDENCE_PHRASE[core.coverageLevel],
    },
    limitations,
    participantLanguage: {
      topRoutePhrase: TOP_ROUTE_PHRASE[topClass],
      confidencePhrase: CONFIDENCE_PHRASE[core.coverageLevel],
    },
  };
};

// ── V2 result (standard contract) ───────────────────────────────────────────

export interface EvaluateV2Options {
  /** ISO datetime; injectable so tests are deterministic. */
  now?: string;
  /** Injectable so tests are deterministic. */
  assessmentId?: string;
}

interface RequirementOutcome {
  met: string[];
  notMet: string[];
  unknown: string[];
  notAssessed: string[];
}

const assessRequirements = (
  pack: CareerDecisionPackV1,
  answers: AnswerMap,
  routeRequirementIds: readonly string[],
  marks: Map<string, RequirementMarkStatus>,
): RequirementOutcome => {
  const evalCondition = makeConditionEvaluator(pack, answers, "v2");
  const out: RequirementOutcome = { met: [], notMet: [], unknown: [], notAssessed: [] };
  for (const reqId of routeRequirementIds) {
    const req = pack.requirements.find((r) => r.id === reqId);
    if (!req) continue;
    const explicit = marks.get(req.id);
    if (explicit) {
      if (explicit === "met") out.met.push(req.label);
      else if (explicit === "not_met") out.notMet.push(req.label);
      else out.unknown.push(req.label);
      continue;
    }
    if (req.machineRule) {
      const r = evalCondition(req.machineRule);
      if (r === true) out.met.push(req.label);
      else if (r === false) out.notMet.push(req.label);
      else out.unknown.push(req.label);
      continue;
    }
    // No mark, no machineRule: report honestly rather than guessing.
    out.notAssessed.push(req.label);
  }
  return out;
};

const eligibilityFor = (
  bucket: RouteBucket,
  reqs: RequirementOutcome,
  nothingAnswered: boolean,
): EligibilityStatus => {
  if (nothingAnswered) return "insufficient_information";
  if (bucket.blocked || reqs.notMet.length > 0) return "not_currently_available";
  if (bucket.verifications.length > 0 || reqs.unknown.length > 0) return "requires_verification";
  if (bucket.concerns.length > 0) return "available_with_conditions";
  return "available_now";
};

const practicalFitFor = (bucket: RouteBucket, nothingAnswered: boolean): PracticalFitStatus => {
  if (nothingAnswered) return "insufficient_information";
  return bucket.constraints.length > 0 ? "constraints_to_weigh" : "appears_manageable";
};

const collectImmediateActions = (
  pack: CareerDecisionPackV1,
  scored: ReturnType<typeof rankRoutes>,
  globalActions: Set<string>,
): ImmediateAction[] => {
  const actionIds = new Set<string>();
  for (const id of globalActions) actionIds.add(id);
  for (const r of scored) for (const id of r.bucket.actions) actionIds.add(id);
  return pack.actionTemplates
    .filter((t) => actionIds.has(t.id))
    .map((t) => ({
      actionTemplateId: t.id,
      title: t.title,
      description: t.description,
      evidenceRefs: t.evidenceRefs,
    }));
};

export const evaluateV2 = (
  pack: CareerDecisionPackV1,
  answers: AnswerMap,
  opts: EvaluateV2Options = {},
): RealityCheckResultV2 => {
  const core = runCore(pack, answers, "v2");
  const scored = rankRoutes(pack, core);
  const nothingAnswered = core.totalQuestionCount > 0 && core.answeredCount === 0;

  const routes: RouteEvaluationV2[] = scored.map(({ route, bucket }) => {
    const reqs = assessRequirements(pack, answers, route.requirementIds, core.requirementMarks);
    const eligibility = eligibilityFor(bucket, reqs, nothingAnswered);
    const practicalFit = practicalFitFor(bucket, nothingAnswered);
    return {
      routeId: route.id,
      routeTitle: route.title,
      eligibility,
      practicalFit,
      requirementsMet: reqs.met,
      requirementsNotMet: reqs.notMet,
      requirementsUnknown: reqs.unknown,
      requirementsNotAssessed: reqs.notAssessed,
      constraints: bucket.constraints,
      concerns: bucket.concerns,
      verificationsRequired: bucket.verifications,
      scheduleImplications: [],
      durationLabel: route.typicalDurationLabel,
      costLabel: route.typicalCostLabel,
      evidenceRefs: [...bucket.evidenceRefs].sort(),
      immediateActionIds: [...new Set([...bucket.actions, ...(route.actionTemplateIds ?? [])])],
      comparison: {
        duration: route.typicalDurationLabel,
        cost: route.typicalCostLabel,
        ...(route.comparisonFields ?? {}),
      },
      participantExplanation:
        `${route.summary} ${ELIGIBILITY_EXPLANATION[eligibility]} ${PRACTICAL_FIT_EXPLANATION[practicalFit]}`,
    };
  });

  const strongest = routes.find((r) => r.eligibility !== "not_currently_available" && r.eligibility !== "insufficient_information") ?? null;
  const strongestRouteId = strongest?.routeId ?? null;
  const alternativeRouteIds = routes.filter((r) => r.routeId !== strongestRouteId).map((r) => r.routeId);

  const unresolvedChecks = [
    ...new Set(routes.flatMap((r) => r.verificationsRequired.map((v) => `${r.routeTitle}: ${v}`))),
  ];

  const immediateActions = collectImmediateActions(pack, scored, core.globalActions);

  const limitations: string[] = [];
  if (pack.careerIdentity.geographicScope.length === 1 && pack.careerIdentity.geographicScope[0] === "England") {
    limitations.push("This Reality Check has been researched for England only. Rules, funding and regulators differ elsewhere in the UK.");
  }
  if (core.coverageLevel !== "comprehensive") {
    limitations.push("Some answers were left blank. Filling them in may change which route currently looks most workable.");
  }

  const summary = strongest
    ? `Based on your answers, ${strongest.routeTitle} ${
        strongest.eligibility === "available_now"
          ? "currently looks the most workable route"
          : strongest.eligibility === "requires_verification"
            ? "may be workable once outstanding checks are resolved"
            : "appears open with conditions to weigh"
      }. Formal eligibility and practical fit are assessed separately below.`
    : "No route currently appears open from your answers. The reasons and next checks are listed against each route below.";

  return {
    schemaVersion: "reality-check-result/v2",
    sourceKind: "career_pack",
    packVersion: pack.packVersion,
    careerId: pack.roleId,
    slug: pack.slug,
    careerTitle: pack.careerIdentity.participantTitle,
    assessmentId: opts.assessmentId ?? newAssessmentId(),
    evaluatedAt: opts.now ?? new Date().toISOString(),
    answersSnapshot: { ...answers },
    routes,
    strongestRouteId,
    alternativeRouteIds,
    summary,
    unresolvedChecks,
    considerations: core.considerations,
    immediateActions,
    evidenceRefs: [...new Set(routes.flatMap((r) => r.evidenceRefs))].sort(),
    limitations,
    evidenceCoverage: {
      level: core.coverageLevel,
      completedAnswerCount: core.answeredCount,
      totalAnswerCount: core.totalQuestionCount,
      note: CONFIDENCE_PHRASE[core.coverageLevel],
    },
  };
};
