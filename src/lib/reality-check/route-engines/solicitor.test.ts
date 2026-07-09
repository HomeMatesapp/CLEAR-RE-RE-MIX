// Solicitor engine — Vitest suite. Enforces Design Brief v2 contract.

import { describe, it, expect } from "vitest";
import fixtures from "../../../../shared/reality-check/solicitor-cases.json";
import { ROUTE_TITLES, runSolicitorEngine } from "./solicitor";
import { buildSolicitorResult, SOLICITOR_SCOPE_NOTE } from "./solicitor-adapter";
import { CHARACTER_SUITABILITY_CAVEAT } from "./solicitor-flavor";
import type { SolicitorSignals } from "../questionnaire/signals";
import { solicitorConfig } from "../questionnaire/roles/solicitor";
import {
  FROZEN_DEEP_ROLES,
  getTaxonomyEntry,
} from "@/lib/roles/role-taxonomy";
import { SOURCES } from "../sources";

const base = (overrides: Partial<SolicitorSignals> = {}): SolicitorSignals => ({
  startingPoint: "graduate_law",
  highestQualification: "bachelors_law",
  legalExperience: "none",
  degreeStatus: "completed_law_degree",
  lpcOrLegacyStatus: "not_started_legal_training",
  sqeAwareness: "understand_sqe_and_qwe",
  qweSignal: "none",
  trainingPreference: "shortest_structural_route",
  studyTimeAvailable: "full_time_study_possible",
  budgetForTrainingAndExams: "1000_to_5000",
  jurisdictionOrTransferStatus: "england_wales_beginner",
  routePriorities: ["qualify_as_fast_as_possible"],
  checksBeforeCommitting: [],
  ...overrides,
});

const run = (s: SolicitorSignals) => runSolicitorEngine({ signals: s });

// ── Fixture parity ─────────────────────────────────────────────────────────
describe("Solicitor — shared fixture parity", () => {
  for (const c of fixtures) {
    it(`fixture: ${c.name}`, () => {
      const out = run(c.signals as SolicitorSignals);
      if (c.expected.status !== undefined) expect(out.status).toBe(c.expected.status);
      if ("recommendedRouteId" in c.expected) {
        expect(out.recommendedRouteId).toBe(c.expected.recommendedRouteId);
      }
      if ("recommendedRouteMustNotBe" in c.expected) {
        expect(out.recommendedRouteId).not.toBe(c.expected.recommendedRouteMustNotBe);
      }
    });
  }
});

// ── Slug / version / draft-key consistency ─────────────────────────────────
describe("Solicitor — slug / version / draft key", () => {
  it("registers with slug=solicitor, engineId=solicitor-v1, questionnaireVersion=solicitor-v1", () => {
    expect(solicitorConfig.roleSlug).toBe("solicitor");
    expect(solicitorConfig.engineId).toBe("solicitor-v1");
    expect(solicitorConfig.questionnaireVersion).toBe("solicitor-v1");
    expect(solicitorConfig.requestBodyKey).toBe("solicitorSignals");
  });
});

// ── Question set / no forbidden disclosure fields ──────────────────────────
describe("Solicitor — question set and no-disclosure invariants", () => {
  it("questionnaire has 13 questions in the specified order", () => {
    expect(solicitorConfig.questions.map((q) => q.id)).toEqual([
      "starting_point",
      "highest_qualification",
      "legal_experience",
      "degree_status",
      "lpc_or_legacy_status",
      "sqe_awareness",
      "qwe_signal",
      "training_preference",
      "study_time_available",
      "budget_for_training_and_exams",
      "jurisdiction_or_transfer_status",
      "route_priorities",
      "checks_before_committing",
    ]);
  });

  it("no question or option label asks for banned disclosure topics", () => {
    // Character/suitability appears ONLY on the checks-before-committing
    // question (as a process topic). Every other question must be clear of
    // all disclosure tokens.
    const disclosureTokens =
      /\b(criminal|caution|disciplin|health|disab|immigration|visa|nationalit)\b/i;
    for (const q of solicitorConfig.questions) {
      const combined = [
        q.title,
        q.helpText ?? "",
        q.whyWeAsk,
        ...(q.options ?? []).map((o) => `${o.label} ${o.small ?? ""}`),
      ].join(" ");
      expect(
        disclosureTokens.test(combined),
        `question ${q.id} referenced a banned disclosure topic`,
      ).toBe(false);
    }
  });

  it("character_and_suitability_process is a check TOPIC only, never a separate question", () => {
    const checks = solicitorConfig.questions.find(
      (q) => q.id === "checks_before_committing",
    )!;
    const vals = (checks.options ?? []).map((o) => o.value);
    expect(vals).toContain("character_and_suitability_process");
    // No other question mentions "character" or "suitability" in its id.
    for (const q of solicitorConfig.questions) {
      if (q.id === "checks_before_committing") continue;
      expect(q.id).not.toContain("character");
      expect(q.id).not.toContain("suitability");
    }
  });

  it("lpc_or_legacy_status is present as its own signal question", () => {
    expect(solicitorConfig.questions.map((q) => q.id)).toContain("lpc_or_legacy_status");
  });
});

// ── LPC / transitional handling ────────────────────────────────────────────
describe("Solicitor — LPC / legacy transitional handling", () => {
  it("completed_lpc → qualification_verification_required, no beginner SQE primary", () => {
    const out = run(base({ lpcOrLegacyStatus: "completed_lpc" }));
    expect(out.status).toBe("qualification_verification_required");
    expect(out.recommendedRouteId).toBeNull();
    expect(out.isLpcVerification).toBe(true);
    expect(out.verificationPrimaryRouteId).toBe("lpc_legacy_transition_route");
  });

  it("started_period_of_recognised_training → verification-led, not SQE beginner", () => {
    const out = run(
      base({ lpcOrLegacyStatus: "started_period_of_recognised_training" }),
    );
    expect(out.status).toBe("qualification_verification_required");
    expect(out.recommendedRouteId).not.toBe("sqe_degree_route");
  });

  it("completed_gdl_or_pgdl → verification-led, SQE degree may appear as may_open_later", () => {
    const out = run(
      base({
        highestQualification: "bachelors_non_law",
        degreeStatus: "completed_non_law_degree",
        lpcOrLegacyStatus: "completed_gdl_or_pgdl",
      }),
    );
    expect(out.status).toBe("qualification_verification_required");
    expect(out.mayOpenLaterRouteIds).toContain("sqe_degree_route");
  });

  it("adapter emits investigate_after_check card + LPC transitional caveat", () => {
    const r = buildSolicitorResult({
      signals: base({ lpcOrLegacyStatus: "completed_lpc" }),
    });
    const cards = r.modular?.routes ?? [];
    expect(cards.some((c) => c.kind === "investigate_after_check")).toBe(true);
    const blob = JSON.stringify(r).toLowerCase();
    expect(blob).toContain("lpc route is transitional");
  });
});

// ── Qualified lawyer transfer stays verification-led ───────────────────────
describe("Solicitor — qualified lawyer transfer", () => {
  it("startingPoint=qualified_lawyer_overseas → verification, no beginner card fabricated", () => {
    const out = run(
      base({
        startingPoint: "qualified_lawyer_overseas_or_other_jurisdiction",
        highestQualification: "professional_legal_qualification",
        jurisdictionOrTransferStatus: "already_qualified_outside_england_wales",
      }),
    );
    expect(out.status).toBe("qualification_verification_required");
    expect(out.isTransferVerification).toBe(true);
    expect(out.recommendedRouteId).toBeNull();
    expect(out.verificationPrimaryRouteId).toBeNull();
  });

  it("professional_legal_qualification alone triggers transfer verification", () => {
    const out = run(base({ highestQualification: "professional_legal_qualification" }));
    expect(out.status).toBe("qualification_verification_required");
    expect(out.isTransferVerification).toBe(true);
  });

  it("transfer verification never renders SQE beginner as recommended", () => {
    const r = buildSolicitorResult({
      signals: base({
        startingPoint: "qualified_lawyer_overseas_or_other_jurisdiction",
        jurisdictionOrTransferStatus: "already_qualified_outside_england_wales",
      }),
    });
    const cards = r.modular?.routes ?? [];
    expect(cards.some((c) => c.kind === "recommended")).toBe(false);
    expect(cards.some((c) => c.kind === "backup")).toBe(false);
  });
});

// ── Apprenticeship route caveats ───────────────────────────────────────────
describe("Solicitor — apprenticeship route", () => {
  it("carries employer-availability + SQE-still-required caveats", () => {
    const out = run(
      base({
        highestQualification: "a_level_or_level_3",
        degreeStatus: "no_degree",
        trainingPreference: "earn_while_training",
        studyTimeAvailable: "need_to_keep_earning",
        routePriorities: ["earn_while_training"],
      }),
    );
    const ev = out.routeEvaluations.find(
      (r) => r.id === "solicitor_apprenticeship_route",
    )!;
    expect(ev.eligible).toBe(true);
    const blob = ev.blockersAndChecks.join(" ").toLowerCase();
    expect(blob).toContain("employer");
    expect(blob).toContain("sqe assessment is still required");
  });
});

// ── QWE copy never asserts QWE is accepted ─────────────────────────────────
describe("Solicitor — QWE copy", () => {
  it("QWE-relevant route copy says must be confirmed by an appropriate person or organisation", () => {
    const r = buildSolicitorResult({
      signals: base({
        legalExperience: "paralegal",
        qweSignal: "employer_can_confirm_qwe",
        trainingPreference: "build_legal_experience_first",
        routePriorities: ["build_legal_experience"],
      }),
    });
    const blob = JSON.stringify(r).toLowerCase();
    expect(blob).toContain("qwe must meet sra requirements");
    expect(blob).toContain("confirmed by an appropriate person or organisation");
    // Must NOT claim QWE is accepted.
    expect(blob).not.toContain("qwe is accepted");
    expect(blob).not.toContain("your qwe counts");
  });
});

// ── Budget never gates eligibility ─────────────────────────────────────────
describe("Solicitor — budget invariants", () => {
  it("budget value never changes eligible route set", () => {
    const asIds = (s: SolicitorSignals) =>
      run(s).routeEvaluations.filter((r) => r.eligible).map((r) => r.id).sort();
    expect(asIds(base({ budgetForTrainingAndExams: "no_budget" }))).toEqual(
      asIds(base({ budgetForTrainingAndExams: "5000_plus" })),
    );
  });
});

// ── checks_before_committing never affects eligibility ─────────────────────
describe("Solicitor — checks_before_committing invariants", () => {
  it("check topics never change eligible route set", () => {
    const asIds = (s: SolicitorSignals) =>
      run(s).routeEvaluations.filter((r) => r.eligible).map((r) => r.id).sort();
    expect(asIds(base({ checksBeforeCommitting: [] }))).toEqual(
      asIds(
        base({
          checksBeforeCommitting: [
            "sqe_costs_and_exam_requirements",
            "qwe_confirmation",
            "apprenticeship_availability",
            "character_and_suitability_process",
          ],
        }),
      ),
    );
  });
});

// ── Bridging behaviour ────────────────────────────────────────────────────
describe("Solicitor — bridging behaviour", () => {
  it("no Level 3, no degree, no legal work → bridging_required", () => {
    const out = run(
      base({
        startingPoint: "school_leaver",
        highestQualification: "gcse",
        legalExperience: "none",
        degreeStatus: "no_degree",
        trainingPreference: "not_sure",
        studyTimeAvailable: "evenings_weekends_only",
        routePriorities: ["not_sure"],
      }),
    );
    expect(out.status).toBe("bridging_required");
    expect(out.recommendedRouteId).toBeNull();
  });

  it("legal_foundation_bridging is NEVER rendered as a normal route card", () => {
    const ids = Object.keys(ROUTE_TITLES);
    expect(ids).not.toContain("legal_foundation_bridging");
    const r = buildSolicitorResult({
      signals: base({
        startingPoint: "school_leaver",
        highestQualification: "gcse",
        legalExperience: "none",
        degreeStatus: "no_degree",
        trainingPreference: "not_sure",
        studyTimeAvailable: "evenings_weekends_only",
        routePriorities: ["not_sure"],
      }),
    });
    const blob = JSON.stringify(r);
    expect(blob).not.toContain("legal_foundation_bridging");
  });
});

// ── Copy — banned promise strings ──────────────────────────────────────────
describe("Solicitor — banned promise strings", () => {
  const BANNED = [
    "you are eligible",
    "you will qualify",
    "you can practise",
    "this guarantees qualification",
    "you will get a training contract",
    "you will pass the sqe",
    "your character and suitability is fine",
    "your lpc counts",
    "you can qualify under lpc",
  ];

  const allCopyFromResult = (s: SolicitorSignals): string => {
    const r = buildSolicitorResult({ signals: s });
    const parts: string[] = [
      r.readinessReason,
      r.biggestBlocker,
      r.immediateAction,
      r.bestRoute.title,
      r.bestRoute.summary,
      ...r.bestRoute.whyThisFits,
      r.bestRoute.mainDifficulty,
      r.backupRoute.title,
      r.backupRoute.summary,
      r.backupRoute.tradeOff,
      r.routeToAvoid.title,
      r.routeToAvoid.whyRisky,
      r.routeToAvoid.whenItMightWork,
      ...r.firstMoves,
      ...(r.considerations ?? []),
    ];
    if (r.modular) {
      parts.push(r.modular.headline, ...r.modular.checksBeforeCommitting);
      for (const c of r.modular.routes) {
        parts.push(c.title, c.fit, c.constraint, c.nextAction, ...c.checks);
      }
    }
    return parts.join(" ").toLowerCase();
  };

  it("no promise strings appear in the recommended path", () => {
    const blob = allCopyFromResult(base());
    for (const b of BANNED) expect(blob).not.toContain(b);
  });

  it("no promise strings appear in the LPC verification path", () => {
    const blob = allCopyFromResult(base({ lpcOrLegacyStatus: "completed_lpc" }));
    for (const b of BANNED) expect(blob).not.toContain(b);
  });

  it("no promise strings appear in the transfer verification path", () => {
    const blob = allCopyFromResult(
      base({
        startingPoint: "qualified_lawyer_overseas_or_other_jurisdiction",
        jurisdictionOrTransferStatus: "already_qualified_outside_england_wales",
      }),
    );
    for (const b of BANNED) expect(blob).not.toContain(b);
  });

  it("character/suitability process caveat appears in the recommended path", () => {
    const r = buildSolicitorResult({ signals: base() });
    expect(r.modular?.checksBeforeCommitting).toContain(CHARACTER_SUITABILITY_CAVEAT);
    expect(r.modular?.checksBeforeCommitting).toContain(SOLICITOR_SCOPE_NOTE);
  });
});

// ── Taxonomy / frozen roles / sources ──────────────────────────────────────
describe("Solicitor — taxonomy, frozen roles, sources", () => {
  it("taxonomy entry uses legal_finance_professional + regulated_registration_led + deep_reviewed", () => {
    const t = getTaxonomyEntry("solicitor")!;
    expect(t.primaryFamily).toBe("legal_finance_professional");
    expect(t.routeArchetype).toBe("regulated_registration_led");
    expect(t.recommendedRealityCheckDepth).toBe("deep_reviewed_reality_check");
  });

  it("FROZEN_DEEP_ROLES contains solicitor and has grown to 8", () => {
    expect(FROZEN_DEEP_ROLES).toContain("solicitor");
    expect(FROZEN_DEEP_ROLES.length).toBe(8);
  });

  it("solicitor sources are registered with the right categories", () => {
    expect(SOURCES.sra_sqe_route).toBeDefined();
    expect(SOURCES.sra_sqe_route.category).toBe("regulation");
    expect(SOURCES.sqe_official_requirements.category).toBe("regulation");
    expect(SOURCES.sra_qualifying_work_experience.category).toBe("regulation");
    expect(SOURCES.sra_solicitor_apprenticeship.category).toBe("regulation");
    expect(SOURCES.sra_qualified_lawyers.category).toBe("regulation");
    expect(SOURCES.sra_lpc_transitional_arrangements.category).toBe("regulation");
    expect(SOURCES.national_careers_solicitor.category).toBe("pathway");
  });

  it("route titles cover all seven route IDs and no bridging id", () => {
    const ids = Object.keys(ROUTE_TITLES);
    expect(ids.length).toBe(7);
    expect(ids).not.toContain("legal_foundation_bridging");
  });
});
