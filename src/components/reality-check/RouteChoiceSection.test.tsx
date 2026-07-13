// Increment 6 — route choice tests.
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { RouteChoiceSection } from "./RouteChoiceSection";
import { evaluateV2 } from "@shared/career-evaluator/v1/evaluate";
import { FORBIDDEN_LANGUAGE } from "@shared/career-evaluator/v1/phrases";
import type { CareerDecisionPackV1 } from "@shared/career-evaluator/v1/types";
import type { RouteChoice } from "@/lib/route-choice";

const __dirname_local = dirname(fileURLToPath(import.meta.url));
const midwife = JSON.parse(
  readFileSync(resolve(__dirname_local, "../../../content/career-packs/midwife/1.1.0.json"), "utf-8"),
) as CareerDecisionPackV1;

const NOW = "2026-07-12T12:00:00.000Z";
const result = evaluateV2(
  midwife,
  midwife.testProfiles.find((p) => p.id === "registered_adult_nurse_head_start")!.answers,
  { now: NOW, assessmentId: "choice-test" },
);

const choice = (over: Partial<RouteChoice>): RouteChoice => ({
  id: "c1",
  saved_decision_id: "sd1",
  route_id: result.routes[0].routeId,
  route_title: result.routes[0].routeTitle,
  eligibility_at_choice: result.routes[0].eligibility,
  practical_fit_at_choice: result.routes[0].practicalFit,
  chosen_at: "2026-07-10T10:00:00.000Z",
  ...over,
});

describe("RouteChoiceSection", () => {
  it("offers every route with its two-axis status and records a choice", async () => {
    const user = userEvent.setup();
    const onChoose = vi.fn();
    render(<RouteChoiceSection result={result} history={[]} choosing={false} onChoose={onChoose} />);

    const buttons = screen.getAllByRole("button", { name: /choose this route/i });
    expect(buttons.length).toBe(result.routes.length);
    await user.click(buttons[1]);
    expect(onChoose).toHaveBeenCalledWith(result.routes[1].routeId);
  });

  it("shows the current choice, keeps other routes choosable, and reveals history on demand", async () => {
    const user = userEvent.setup();
    const history = [
      choice({ id: "c2", route_id: result.routes[1].routeId, route_title: result.routes[1].routeTitle, chosen_at: "2026-07-11T10:00:00.000Z" }),
      choice({ id: "c1" }),
    ];
    render(<RouteChoiceSection result={result} history={history} choosing={false} onChoose={() => {}} />);

    expect(screen.getByText("Current choice")).toBeTruthy();
    expect(screen.getByText(/You chose/)).toBeTruthy();
    // One fewer choose button than routes (the current one shows a marker instead).
    expect(screen.getAllByRole("button", { name: /choose this route/i }).length).toBe(result.routes.length - 1);

    const historyToggle = screen.getByRole("button", { name: /earlier choices \(1\)/i });
    await user.click(historyToggle);
    expect(screen.getByText(new RegExp(`${result.routes[0].routeTitle} — chosen`))).toBeTruthy();
  });

  it("gives an honest note when the chosen route is not currently available, without blocking the choice", () => {
    const blockedRoute = { ...result.routes[0], eligibility: "not_currently_available" as const };
    const blockedResult = { ...result, routes: [blockedRoute, ...result.routes.slice(1)] };
    const history = [choice({ eligibility_at_choice: "not_currently_available" })];
    render(<RouteChoiceSection result={blockedResult} history={history} choosing={false} onChoose={() => {}} />);
    expect(screen.getByText(/not currently open to you\. Choosing it is up to you/)).toBeTruthy();
  });

  it("contains no forbidden language", () => {
    const { container } = render(
      <RouteChoiceSection result={result} history={[choice({})]} choosing={false} onChoose={() => {}} />,
    );
    const text = container.textContent!.toLowerCase();
    for (const phrase of FORBIDDEN_LANGUAGE) expect(text).not.toContain(phrase);
  });
});
