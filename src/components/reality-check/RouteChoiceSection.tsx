// RouteChoiceSection — choose a route from a saved V2 result, with visible
// history (Increment 6, spec §14).
//
// Pure and props-driven: data loading and persistence live in the page, so
// this renders deterministically and is fully unit-testable.
//
// Design rules honoured:
//   • The participant owns the decision — any route can be chosen, including
//     one that is not currently open; the route's two-axis status is shown
//     right on the button, and choosing a not-currently-available route gets
//     an honest note, not a block.
//   • History is visible, newest first, and never rewritten.

import { useState } from "react";
import { Check, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RealityCheckResultV2 } from "@shared/career-evaluator/v1/result-v2";
import { ELIGIBILITY_LABEL, PRACTICAL_LABEL } from "@/lib/reality-check/v2-labels";
import type { RouteChoice } from "@/lib/route-choice";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });

interface Props {
  result: RealityCheckResultV2;
  /** Newest first; empty = no choice yet. */
  history: RouteChoice[];
  choosing: boolean;
  onChoose: (routeId: string) => void;
}

export const RouteChoiceSection = ({ result, history, choosing, onChoose }: Props) => {
  const [showHistory, setShowHistory] = useState(false);
  const current = history[0] ?? null;
  const past = history.slice(1);

  return (
    <section aria-label="Your route choice">
      <p className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
        Your route choice
      </p>

      {current ? (
        <p className="text-sm mb-3">
          <Check className="inline h-4 w-4 text-emerald-600 mr-1" aria-hidden />
          You chose <span className="font-medium">{current.route_title}</span> on {formatDate(current.chosen_at)}.
          You can change this at any time — your earlier choices stay in your history.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground mb-3">
          When you're ready, record which route you're going to pursue. You can change it later —
          earlier choices stay in your history.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {result.routes.map((route) => {
          const isCurrent = current?.route_id === route.routeId;
          return (
            <div key={route.routeId} className={`rounded-lg border px-4 py-3 ${isCurrent ? "border-primary bg-primary/5" : "border-border"}`}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-medium text-sm">{route.routeTitle}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {ELIGIBILITY_LABEL[route.eligibility]} · {PRACTICAL_LABEL[route.practicalFit]}
                  </div>
                </div>
                {isCurrent ? (
                  <span className="text-xs font-medium text-primary">Current choice</span>
                ) : (
                  <Button size="sm" variant="outline" disabled={choosing} onClick={() => onChoose(route.routeId)}>
                    Choose this route
                  </Button>
                )}
              </div>
              {isCurrent && route.eligibility === "not_currently_available" ? (
                <p className="text-xs text-amber-700 mt-2">
                  Your result says this route is not currently open to you. Choosing it is up to you —
                  the blockers listed in your full result are what would need to change first.
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      {past.length > 0 ? (
        <div className="mt-4">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            onClick={() => setShowHistory((v) => !v)}
            aria-expanded={showHistory}
          >
            <History className="h-4 w-4" aria-hidden />
            {showHistory ? "Hide earlier choices" : `Earlier choices (${past.length})`}
          </button>
          {showHistory ? (
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {past.map((c) => (
                <li key={c.id}>
                  {c.route_title} — chosen {formatDate(c.chosen_at)}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
};
