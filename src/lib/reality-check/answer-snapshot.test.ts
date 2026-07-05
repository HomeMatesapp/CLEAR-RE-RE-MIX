// Increment 1b — versioned answer model.
// Tests the RichAnswer envelope, the V2 snapshot builder, and the legacy
// adapter that projects a V2 snapshot back down to the RealityCheckAnswers
// enum shape consumed by the existing deterministic engine.

import { describe, expect, it } from "vitest";
import {
  ANSWER_SCHEMA_VERSION,
  QUESTIONNAIRE_VERSION,
  QUESTION_IDS,
  buildSnapshotFromLegacy,
  isSnapshotV2,
  toLegacyRealityCheckAnswers,
  type RealityCheckAnswerSnapshotV2,
  type RichAnswer,
} from "./answer-snapshot";
import type { RealityCheckAnswers } from "./types";

const emptyLegacy: RealityCheckAnswers = {
  startingPoint: null,
  relevantBackground: "",
  englishMaths: null,
  scienceSubjects: null,
  qualificationLevel: null,
  englishComfort: null,
  incomeNeed: null,
  weeklyHours: null,
  budget: null,
  region: null,
  area: "",
  commuteFlex: null,
  notes: "",
};

const fullLegacy: RealityCheckAnswers = {
  startingPoint: "career_changer",
  relevantBackground: "healthcare assistant, 2 years",
  englishMaths: "both",
  scienceSubjects: "some",
  qualificationLevel: "level_3",
  englishComfort: "yes",
  incomeNeed: "need_income",
  weeklyHours: "10_20",
  budget: "under_500",
  region: "greater_manchester",
  area: "Manchester",
  commuteFlex: "60_min",
  notes: "prefers evenings",
};

describe("buildSnapshotFromLegacy — structured options", () => {
  it("produces schemaVersion 2 with the current questionnaire version", () => {
    const snap = buildSnapshotFromLegacy(fullLegacy, { roleSlug: "registered-nurse" });
    expect(snap.schemaVersion).toBe(ANSWER_SCHEMA_VERSION);
    expect(snap.questionnaireVersion).toBe(QUESTIONNAIRE_VERSION);
    expect(snap.roleSlug).toBe("registered-nurse");
    expect(isSnapshotV2(snap)).toBe(true);
  });

  it("resolves a structured choice with confirmationSource=structured_option", () => {
    const snap = buildSnapshotFromLegacy(
      { ...emptyLegacy, startingPoint: "career_changer" },
      { roleSlug: "x" },
    );
    const a = snap.answers[QUESTION_IDS.startingPoint];
    expect(a.resolutionStatus).toBe("resolved");
    expect(a.selectedValue).toBe("career_changer");
    expect(a.confirmedCanonicalValue).toBe("career_changer");
    expect(a.confirmationSource).toBe("structured_option");
  });

  it("represents every current answer in the snapshot", () => {
    const snap = buildSnapshotFromLegacy(fullLegacy, { roleSlug: "x" });
    // 11 answered fields (relevantBackground + area + notes are text, the rest
    // are structured). All 12 questions with content should be present.
    expect(Object.keys(snap.answers).sort()).toEqual(
      [
        QUESTION_IDS.startingPoint,
        QUESTION_IDS.relevantBackground,
        QUESTION_IDS.qualificationLevel,
        QUESTION_IDS.englishMaths,
        QUESTION_IDS.scienceSubjects,
        QUESTION_IDS.englishComfort,
        QUESTION_IDS.incomeNeed,
        QUESTION_IDS.weeklyHours,
        QUESTION_IDS.budget,
        QUESTION_IDS.region,
        QUESTION_IDS.area,
        QUESTION_IDS.commuteFlex,
        QUESTION_IDS.notes,
      ].sort(),
    );
  });
});

describe('buildSnapshotFromLegacy — unresolved starting point', () => {
  it('"Not sure" is stored unresolved with no canonical value', () => {
    const snap = buildSnapshotFromLegacy(
      { ...emptyLegacy, startingPoint: null },
      { roleSlug: "x", startingPointUnresolved: { status: "unresolved_not_sure" } },
    );
    const a = snap.answers[QUESTION_IDS.startingPoint];
    expect(a.resolutionStatus).toBe("unresolved");
    expect(a.selectedValue).toBe("not_sure");
    expect(a.confirmedCanonicalValue).toBeUndefined();
    expect(a.rawText).toBeUndefined();
  });

  it('"Something else" preserves raw text but does not invent a canonical value', () => {
    const snap = buildSnapshotFromLegacy(
      { ...emptyLegacy, startingPoint: null },
      {
        roleSlug: "x",
        startingPointUnresolved: {
          status: "unresolved_other",
          rawText: "returning to work after caring for family",
        },
      },
    );
    const a = snap.answers[QUESTION_IDS.startingPoint];
    expect(a.resolutionStatus).toBe("unresolved");
    expect(a.selectedValue).toBe("other");
    expect(a.rawText).toBe("returning to work after caring for family");
    expect(a.confirmedCanonicalValue).toBeUndefined();
  });
});

describe("toLegacyRealityCheckAnswers", () => {
  it("round-trips every structured answer", () => {
    const snap = buildSnapshotFromLegacy(fullLegacy, { roleSlug: "x" });
    const legacy = toLegacyRealityCheckAnswers(snap);
    expect(legacy.startingPoint).toBe("career_changer");
    expect(legacy.qualificationLevel).toBe("level_3");
    expect(legacy.englishMaths).toBe("both");
    expect(legacy.scienceSubjects).toBe("some");
    expect(legacy.englishComfort).toBe("yes");
    expect(legacy.incomeNeed).toBe("need_income");
    expect(legacy.weeklyHours).toBe("10_20");
    expect(legacy.budget).toBe("under_500");
    expect(legacy.region).toBe("greater_manchester");
    expect(legacy.commuteFlex).toBe("60_min");
    expect(legacy.area).toBe("Manchester");
  });

  it("collapses free-text relevantBackground to the 'Provided' sentinel", () => {
    const snap = buildSnapshotFromLegacy(fullLegacy, { roleSlug: "x" });
    const legacy = toLegacyRealityCheckAnswers(snap);
    // The engine only cares whether background was declared, not its content.
    expect(legacy.relevantBackground).toBe("Provided");
    // The original text is never leaked back through the adapter.
    expect(legacy.relevantBackground).not.toContain("healthcare");
  });

  it("drops notes entirely — never reaches the engine", () => {
    const snap = buildSnapshotFromLegacy(fullLegacy, { roleSlug: "x" });
    expect(toLegacyRealityCheckAnswers(snap).notes).toBe("");
  });

  it("ignores candidateCanonicalValue — only confirmed values reach the engine", () => {
    const snap: RealityCheckAnswerSnapshotV2 = {
      schemaVersion: 2,
      roleSlug: "x",
      questionnaireVersion: QUESTIONNAIRE_VERSION,
      createdAt: "2026-07-05T00:00:00Z",
      updatedAt: "2026-07-05T00:00:00Z",
      answers: {
        [QUESTION_IDS.startingPoint]: {
          questionId: QUESTION_IDS.startingPoint,
          rawText: "I've been a healthcare assistant for two years",
          candidateCanonicalValue: "career_changer",
          confidence: "medium",
          resolutionStatus: "unresolved",
        } satisfies RichAnswer,
      },
    };
    expect(toLegacyRealityCheckAnswers(snap).startingPoint).toBeNull();
  });

  it("ignores unresolved raw text on structured fields", () => {
    const snap: RealityCheckAnswerSnapshotV2 = {
      schemaVersion: 2,
      roleSlug: "x",
      questionnaireVersion: QUESTIONNAIRE_VERSION,
      createdAt: "2026-07-05T00:00:00Z",
      updatedAt: "2026-07-05T00:00:00Z",
      answers: {
        [QUESTION_IDS.qualificationLevel]: {
          questionId: QUESTION_IDS.qualificationLevel,
          rawText: "some C&G qualifications from ages ago",
          resolutionStatus: "unresolved",
        },
      },
    };
    expect(toLegacyRealityCheckAnswers(snap).qualificationLevel).toBeNull();
  });

  it("rejects unsupported canonical values rather than casting blindly", () => {
    const snap: RealityCheckAnswerSnapshotV2 = {
      schemaVersion: 2,
      roleSlug: "x",
      questionnaireVersion: QUESTIONNAIRE_VERSION,
      createdAt: "2026-07-05T00:00:00Z",
      updatedAt: "2026-07-05T00:00:00Z",
      answers: {
        [QUESTION_IDS.startingPoint]: {
          questionId: QUESTION_IDS.startingPoint,
          selectedValue: "astronaut",
          confirmedCanonicalValue: "astronaut",
          confirmationSource: "structured_option",
          resolutionStatus: "resolved",
        },
        [QUESTION_IDS.region]: {
          questionId: QUESTION_IDS.region,
          selectedValue: "atlantis",
          confirmedCanonicalValue: "atlantis",
          confirmationSource: "structured_option",
          resolutionStatus: "resolved",
        },
      },
    };
    const legacy = toLegacyRealityCheckAnswers(snap);
    expect(legacy.startingPoint).toBeNull();
    expect(legacy.region).toBeNull();
  });

  it("does not crash on unknown question IDs", () => {
    const snap: RealityCheckAnswerSnapshotV2 = {
      schemaVersion: 2,
      roleSlug: "x",
      questionnaireVersion: QUESTIONNAIRE_VERSION,
      createdAt: "2026-07-05T00:00:00Z",
      updatedAt: "2026-07-05T00:00:00Z",
      answers: {
        future_question_from_role_module: {
          questionId: "future_question_from_role_module",
          selectedValue: "value_a",
          confirmedCanonicalValue: "value_a",
          confirmationSource: "structured_option",
          resolutionStatus: "resolved",
        },
      },
    };
    expect(() => toLegacyRealityCheckAnswers(snap)).not.toThrow();
    expect(toLegacyRealityCheckAnswers(snap).startingPoint).toBeNull();
  });

  it("sanitises hidden conditional answers via the caller (relevantBackground empty → not in snapshot)", () => {
    // The caller (RealityCheckPage) runs sanitiseAnswersForVisibility before
    // building the snapshot. Simulate a hidden background question by passing
    // an empty relevantBackground and confirm the snapshot has no entry.
    const snap = buildSnapshotFromLegacy(
      { ...fullLegacy, relevantBackground: "" },
      { roleSlug: "x" },
    );
    expect(snap.answers[QUESTION_IDS.relevantBackground]).toBeUndefined();
    expect(toLegacyRealityCheckAnswers(snap).relevantBackground).toBe("");
  });
});

describe("isSnapshotV2", () => {
  it("accepts a well-formed snapshot", () => {
    expect(isSnapshotV2(buildSnapshotFromLegacy(fullLegacy, { roleSlug: "x" }))).toBe(true);
  });
  it("rejects null, primitives, and wrong schemaVersion", () => {
    expect(isSnapshotV2(null)).toBe(false);
    expect(isSnapshotV2("hi")).toBe(false);
    expect(isSnapshotV2({ schemaVersion: 1 })).toBe(false);
    expect(isSnapshotV2({ schemaVersion: 2 })).toBe(false); // missing fields
  });
});
