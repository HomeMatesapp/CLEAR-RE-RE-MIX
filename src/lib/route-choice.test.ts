// Increment 9 — latest-choice reducer tests.
import { describe, expect, it } from "vitest";
import { latestChoiceByDecision, type RouteChoice } from "./route-choice";

const c = (saved: string, route: string, at: string): RouteChoice => ({
  id: `${saved}-${route}-${at}`, saved_decision_id: saved, route_id: route, route_title: route,
  eligibility_at_choice: null, practical_fit_at_choice: null, chosen_at: at,
});

describe("latestChoiceByDecision", () => {
  it("keeps the newest choice per decision regardless of input order", () => {
    const rows = [
      c("d1", "route_a", "2026-07-10T10:00:00Z"),
      c("d2", "route_x", "2026-07-11T10:00:00Z"),
      c("d1", "route_b", "2026-07-12T10:00:00Z"),
      c("d1", "route_c", "2026-07-11T09:00:00Z"),
    ];
    const latest = latestChoiceByDecision(rows);
    expect(latest.d1.route_id).toBe("route_b");
    expect(latest.d2.route_id).toBe("route_x");
    expect(latestChoiceByDecision([...rows].reverse()).d1.route_id).toBe("route_b");
  });

  it("returns an empty map for no rows", () => {
    expect(latestChoiceByDecision([])).toEqual({});
  });
});
