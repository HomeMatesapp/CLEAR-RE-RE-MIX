// Role-scoped v3 draft persistence tests.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clearModularDraft,
  invalidateLegacyDraftForRole,
  loadModularDraft,
  modularDraftKey,
  saveModularDraft,
} from "./draft-v3";

const SLUG = "electrician";
const QV = "electrician-v1";

beforeEach(() => sessionStorage.clear());
afterEach(() => sessionStorage.clear());

describe("modular draft v3", () => {
  it("round-trips and uses role+questionnaire scoped keys", () => {
    saveModularDraft({
      roleSlug: SLUG,
      questionnaireVersion: QV,
      answers: { starting_point: "career_changer" },
      inlineText: {},
      stepId: "electrical_qualification",
    });
    const stored = sessionStorage.getItem(modularDraftKey(SLUG, QV));
    expect(stored).not.toBeNull();
    const loaded = loadModularDraft(SLUG, QV);
    expect(loaded?.answers.starting_point).toBe("career_changer");
    expect(loaded?.stepId).toBe("electrical_qualification");
  });

  it("never loads a draft written for a different role slug", () => {
    saveModularDraft({
      roleSlug: "software-engineer",
      questionnaireVersion: QV,
      answers: { starting_point: "career_changer" },
      inlineText: {},
      stepId: "s1",
    });
    // Load with mismatched slug/key
    expect(loadModularDraft(SLUG, QV)).toBeNull();
  });

  it("invalidates when questionnaireVersion differs", () => {
    saveModularDraft({
      roleSlug: SLUG,
      questionnaireVersion: "electrician-v0",
      answers: {},
      inlineText: {},
      stepId: "starting_point",
    });
    // The key differs, so the same slug + a different qv finds nothing.
    expect(loadModularDraft(SLUG, "electrician-v1")).toBeNull();
  });

  it("invalidateLegacyDraftForRole removes cr_rc_progress_<slug>", () => {
    sessionStorage.setItem(`cr_rc_progress_${SLUG}`, JSON.stringify({ schemaVersion: 2 }));
    invalidateLegacyDraftForRole(SLUG);
    expect(sessionStorage.getItem(`cr_rc_progress_${SLUG}`)).toBeNull();
  });

  it("clearModularDraft removes only its own key", () => {
    saveModularDraft({
      roleSlug: SLUG,
      questionnaireVersion: QV,
      answers: {},
      inlineText: {},
      stepId: "starting_point",
    });
    saveModularDraft({
      roleSlug: "other-role",
      questionnaireVersion: QV,
      answers: {},
      inlineText: {},
      stepId: "starting_point",
    });
    clearModularDraft(SLUG, QV);
    expect(loadModularDraft(SLUG, QV)).toBeNull();
    expect(loadModularDraft("other-role", QV)).not.toBeNull();
  });

  it("legacy v2 draft for a non-Electrician role is not touched", () => {
    // We do NOT invalidate legacy drafts globally — only for roles that
    // now have a modular questionnaire.
    sessionStorage.setItem(`cr_rc_progress_registered-nurse`, JSON.stringify({ schemaVersion: 2 }));
    invalidateLegacyDraftForRole(SLUG);
    expect(sessionStorage.getItem(`cr_rc_progress_registered-nurse`)).not.toBeNull();
  });
});

describe("draft isolation across Electrician, Plumber and Heating Engineer", () => {
  it("all three role drafts co-exist without collision", () => {
    saveModularDraft({
      roleSlug: "electrician",
      questionnaireVersion: "electrician-v1",
      answers: { starting_point: "still_at_school" },
      inlineText: {},
      stepId: "starting_point",
    });
    saveModularDraft({
      roleSlug: "plumber",
      questionnaireVersion: "plumber-v1",
      answers: { starting_point: "career_changer" },
      inlineText: {},
      stepId: "plumbing_qualification",
    });
    saveModularDraft({
      roleSlug: "hvac-engineer",
      questionnaireVersion: "heating-engineer-v1",
      answers: { starting_point: "returning_after_break" },
      inlineText: { heating_qualification: "ACS CCN1" },
      stepId: "heating_qualification",
    });
    const e = loadModularDraft("electrician", "electrician-v1");
    const p = loadModularDraft("plumber", "plumber-v1");
    const h = loadModularDraft("hvac-engineer", "heating-engineer-v1");
    expect(e?.answers.starting_point).toBe("still_at_school");
    expect(p?.answers.starting_point).toBe("career_changer");
    expect(p?.stepId).toBe("plumbing_qualification");
    expect(h?.answers.starting_point).toBe("returning_after_break");
    expect(h?.inlineText.heating_qualification).toBe("ACS CCN1");
    expect(h?.stepId).toBe("heating_qualification");
  });

  it("starting Heating Engineer does not read or overwrite Electrician or Plumber drafts", () => {
    saveModularDraft({
      roleSlug: "electrician",
      questionnaireVersion: "electrician-v1",
      answers: { starting_point: "still_at_school" },
      inlineText: {},
      stepId: "starting_point",
    });
    // Loading Heating Engineer with a fresh session returns null,
    // preserving the Electrician draft untouched.
    expect(loadModularDraft("hvac-engineer", "heating-engineer-v1")).toBeNull();
    expect(loadModularDraft("electrician", "electrician-v1")?.answers.starting_point).toBe("still_at_school");
  });
});
