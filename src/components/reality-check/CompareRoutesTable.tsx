// CompareRoutesTable — side-by-side comparison of a result's routes
// (Increment 5, spec §13).
//
// Compares only what the result already states: the two status axes
// (kept SEPARATE, never merged into a score), the pack-authored duration
// and cost labels, any pack-authored comparison fields, and requirement /
// check counts. No ranking beyond the strongest-route marker the evaluator
// already chose; no probability language.

import { Fragment } from "react";
import type { RealityCheckResultV2, RouteEvaluationV2 } from "@shared/career-evaluator/v1/result-v2";
import { ELIGIBILITY_LABEL, PRACTICAL_LABEL } from "@/lib/reality-check/v2-labels";

interface CompareRow {
  label: string;
  value: (route: RouteEvaluationV2) => string;
}

const count = (n: number, noun: string) => (n === 0 ? "None" : `${n} ${noun}${n === 1 ? "" : "s"}`);

/** Pack-authored comparison keys beyond the standard duration/cost, in
 *  first-seen order across routes. */
const extraComparisonKeys = (routes: readonly RouteEvaluationV2[]): string[] => {
  const seen: string[] = [];
  for (const r of routes) {
    for (const k of Object.keys(r.comparison)) {
      if (k !== "duration" && k !== "cost" && !seen.includes(k)) seen.push(k);
    }
  }
  return seen;
};

const titleCase = (k: string) => k.charAt(0).toUpperCase() + k.slice(1).replace(/_/g, " ");

export const CompareRoutesTable = ({ result }: { result: RealityCheckResultV2 }) => {
  const routes = result.routes;
  const rows: CompareRow[] = [
    { label: "Formal eligibility", value: (r) => ELIGIBILITY_LABEL[r.eligibility] },
    { label: "Practical fit", value: (r) => PRACTICAL_LABEL[r.practicalFit] },
    { label: "Typical duration", value: (r) => r.comparison.duration ?? r.durationLabel },
    { label: "Typical cost", value: (r) => r.comparison.cost ?? r.costLabel },
    ...extraComparisonKeys(routes).map((k) => ({
      label: titleCase(k),
      value: (r: RouteEvaluationV2) => r.comparison[k] ?? "—",
    })),
    { label: "Checks before relying on it", value: (r) => count(r.verificationsRequired.length, "check") },
    { label: "Trade-offs flagged", value: (r) => count(r.concerns.length, "trade-off") },
    { label: "Practical constraints", value: (r) => count(r.constraints.length, "constraint") },
    {
      label: "Requirements to verify yourself",
      value: (r) => count(r.requirementsNotAssessed.length + r.requirementsUnknown.length, "requirement"),
    },
  ];

  return (
    <div className="overflow-x-auto" role="region" aria-label="Compare routes">
      <table className="w-full text-sm border-separate border-spacing-0">
        <thead>
          <tr>
            <th className="text-left align-bottom p-3 border-b-2 border-foreground/90" scope="col">
              <span className="sr-only">Comparison field</span>
            </th>
            {routes.map((r) => (
              <th key={r.routeId} className="text-left align-bottom p-3 border-b-2 border-foreground/90" scope="col">
                <div className="font-display font-bold text-[15px] leading-tight">{r.routeTitle}</div>
                {r.routeId === result.strongestRouteId ? (
                  <div className="font-mono text-[10px] tracking-[0.1em] uppercase font-semibold mt-1">Most workable now</div>
                ) : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <Fragment key={row.label}>
              <tr>
                <th scope="row" className="text-left align-top p-3 border-b border-border font-medium whitespace-nowrap">
                  {row.label}
                </th>
                {routes.map((r) => (
                  <td key={r.routeId} className="align-top p-3 border-b border-border text-muted-foreground">
                    {row.value(r)}
                  </td>
                ))}
              </tr>
            </Fragment>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-muted-foreground mt-3">
        Eligibility and practical fit are assessed separately and are never combined into a single score.
        Durations and costs are the published typical figures — confirm with providers before committing.
      </p>
    </div>
  );
};
