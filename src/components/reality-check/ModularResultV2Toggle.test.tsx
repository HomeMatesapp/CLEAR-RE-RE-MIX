// Increment 10 — convergence step 1 tests.
//
// A real electrician engine run flows through buildElectricianResult; the
// result carries the modular payload AND a schema-valid resultV2 (same
// decision, two lenses), and ModularResultView offers the toggle — classic
// remains the default and renders exactly as before.
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { buildElectricianResult, runElectricianEngine } from "@/lib/reality-check/route-engines/electrician-adapter";
import { ModularResultView } from "./ModularResultView";
import { realityCheckResultV2, FORBIDDEN_LANGUAGE } from "@shared/career-evaluator/v1";
import type { ElectricianSignals } from "@/lib/reality-check/questionnaire/signals";
import type { RealityCheckAnswers, RoleContext } from "@/lib/reality-check/types";

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: () => {} }) }));

const signals: ElectricianSignals = {
  startingPoint: "career_changer",
  hasElectricalExperience: false,
  hasRelatedTradeExperience: false,
  electricalQualificationLevel: "none",
  mathsEnglishStatus: "both",
  availableTrainingPatterns: ["full_time_work_based"],
  trainingBudgetBand: null,
  travelRange: null,
  workingConditionsToCheck: [],
  routePriorities: [],
};

const role: RoleContext = { role_slug: "electrician", role_name: "Electrician" };
const result = buildElectricianResult({ signals }, {} as RealityCheckAnswers) as
  ReturnType<typeof buildElectricianResult> & { modular: NonNullable<ReturnType<typeof buildElectricianResult>["modular"]> };

describe("legacy engine convergence — step 1", () => {
  it("every reviewed engine result now carries a schema-valid resultV2 alongside the modular payload", () => {
    expect(result.modular).toBeTruthy();
    const parsed = realityCheckResultV2.safeParse(result.resultV2);
    if (!parsed.success) throw new Error(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n"));
    expect(result.resultV2!.engineId).toBe("legacy:electrician");
    expect(result.resultV2!.sourceKind).toBe("legacy_engine");
    // Same decision, two lenses: the V2 routes are exactly the engine's own
    // route evaluations — nothing added, nothing dropped.
    const out = runElectricianEngine({ signals });
    expect(result.resultV2!.routes.map((r) => r.routeId).sort())
      .toEqual(out.routeEvaluations.map((ev) => ev.id).sort());
  });

  it("flavor caveats become the V2 duration/cost labels", () => {
    const anyRoute = result.resultV2!.routes[0];
    expect(anyRoute.durationLabel.length).toBeGreaterThan(3);
    expect(anyRoute.costLabel.length).toBeGreaterThan(3);
  });

  it("classic view renders by default; the standard view is one tab away and one tab back", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ModularResultView result={result} role={role} onEdit={() => {}} />
      </MemoryRouter>,
    );
    // Classic content present by default.
    expect(screen.getByRole("tab", { name: /classic view/i }).getAttribute("aria-selected")).toBe("true");
    expect(screen.queryByText("Practical fit")).toBeNull();

    await user.click(screen.getByRole("tab", { name: /standard view/i }));
    expect(screen.getAllByText("Eligibility").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Practical fit").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("tab", { name: /classic view/i }));
    expect(screen.queryByText("Practical fit")).toBeNull();
  });

  it("no toggle appears when resultV2 is absent (older saved payloads)", () => {
    const legacyOnly = { ...result, resultV2: undefined } as typeof result;
    render(
      <MemoryRouter>
        <ModularResultView result={legacyOnly} role={role} onEdit={() => {}} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("tab", { name: /standard view/i })).toBeNull();
  });

  it("the standard view of a legacy engine contains no forbidden language", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <MemoryRouter>
        <ModularResultView result={result} role={role} onEdit={() => {}} />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole("tab", { name: /standard view/i }));
    const text = container.textContent!.toLowerCase();
    for (const phrase of FORBIDDEN_LANGUAGE) expect(text).not.toContain(phrase);
  });
});
