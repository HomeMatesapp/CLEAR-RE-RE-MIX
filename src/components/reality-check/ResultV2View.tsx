// ResultV2View — renders a RealityCheckResultV2 (Increment 3).
//
// The two status axes are shown SEPARATELY and never merged:
//   • Formal eligibility — whether the entry conditions appear in place
//   • Practical fit      — whether time/cost/schedule constraints were flagged
// Requirements are itemised honestly, including those we could not assess.
// All copy comes from the result (already language-safe) or from the fixed
// status labels below — no probability wording anywhere.

import { useState } from "react";
import { AlertTriangle, CheckCircle2, CircleHelp, Columns3, List, ListChecks, XCircle } from "lucide-react";
import { CompareRoutesTable } from "@/components/reality-check/CompareRoutesTable";
import type {
  EligibilityStatus,
  PracticalFitStatus,
  RealityCheckResultV2,
  RouteEvaluationV2,
} from "@shared/career-evaluator/v1/result-v2";
import { ELIGIBILITY_LABEL, PRACTICAL_LABEL } from "@/lib/reality-check/v2-labels";

const eligibilityTone = (s: EligibilityStatus): string =>
  s === "available_now" ? "text-emerald-700 bg-emerald-50 border-emerald-200"
  : s === "not_currently_available" ? "text-red-700 bg-red-50 border-red-200"
  : s === "insufficient_information" ? "text-muted-foreground bg-muted border-border"
  : "text-amber-700 bg-amber-50 border-amber-200";

const practicalTone = (s: PracticalFitStatus): string =>
  s === "appears_manageable" ? "text-emerald-700 bg-emerald-50 border-emerald-200"
  : s === "insufficient_information" ? "text-muted-foreground bg-muted border-border"
  : "text-amber-700 bg-amber-50 border-amber-200";

const RequirementList = ({ label, items, icon }: { label: string; items: readonly string[]; icon: React.ReactNode }) => {
  if (!items.length) return null;
  return (
    <div className="mt-3">
      <div className="text-sm font-medium mb-1">{label}</div>
      <ul className="space-y-1">
        {items.map((r) => (
          <li key={r} className="flex items-start gap-2 text-sm text-muted-foreground">
            <span className="mt-0.5 shrink-0" aria-hidden>{icon}</span>
            <span>{r}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const RouteCard = ({ route, isStrongest }: { route: RouteEvaluationV2; isStrongest: boolean }) => (
  <div className={`rounded-xl border p-5 ${isStrongest ? "border-primary shadow-sm" : "border-border"}`}>
    <div className="flex items-start justify-between gap-3 flex-wrap">
      <h3 className="text-lg font-semibold">{route.routeTitle}</h3>
      {isStrongest ? (
        <span className="text-xs font-medium rounded-full border border-primary text-primary px-2 py-0.5">
          Currently looks most workable
        </span>
      ) : null}
    </div>

    <div className="flex flex-wrap gap-2 mt-3">
      <span className={`text-xs font-medium rounded-full border px-2.5 py-1 ${eligibilityTone(route.eligibility)}`}>
        Eligibility: {ELIGIBILITY_LABEL[route.eligibility]}
      </span>
      <span className={`text-xs font-medium rounded-full border px-2.5 py-1 ${practicalTone(route.practicalFit)}`}>
        Practical fit: {PRACTICAL_LABEL[route.practicalFit]}
      </span>
    </div>

    <p className="text-sm text-muted-foreground mt-3">{route.participantExplanation}</p>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 text-sm mt-3">
      <div><span className="font-medium">Typical duration:</span> <span className="text-muted-foreground">{route.durationLabel}</span></div>
      <div><span className="font-medium">Typical cost:</span> <span className="text-muted-foreground">{route.costLabel}</span></div>
    </div>

    <RequirementList label="Requirements that appear met" items={route.requirementsMet} icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} />
    <RequirementList label="Requirements not currently met" items={route.requirementsNotMet} icon={<XCircle className="h-4 w-4 text-red-600" />} />
    <RequirementList label="Requirements we couldn't confirm from your answers" items={route.requirementsUnknown} icon={<CircleHelp className="h-4 w-4 text-amber-600" />} />
    <RequirementList label="Requirements to verify yourself" items={route.requirementsNotAssessed} icon={<ListChecks className="h-4 w-4 text-muted-foreground" />} />
    <RequirementList label="Checks before you can rely on this route" items={route.verificationsRequired} icon={<CircleHelp className="h-4 w-4 text-amber-600" />} />
    <RequirementList label="Trade-offs flagged" items={route.concerns} icon={<AlertTriangle className="h-4 w-4 text-amber-600" />} />
    <RequirementList label="Practical constraints (never affect eligibility)" items={route.constraints} icon={<AlertTriangle className="h-4 w-4 text-amber-600" />} />
  </div>
);

export const ResultV2View = ({ result }: { result: RealityCheckResultV2 }) => {
  const [view, setView] = useState<"routes" | "compare">("routes");
  const canCompare = result.routes.length >= 2;
  return (
  <div className="max-w-3xl mx-auto w-full">
    <h2 className="text-2xl font-semibold mb-2">Your Reality Check — {result.careerTitle}</h2>
    <p className="text-muted-foreground mb-6">{result.summary}</p>

    {canCompare ? (
      <div className="flex gap-1 mb-4 rounded-lg border border-border p-1 w-fit" role="tablist" aria-label="Result view">
        <button
          type="button" role="tab" aria-selected={view === "routes"}
          onClick={() => setView("routes")}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${view === "routes" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          <List className="h-4 w-4" aria-hidden /> Routes
        </button>
        <button
          type="button" role="tab" aria-selected={view === "compare"}
          onClick={() => setView("compare")}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${view === "compare" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Columns3 className="h-4 w-4" aria-hidden /> Compare routes
        </button>
      </div>
    ) : null}

    {view === "compare" && canCompare ? (
      <CompareRoutesTable result={result} />
    ) : (
      <div className="space-y-4">
        {result.routes.map((route) => (
          <RouteCard key={route.routeId} route={route} isStrongest={route.routeId === result.strongestRouteId} />
        ))}
      </div>
    )}

    {result.unresolvedChecks.length ? (
      <div className="mt-6 rounded-xl border border-border p-5">
        <h3 className="font-semibold mb-2">Still to check</h3>
        <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
          {result.unresolvedChecks.map((c) => <li key={c}>{c}</li>)}
        </ul>
      </div>
    ) : null}

    {result.immediateActions.length ? (
      <div className="mt-6 rounded-xl border border-border p-5">
        <h3 className="font-semibold mb-2">Things you can do now</h3>
        <ul className="space-y-3">
          {result.immediateActions.map((a) => (
            <li key={a.actionTemplateId}>
              <div className="font-medium text-sm">{a.title}</div>
              <div className="text-sm text-muted-foreground">{a.description}</div>
            </li>
          ))}
        </ul>
      </div>
    ) : null}

    {result.considerations.length ? (
      <div className="mt-6 rounded-xl border border-border p-5">
        <h3 className="font-semibold mb-2">Worth knowing</h3>
        <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
          {result.considerations.map((c) => <li key={c}>{c}</li>)}
        </ul>
      </div>
    ) : null}

    {result.limitations.length ? (
      <div className="mt-6 text-xs text-muted-foreground space-y-1">
        {result.limitations.map((l) => <p key={l}>{l}</p>)}
        {result.evidenceCoverage ? <p>{result.evidenceCoverage.note}</p> : null}
      </div>
    ) : null}
  </div>
  );
};
