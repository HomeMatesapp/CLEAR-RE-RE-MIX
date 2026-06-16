// Opportunity matching helper.
// Pure function — takes a saved decision (role + Reality-check answers + result)
// and an opportunity, returns a score, group, and human-readable reasons.
//
// Hard rule: sponsored status must NEVER increase the score. It is purely a
// labelling concern.

import type { RealityCheckAnswers } from "@/lib/reality-check/types";
import { matchesLocation } from "./postcode";
import type { Opportunity, OpportunityGroup, ScoredOpportunity } from "./types";

export interface DecisionForMatching {
  role_slug: string | null;
  role_name: string | null;
  best_route_title: string | null;
  route_to_avoid_title: string | null;
  first_move: string | null;
  answers: Partial<RealityCheckAnswers> | null;
}

const PAID_TYPES = new Set(["bootcamp", "course"]);
const INCOME_TYPES = new Set([
  "job",
  "apprenticeship",
  "trainee_role",
  "assistant_role",
  "employer_programme",
]);

export function groupOf(opp: Opportunity, demote: boolean): OpportunityGroup {
  if (demote && PAID_TYPES.has(opp.type)) return "paid_careful";
  switch (opp.type) {
    case "job":
    case "trainee_role":
    case "assistant_role":
    case "employer_programme":
      return "jobs";
    case "apprenticeship":
      return "apprenticeships";
    case "course":
    case "access_course":
    case "functional_skills":
    case "bootcamp":
      return "courses";
    case "support_funding":
      return "support";
  }
}

const lc = (s: string | null | undefined) => (s ?? "").toLowerCase();

export function scoreOpportunity(
  opp: Opportunity,
  decision: DecisionForMatching,
): ScoredOpportunity {
  const reasons: string[] = [];
  const checks: string[] = [];
  let score = 0;
  const a = decision.answers ?? {};

  // ── Role match ──────────────────────────────────────────────────────────
  if (decision.role_slug && opp.role_tags?.includes(decision.role_slug)) {
    score += 30;
    reasons.push(`Tagged for ${decision.role_name ?? "this role"}.`);
  }

  // ── Route alignment ─────────────────────────────────────────────────────
  const best = lc(decision.best_route_title);
  const avoid = lc(decision.route_to_avoid_title);
  const title = lc(opp.title);
  const route_tags = opp.route_tags?.map(lc) ?? [];

  if (best) {
    const bestHit =
      route_tags.some((t) => t && best.includes(t)) ||
      (title && (best.includes(title) || title.includes(best)));
    if (bestHit) {
      score += 20;
      reasons.push("Aligns with your best route.");
    }
  }
  if (avoid) {
    const avoidHit =
      route_tags.some((t) => t && avoid.includes(t)) ||
      (title && (avoid.includes(title) || title.includes(avoid)));
    if (avoidHit) {
      score -= 25;
      checks.push("Your Reality-check flagged this kind of route as risky for you.");
    }
  }

  // ── Income need ─────────────────────────────────────────────────────────
  if (a.incomeNeed === "need_income") {
    if (INCOME_TYPES.has(opp.type)) {
      score += 15;
      reasons.push("Pays you while you train.");
    } else if (PAID_TYPES.has(opp.type)) {
      score -= 10;
      checks.push("You said you need income — this is a study-first option.");
    }
  }

  // ── English / maths gap ─────────────────────────────────────────────────
  const lacksEnglishMaths = a.englishMaths === "no" || a.englishMaths === "maths_only" || a.englishMaths === "english_only";
  if (lacksEnglishMaths && opp.type === "functional_skills") {
    score += 25;
    reasons.push("Helps close a likely English/maths entry-requirement gap.");
  }
  if (lacksEnglishMaths && opp.type !== "functional_skills" && opp.english_maths_requirements && /required/i.test(opp.english_maths_requirements)) {
    checks.push("This usually requires GCSE English/maths or equivalent — confirm before applying.");
  }

  // ── Budget ──────────────────────────────────────────────────────────────
  const lowBudget = a.budget === "zero" || a.budget === "under_500";
  if (lowBudget && PAID_TYPES.has(opp.type)) {
    score -= 15;
    checks.push("Paid option — your budget is limited, so check funding or free alternatives first.");
  }
  if (lowBudget && (opp.type === "support_funding" || opp.funding_type)) {
    score += 5;
    reasons.push("Funding option worth checking with your budget.");
  }

  // ── Full-time study + degree background ─────────────────────────────────
  if (a.incomeNeed === "full_time_study" && a.qualificationLevel === "undergrad" && (a.relevantBackground ?? "").trim()) {
    if (/msc|pre-registration|postgrad|degree/i.test(opp.title)) {
      score += 10;
      reasons.push("Your degree background and full-time availability open up postgraduate options.");
    }
  }

  // ── Location ────────────────────────────────────────────────────────────
  const loc = matchesLocation(opp, a.area);
  if (loc.matched) {
    if (loc.reason === "outward") {
      score += 10;
      reasons.push(`In your area (${opp.outward_code}).`);
    } else if (loc.reason === "area") {
      score += 8;
      reasons.push(`In your area${opp.location_name ? ` (${opp.location_name})` : ""}.`);
    } else {
      score += 4;
      reasons.push(loc.reason === "remote" ? "Remote — no commute needed." : "Online — study from anywhere.");
    }
  } else if (a.commuteFlex !== "can_relocate") {
    score -= 4;
    checks.push("Check whether this is reachable from your area.");
  }

  // ── Generic guidance ────────────────────────────────────────────────────
  if (opp.is_seed) {
    checks.push("Check current availability before applying — this is a representative listing, not a verified live vacancy.");
  } else if (!opp.verified_at) {
    checks.push("Check current availability before applying.");
  }
  if (opp.warning_notes) checks.push(opp.warning_notes);

  // ── Demote into "paid_careful" group if the user is told to avoid it ────
  const demoteToPaidCareful =
    (lowBudget || a.incomeNeed === "need_income") && PAID_TYPES.has(opp.type) && score < 25;

  // SPONSORSHIP HARD RULE: never affects score. Only labelling.
  // (Intentionally no score change here.)

  return {
    opportunity: opp,
    score,
    group: groupOf(opp, demoteToPaidCareful),
    reasons,
    checks: Array.from(new Set(checks)),
  };
}

export function scoreMany(opps: Opportunity[], decision: DecisionForMatching): ScoredOpportunity[] {
  return opps
    .map((o) => scoreOpportunity(o, decision))
    .sort((a, b) => b.score - a.score);
}

export const GROUP_LABEL: Record<OpportunityGroup, string> = {
  jobs: "Jobs and experience",
  apprenticeships: "Apprenticeships",
  courses: "Courses and bridging",
  support: "Support and funding",
  paid_careful: "Paid options to be careful with",
};

export const GROUP_ORDER: OpportunityGroup[] = [
  "jobs",
  "apprenticeships",
  "courses",
  "support",
  "paid_careful",
];
