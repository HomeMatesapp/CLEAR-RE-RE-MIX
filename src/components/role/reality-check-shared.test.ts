// Unit tests for the questionnaire shell helpers:
// draft persistence (V2 snapshot + TTL + V1 rejection), unresolved
// starting-point handling, visibility-based answer cleanup, and stepId
// clamping. Adapter-level and snapshot-level tests live in
// ./answer-snapshot.test.ts.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clampStepId,
  clearInProgressAnswers,
  emptyAnswers,
  loadInProgressAnswers,
  sanitiseAnswersForVisibility,
  saveInProgressAnswers,
  UNRESOLVED_STARTING_POINT_NOTICE,
  UNRESOLVED_STARTING_POINT_OTHER_NOTICE,
} from "./reality-check-shared";
import type { RealityCheckAnswers } from "@/lib/reality-check/types";

const SLUG = "electrician";
const KEY = `cr_rc_progress_${SLUG}`;

const baseAnswers: RealityCheckAnswers = {
  ...emptyAnswers,
  startingPoint: "graduate",
  relevantBackground: "psychology degree",
  qualificationLevel: "undergrad",
  englishMaths: "both",
};

beforeEach(() => {
  sessionStorage.clear();
});

afterEach(() => {
  sessionStorage.clear();
  vi.useRealTimers();
});

describe("draft persistence (V2 snapshot + TTL)", () => {
  it("round-trips a saved V2 draft and reconstructs legacy answers", () => {
    saveInProgressAnswers(SLUG, {
      answers: baseAnswers,
      stepId: "qualification",
      startingPointStatus: "resolved",
      startingPointOtherText: "",
    });

    const loaded = loadInProgressAnswers(SLUG);
    expect(loaded).not.toBeNull();
    expect(loaded?.stepId).toBe("qualification");
    expect(loaded?.answers.startingPoint).toBe("graduate");
    expect(loaded?.answers.qualificationLevel).toBe("undergrad");
    // Free text is preserved as a "Provided" sentinel by the legacy adapter,
    // never the original text.
    expect(loaded?.answers.relevantBackground).toBe("Provided");
    expect(loaded?.startingPointStatus).toBe("resolved");
  });

  it("persists a V2-shaped record in sessionStorage", () => {
    saveInProgressAnswers(SLUG, {
      answers: baseAnswers,
      stepId: "qualification",
      startingPointStatus: "resolved",
      startingPointOtherText: "",
    });
    const raw = JSON.parse(sessionStorage.getItem(KEY)!);
    expect(raw.schemaVersion).toBe(2);
    expect(raw.answerSnapshot.schemaVersion).toBe(2);
    expect(raw.answerSnapshot.questionnaireVersion).toMatch(/^core-/);
    expect(raw.answerSnapshot.answers.starting_point.confirmedCanonicalValue).toBe("graduate");
  });

  it("rejects V1 drafts written by earlier increments", () => {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({
        schemaVersion: 1,
        answers: baseAnswers,
        stepId: "qualification",
        startingPointStatus: "resolved",
        startingPointOtherText: "",
        savedAt: Date.now(),
      }),
    );
    expect(loadInProgressAnswers(SLUG)).toBeNull();
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });

  it("ignores drafts written under an unknown schema", () => {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({ answers: baseAnswers, stepIndex: 3, savedAt: new Date().toISOString() }),
    );
    expect(loadInProgressAnswers(SLUG)).toBeNull();
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });

  it("ignores drafts older than the 24h TTL", () => {
    const now = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(now);
    saveInProgressAnswers(SLUG, {
      answers: baseAnswers,
      stepId: "qualification",
      startingPointStatus: "resolved",
      startingPointOtherText: "",
    });
    vi.setSystemTime(now + 25 * 60 * 60 * 1000);
    expect(loadInProgressAnswers(SLUG)).toBeNull();
  });

  it("clearInProgressAnswers removes the draft (simulates successful submit)", () => {
    saveInProgressAnswers(SLUG, {
      answers: baseAnswers,
      stepId: "review",
      startingPointStatus: "resolved",
      startingPointOtherText: "",
    });
    expect(loadInProgressAnswers(SLUG)).not.toBeNull();
    clearInProgressAnswers(SLUG);
    expect(loadInProgressAnswers(SLUG)).toBeNull();
  });

  it("leaves the draft untouched on a failed submit (no clear called)", () => {
    saveInProgressAnswers(SLUG, {
      answers: baseAnswers,
      stepId: "review",
      startingPointStatus: "resolved",
      startingPointOtherText: "",
    });
    const loaded = loadInProgressAnswers(SLUG);
    expect(loaded).not.toBeNull();
    expect(loaded?.stepId).toBe("review");
  });
});

describe("unresolved starting point", () => {
  it("stores unresolved_not_sure and keeps legacy startingPoint null", () => {
    saveInProgressAnswers(SLUG, {
      answers: { ...emptyAnswers, startingPoint: null },
      stepId: "review",
      startingPointStatus: "unresolved_not_sure",
      startingPointOtherText: "",
    });
    const loaded = loadInProgressAnswers(SLUG)!;
    expect(loaded.startingPointStatus).toBe("unresolved_not_sure");
    expect(loaded.answers.startingPoint).toBeNull();
  });

  it("preserves unresolved_other free text on the client only", () => {
    saveInProgressAnswers(SLUG, {
      answers: { ...emptyAnswers, startingPoint: null },
      stepId: "review",
      startingPointStatus: "unresolved_other",
      startingPointOtherText: "between roles after a career break",
    });
    const loaded = loadInProgressAnswers(SLUG)!;
    expect(loaded.startingPointStatus).toBe("unresolved_other");
    expect(loaded.answers.startingPoint).toBeNull();
    expect(loaded.startingPointOtherText).toBe("between roles after a career break");
    // The free text lives in the snapshot's rawText — never in a canonical
    // field the engine reads.
    const raw = JSON.parse(sessionStorage.getItem(KEY)!);
    expect(raw.answerSnapshot.answers.starting_point.rawText).toBe(
      "between roles after a career break",
    );
    expect(raw.answerSnapshot.answers.starting_point.confirmedCanonicalValue).toBeUndefined();
  });

  it("exposes copy for the reduced-specificity notice on review and result", () => {
    expect(UNRESOLVED_STARTING_POINT_NOTICE).toMatch(/less specific/i);
    expect(UNRESOLVED_STARTING_POINT_OTHER_NOTICE).toMatch(/isn't yet used/i);
  });
});

describe("sanitiseAnswersForVisibility", () => {
  it("clears relevantBackground when the background question is no longer visible", () => {
    const withBackground: RealityCheckAnswers = {
      ...emptyAnswers,
      startingPoint: "school_leaver",
      relevantBackground: "psychology degree",
    };
    const cleaned = sanitiseAnswersForVisibility(withBackground, { backgroundRequired: false });
    expect(cleaned.relevantBackground).toBe("");
  });

  it("keeps relevantBackground when the background question is still visible", () => {
    const withBackground: RealityCheckAnswers = {
      ...emptyAnswers,
      startingPoint: "graduate",
      relevantBackground: "psychology degree",
    };
    const cleaned = sanitiseAnswersForVisibility(withBackground, { backgroundRequired: true });
    expect(cleaned.relevantBackground).toBe("psychology degree");
  });

  it("is a no-op when there is nothing to clear (returns same reference)", () => {
    const a: RealityCheckAnswers = { ...emptyAnswers, startingPoint: "school_leaver" };
    expect(sanitiseAnswersForVisibility(a, { backgroundRequired: false })).toBe(a);
  });
});

describe("clampStepId", () => {
  const visible = ["starting_point", "qualification", "english_maths", "review"];
  it("returns the stored id when still visible", () => {
    expect(clampStepId("qualification", visible)).toBe("qualification");
  });
  it("falls back to the first visible step when the stored id is now hidden", () => {
    expect(clampStepId("background", visible)).toBe("starting_point");
  });
  it("falls back to the first visible step for null/undefined", () => {
    expect(clampStepId(null, visible)).toBe("starting_point");
    expect(clampStepId(undefined, visible)).toBe("starting_point");
  });
});

describe("visible-steps derivation (progress count)", () => {
  const buildQuestionIds = (backgroundRequired: boolean): string[] =>
    [
      "starting_point",
      backgroundRequired ? "background" : null,
      "qualification",
      "english_maths",
      "science",
      "english_comfort",
      "income",
      "budget",
      "region",
      "weekly_hours",
      "commute",
      "notes",
    ].filter((s): s is string => s !== null);

  it("counts 11 questions when the background step is hidden", () => {
    expect(buildQuestionIds(false)).toHaveLength(11);
  });
  it("counts 12 questions when the background step is visible", () => {
    expect(buildQuestionIds(true)).toHaveLength(12);
  });
});
