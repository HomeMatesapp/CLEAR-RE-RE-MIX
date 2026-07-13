// Increment 3 — generic-pack client layer tests.
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  pruneHiddenAnswers,
  visibleQuestions,
  type PackQuestion,
  type PackQuestionnaire,
} from "@/lib/reality-check/generic-pack/api";
import { GenericPackWizard } from "@/components/reality-check/GenericPackWizard";
import { ResultV2View } from "@/components/reality-check/ResultV2View";
import { evaluateV2 } from "@shared/career-evaluator/v1/evaluate";
import { FORBIDDEN_LANGUAGE } from "@shared/career-evaluator/v1/phrases";
import type { CareerDecisionPackV1, QuestionRef } from "@shared/career-evaluator/v1/types";

const __dirname_local = dirname(fileURLToPath(import.meta.url));
const midwife110 = JSON.parse(
  readFileSync(resolve(__dirname_local, "../../../content/career-packs/midwife/1.1.0.json"), "utf-8"),
) as CareerDecisionPackV1;

const toPackQuestion = (q: QuestionRef): PackQuestion => ({
  id: q.id,
  label: q.label,
  helpText: q.helpText ?? null,
  whyWeAsk: q.whyWeAsk ?? null,
  answerType: q.answerType!,
  options: (q.options ?? null) as PackQuestion["options"],
  visibleWhen: q.visibleWhen ?? null,
  required: q.required ?? false,
  placeholder: q.placeholder ?? null,
  contextOnly: q.contextOnly ?? false,
});

const midwifeQuestionnaire: PackQuestionnaire = {
  slug: "midwife",
  roleSlug: "midwife",
  careerTitle: "Midwife",
  packVersion: "1.1.0",
  contentHash: "x",
  geographicScope: ["England"],
  regulatoryNote: null,
  questions: midwife110.questionRefs.map(toPackQuestion),
};

// ── Visibility logic (pure) ─────────────────────────────────────────────────

const gatedQuestions: PackQuestion[] = [
  {
    id: "has_degree", label: "Do you have a degree?", helpText: null, whyWeAsk: null,
    answerType: "single_select",
    options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }],
    visibleWhen: null, required: false, placeholder: null, contextOnly: false,
  },
  {
    id: "degree_subject", label: "What subject?", helpText: null, whyWeAsk: null,
    answerType: "free_text", options: null,
    visibleWhen: { all: [{ questionId: "has_degree", op: "eq", value: "yes" }] },
    required: false, placeholder: null, contextOnly: false,
  },
];

describe("visibleQuestions", () => {
  it("hides a conditional question until its condition is definitively true", () => {
    // Unanswered gate ⇒ condition indeterminate ⇒ hidden.
    expect(visibleQuestions(gatedQuestions, {}).map((q) => q.id)).toEqual(["has_degree"]);
    expect(visibleQuestions(gatedQuestions, { has_degree: "no" }).map((q) => q.id)).toEqual(["has_degree"]);
    expect(visibleQuestions(gatedQuestions, { has_degree: "yes" }).map((q) => q.id)).toEqual(["has_degree", "degree_subject"]);
  });

  it("shows all midwife 1.1.0 questions (none are conditional)", () => {
    expect(visibleQuestions(midwifeQuestionnaire.questions, {}).length).toBe(9);
  });
});

describe("pruneHiddenAnswers", () => {
  it("discards answers to questions that have become hidden", () => {
    const answers = { has_degree: "no", degree_subject: "History" };
    expect(pruneHiddenAnswers(gatedQuestions, answers)).toEqual({ has_degree: "no" });
  });
});

// ── Wizard ──────────────────────────────────────────────────────────────────

describe("GenericPackWizard", () => {
  it("steps through the midwife questionnaire and submits selected answers", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<GenericPackWizard questionnaire={midwifeQuestionnaire} submitting={false} onSubmit={onSubmit} />);

    expect(screen.getByText("Question 1 of 9")).toBeTruthy();
    expect(screen.getByText("Where are you starting from?")).toBeTruthy();

    // Answer the first two questions, skip the rest (blanks are allowed).
    await user.click(screen.getByText("At school or recently finished school"));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(screen.getByText("Yes — grade 4/C or above in all three"));
    for (let i = 0; i < 7; i++) {
      await user.click(screen.getByRole("button", { name: /continue/i }));
    }
    await user.click(screen.getByRole("button", { name: /see my result/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toEqual({
      starting_point: "school_leaver",
      gcse_maths_english_science_status: "yes",
    });
  });

  it("explains that blanks are allowed", () => {
    render(<GenericPackWizard questionnaire={midwifeQuestionnaire} submitting={false} onSubmit={() => {}} />);
    expect(screen.getByText(/you can leave this blank/i)).toBeTruthy();
  });
});

// ── Result view ─────────────────────────────────────────────────────────────

describe("ResultV2View", () => {
  const result = evaluateV2(midwife110, midwife110.testProfiles[0].answers, {
    now: "2026-07-12T12:00:00.000Z",
    assessmentId: "view-test-0001",
  });

  it("renders both status axes separately for every route", () => {
    render(<ResultV2View result={result} />);
    const eligibilityChips = screen.getAllByText(/^Eligibility:/);
    const practicalChips = screen.getAllByText(/^Practical fit:/);
    expect(eligibilityChips.length).toBe(result.routes.length);
    expect(practicalChips.length).toBe(result.routes.length);
  });

  it("marks the strongest route and itemises unassessed requirements honestly", () => {
    render(<ResultV2View result={result} />);
    expect(screen.getAllByText("Currently looks most workable").length).toBe(1);
    // Midwife requirements are participant-verified: shown as "verify yourself".
    expect(screen.getAllByText("Requirements to verify yourself").length).toBeGreaterThan(0);
  });

  it("contains no forbidden language", () => {
    const { container } = render(<ResultV2View result={result} />);
    const text = container.textContent!.toLowerCase();
    for (const phrase of FORBIDDEN_LANGUAGE) expect(text).not.toContain(phrase);
  });
});

// ── Compare Routes (Increment 5) ────────────────────────────────────────────

describe("Compare routes", () => {
  const result = evaluateV2(midwife110, midwife110.testProfiles[0].answers, {
    now: "2026-07-12T12:00:00.000Z",
    assessmentId: "compare-test-0001",
  });

  it("toggles from the route list to a side-by-side table and back", async () => {
    const user = userEvent.setup();
    render(<ResultV2View result={result} />);
    // List first; no table yet.
    expect(screen.queryByRole("table")).toBeNull();
    await user.click(screen.getByRole("tab", { name: /compare routes/i }));
    const table = screen.getByRole("table");
    expect(table).toBeTruthy();
    // One column per route plus the field column.
    expect(screen.getAllByRole("columnheader").length).toBe(result.routes.length + 1);
    // Both axes present as separate rows.
    expect(screen.getByRole("rowheader", { name: "Formal eligibility" })).toBeTruthy();
    expect(screen.getByRole("rowheader", { name: "Practical fit" })).toBeTruthy();
    expect(screen.getByRole("rowheader", { name: "Typical duration" })).toBeTruthy();
    expect(screen.getByRole("rowheader", { name: "Typical cost" })).toBeTruthy();
    await user.click(screen.getByRole("tab", { name: /^routes$/i }));
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("marks exactly one strongest route in the table and never merges the axes", async () => {
    const user = userEvent.setup();
    render(<ResultV2View result={result} />);
    await user.click(screen.getByRole("tab", { name: /compare routes/i }));
    expect(screen.getAllByText("Currently looks most workable").length).toBe(1);
    expect(screen.getByText(/never combined into a single score/i)).toBeTruthy();
  });

  it("contains no forbidden language in the comparison table", async () => {
    const user = userEvent.setup();
    const { container } = render(<ResultV2View result={result} />);
    await user.click(screen.getByRole("tab", { name: /compare routes/i }));
    const text = container.textContent!.toLowerCase();
    for (const phrase of FORBIDDEN_LANGUAGE) expect(text).not.toContain(phrase);
  });

  it("shows no compare toggle for single-route results", () => {
    const single = { ...result, routes: [result.routes[0]], alternativeRouteIds: [] };
    render(<ResultV2View result={single} />);
    expect(screen.queryByRole("tab", { name: /compare routes/i })).toBeNull();
  });
});
