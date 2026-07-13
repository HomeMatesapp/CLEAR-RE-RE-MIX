// ResultV2View — renders a RealityCheckResultV2 (Increment 3; restyled in
// Increment 12 to the app's ink-and-paper editorial language).
//
// The two status axes are shown SEPARATELY as a two-column ledger and never
// merged. Requirements are itemised honestly, including those we could not
// assess. All copy comes from the result (already language-safe) or from the
// fixed status labels — no probability wording anywhere.

import { useState } from "react";
import { Bookmark, Columns3, List } from "lucide-react";
import { CompareRoutesTable } from "@/components/reality-check/CompareRoutesTable";
import type {
  EligibilityStatus,
  PracticalFitStatus,
  RealityCheckResultV2,
  RouteEvaluationV2,
} from "@shared/career-evaluator/v1/result-v2";
import { ELIGIBILITY_LABEL, PRACTICAL_LABEL } from "@/lib/reality-check/v2-labels";

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <p className="font-mono text-[10.5px] tracking-[0.12em] uppercase font-semibold text-muted-foreground">
    {children}
  </p>
);

const eligibilityRule = (s: EligibilityStatus): string =>
  s === "available_now" ? "border-emerald-600"
  : s === "not_currently_available" ? "border-red-600"
  : s === "insufficient_information" ? "border-muted-foreground/40"
  : "border-amber-600";

const eligibilityText = (s: EligibilityStatus): string =>
  s === "available_now" ? "text-emerald-800"
  : s === "not_currently_available" ? "text-red-800"
  : s === "insufficient_information" ? "text-muted-foreground"
  : "text-amber-800";

const practicalRule = (s: PracticalFitStatus): string =>
  s === "appears_manageable" ? "border-emerald-600"
  : s === "insufficient_information" ? "border-muted-foreground/40"
  : "border-amber-600";

const practicalText = (s: PracticalFitStatus): string =>
  s === "appears_manageable" ? "text-emerald-800"
  : s === "insufficient_information" ? "text-muted-foreground"
  : "text-amber-800";

const AxisLedger = ({ route }: { route: RouteEvaluationV2 }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <div className={`border-l-[3px] pl-3 ${eligibilityRule(route.eligibility)}`}>
      <Eyebrow>Eligibility</Eyebrow>
      <p className={`text-[13.5px] font-medium leading-snug ${eligibilityText(route.eligibility)}`}>
        {ELIGIBILITY_LABEL[route.eligibility]}
      </p>
    </div>
    <div className={`border-l-[3px] pl-3 ${practicalRule(route.practicalFit)}`}>
      <Eyebrow>Practical fit</Eyebrow>
      <p className={`text-[13.5px] font-medium leading-snug ${practicalText(route.practicalFit)}`}>
        {PRACTICAL_LABEL[route.practicalFit]}
      </p>
    </div>
  </div>
);

const ItemisedList = ({ label, items }: { label: string; items: readonly string[] }) => {
  if (!items.length) return null;
  return (
    <div className="mt-3">
      <Eyebrow>{label}</Eyebrow>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {items.map((r) => (
          <span key={r} className="text-[13px] leading-snug border border-foreground/25 rounded px-2 py-0.5">
            {r}
          </span>
        ))}
      </div>
    </div>
  );
};

const RouteCard = ({ route, isStrongest }: { route: RouteEvaluationV2; isStrongest: boolean }) => (
  <article className={`relative rounded-xl p-5 ${isStrongest ? "border-2 border-foreground/90" : "border border-foreground/25"}`}>
    {isStrongest ? (
      <span className="absolute -top-[11px] right-4 bg-card font-mono text-[10.5px] tracking-[0.12em] uppercase font-semibold border-2 border-foreground/90 rounded-full px-2.5 py-0.5">
        Most workable now
      </span>
    ) : null}
    <h3 className="font-display text-[18px] font-bold leading-tight mb-3">{route.routeTitle}</h3>
    <AxisLedger route={route} />

    <div className="grid grid-cols-[96px_1fr] gap-x-3 gap-y-1 text-[13px] mt-3">
      <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground pt-0.5">Duration</span>
      <span>{route.durationLabel}</span>
      <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground pt-0.5">Cost</span>
      <span>{route.costLabel}</span>
    </div>

    <p className="text-[13px] text-muted-foreground leading-snug mt-3">{route.participantExplanation}</p>

    <ItemisedList label="Requirements that appear met" items={route.requirementsMet} />
    <ItemisedList label="Requirements not currently met" items={route.requirementsNotMet} />
    <ItemisedList label="Could not confirm from your answers" items={route.requirementsUnknown} />
    <ItemisedList label="Verify yourself" items={route.requirementsNotAssessed} />
    <ItemisedList label="Checks before relying on this route" items={route.verificationsRequired} />
    <ItemisedList label="Trade-offs flagged" items={route.concerns} />
    <ItemisedList label="Practical constraints (never affect eligibility)" items={route.constraints} />
  </article>
);

export const ResultV2View = ({ result }: { result: RealityCheckResultV2 }) => {
  const [view, setView] = useState<"routes" | "compare">("routes");
  const canCompare = result.routes.length >= 2;
  return (
  <div className="max-w-3xl mx-auto w-full">
    <Eyebrow>Reality check · {result.careerTitle}{result.evidenceCoverage ? ` · ${result.evidenceCoverage.completedAnswerCount}/${result.evidenceCoverage.totalAnswerCount} answered` : ""}</Eyebrow>
    <h2 className="font-display font-extrabold tracking-[-0.01em] leading-[1.15] text-[clamp(22px,3.4vw,28px)] mt-2 mb-2">
      Your Reality Check — {result.careerTitle}
    </h2>
    <p className="text-[15px] leading-snug text-muted-foreground mb-6">{result.summary}</p>

    {canCompare ? (
      <div className="flex gap-1 mb-5 rounded-lg border border-foreground/25 p-1 w-fit" role="tablist" aria-label="Result view">
        <button
          type="button" role="tab" aria-selected={view === "routes"}
          onClick={() => setView("routes")}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${view === "routes" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
        >
          <List className="h-4 w-4" aria-hidden /> Routes
        </button>
        <button
          type="button" role="tab" aria-selected={view === "compare"}
          onClick={() => setView("compare")}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${view === "compare" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Columns3 className="h-4 w-4" aria-hidden /> Compare routes
        </button>
      </div>
    ) : null}

    {view === "compare" && canCompare ? (
      <CompareRoutesTable result={result} />
    ) : (
      <div className="space-y-5">
        {result.routes.map((route) => (
          <RouteCard key={route.routeId} route={route} isStrongest={route.routeId === result.strongestRouteId} />
        ))}
      </div>
    )}

    {result.unresolvedChecks.length ? (
      <div className="mt-6 rounded-xl border border-foreground/25 p-5">
        <Eyebrow>Still to check</Eyebrow>
        <ul className="mt-2 space-y-1 text-[13.5px] leading-snug">
          {result.unresolvedChecks.map((c) => <li key={c} className="flex gap-2"><span aria-hidden className="text-muted-foreground">—</span>{c}</li>)}
        </ul>
      </div>
    ) : null}

    {result.immediateActions.length ? (
      <div className="mt-5 rounded-xl border border-foreground/25 p-5">
        <Eyebrow>Things you can do now</Eyebrow>
        <ul className="mt-2 space-y-3">
          {result.immediateActions.map((a) => (
            <li key={a.actionTemplateId}>
              <div className="font-medium text-[14px] leading-snug flex items-start gap-2">
                <Bookmark className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" aria-hidden />{a.title}
              </div>
              <div className="text-[13px] text-muted-foreground leading-snug ml-5.5 pl-0.5">{a.description}</div>
            </li>
          ))}
        </ul>
      </div>
    ) : null}

    {result.considerations.length ? (
      <div className="mt-5 rounded-xl border border-foreground/25 p-5">
        <Eyebrow>Worth knowing</Eyebrow>
        <ul className="mt-2 space-y-1 text-[13.5px] leading-snug">
          {result.considerations.map((c) => <li key={c} className="flex gap-2"><span aria-hidden className="text-muted-foreground">—</span>{c}</li>)}
        </ul>
      </div>
    ) : null}

    {result.limitations.length ? (
      <div className="mt-5 text-[12px] text-muted-foreground leading-relaxed space-y-1">
        {result.limitations.map((l) => <p key={l}>{l}</p>)}
        {result.evidenceCoverage ? <p>{result.evidenceCoverage.note}</p> : null}
      </div>
    ) : null}
  </div>
  );
};
