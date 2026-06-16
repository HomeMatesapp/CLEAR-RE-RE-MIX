import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Loader2,
  MapPin,
  ShieldAlert,
  Sparkles,
  Target,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  GROUP_LABEL,
  GROUP_ORDER,
  scoreMany,
  type DecisionForMatching,
} from "@/lib/opportunities/match";
import type {
  Opportunity,
  OpportunityGroup,
  ScoredOpportunity,
} from "@/lib/opportunities/types";
import { EnquiryDialog, type EnquiryContext } from "@/components/opportunities/EnquiryDialog";
import {
  BUDGETS,
  ENGLISH_MATHS,
  INCOME_NEEDS,
  QUALIFICATION_LEVELS,
  type RealityCheckAnswers,
} from "@/lib/reality-check/types";

interface SavedDecisionFull {
  id: string;
  user_id: string;
  role_id: string | null;
  role_slug: string;
  role_name: string;
  overall_verdict: string | null;
  best_route_title: string | null;
  backup_route_title: string | null;
  route_to_avoid_title: string | null;
  first_move: string | null;
  input_snapshot: Record<string, unknown> | null;
  result_snapshot: Record<string, unknown> | null;
}

const labelFor = <T extends { value: string; label: string }>(opts: T[], v: unknown) =>
  opts.find((o) => o.value === v)?.label ?? null;

const OpportunitiesPage = () => {
  const { decisionId = "" } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [decision, setDecision] = useState<SavedDecisionFull | null>(null);
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [enquiryOpp, setEnquiryOpp] = useState<Opportunity | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate(`/login?redirect=/my-decisions/${decisionId}/opportunities`);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: d } = await supabase
        .from("saved_decisions")
        .select("id, user_id, role_id, role_slug, role_name, overall_verdict, best_route_title, backup_route_title, route_to_avoid_title, first_move, input_snapshot, result_snapshot")
        .eq("id", decisionId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (!d) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setDecision(d as SavedDecisionFull);

      const { data: o } = await supabase
        .from("opportunities")
        .select("*")
        .eq("status", "active")
        .contains("role_tags", [d.role_slug]);
      if (cancelled) return;
      setOpps((o as Opportunity[] | null) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, decisionId, navigate]);

  const answers = (decision?.input_snapshot ?? {}) as Partial<RealityCheckAnswers>;

  const matchingInput: DecisionForMatching = useMemo(
    () => ({
      role_slug: decision?.role_slug ?? null,
      role_name: decision?.role_name ?? null,
      best_route_title: decision?.best_route_title ?? null,
      route_to_avoid_title: decision?.route_to_avoid_title ?? null,
      first_move: decision?.first_move ?? null,
      answers,
    }),
    [decision, answers],
  );

  const scored = useMemo(() => scoreMany(opps, matchingInput), [opps, matchingInput]);

  const groups: Record<OpportunityGroup, ScoredOpportunity[]> = useMemo(() => {
    const g = { jobs: [], apprenticeships: [], courses: [], support: [], paid_careful: [] } as Record<
      OpportunityGroup,
      ScoredOpportunity[]
    >;
    for (const s of scored) g[s.group].push(s);
    return g;
  }, [scored]);

  const nextSteps = useMemo(() => scored.slice(0, 3), [scored]);

  const incomeLabel = labelFor(INCOME_NEEDS, answers.incomeNeed);
  const budgetLabel = labelFor(BUDGETS, answers.budget);
  const qualLabel = labelFor(QUALIFICATION_LEVELS, answers.qualificationLevel);
  const englishMathsLabel = labelFor(ENGLISH_MATHS, answers.englishMaths);
  const qualGap = answers.englishMaths === "no" || answers.englishMaths === "english_only" || answers.englishMaths === "maths_only";

  const enquiryContext: EnquiryContext | null = decision
    ? {
        decisionId: decision.id,
        roleSlug: decision.role_slug,
        roleName: decision.role_name,
        bestRoute: decision.best_route_title,
        area: (answers.area as string | undefined) ?? null,
        needToEarn: incomeLabel,
        qualificationLevel: qualLabel,
      }
    : null;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </main>
      </div>
    );
  }

  if (notFound || !decision) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-20 max-w-2xl">
          <h1 className="font-display text-3xl font-medium">We couldn't find that saved decision.</h1>
          <p className="mt-4 text-muted-foreground">It may have been removed.</p>
          <div className="mt-8">
            <Button asChild variant="outline">
              <Link to="/my-decisions">Back to My Career Decisions</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Opportunities for your {decision.role_name} route — Clear Routes</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <Link
          to="/my-decisions"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to My Career Decisions
        </Link>

        <header className="mb-6">
          <h1 className="font-display text-3xl font-medium text-foreground">
            Opportunities for your {decision.role_name} route
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Based on your saved route check.</p>

          <dl className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <ContextCell label="Area" value={(answers.area as string) || "—"} />
            <ContextCell label="Best route" value={decision.best_route_title ?? "—"} />
            <ContextCell label="Need to earn" value={incomeLabel ?? "—"} />
            <ContextCell
              label="Qualification gap"
              value={qualGap ? `Missing ${englishMathsLabel ?? "English/maths"}` : "None flagged"}
              tone={qualGap ? "amber" : "default"}
            />
          </dl>
        </header>

        {/* Best next step */}
        {nextSteps.length > 0 && (
          <section className="mb-10">
            <h2 className="font-display text-xl font-medium text-foreground mb-2 flex items-center gap-2">
              <Target className="h-4 w-4 text-amber-600" /> Best next step
            </h2>
            {decision.first_move && (
              <p className="text-sm text-muted-foreground mb-4">
                Your Reality-check first move: <span className="text-foreground">{decision.first_move}</span>
              </p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {nextSteps.map((s) => (
                <NextStepCard key={s.opportunity.id} s={s} />
              ))}
            </div>
          </section>
        )}

        {/* Grouped sections */}
        {GROUP_ORDER.map((g) => {
          const items = groups[g];
          if (!items?.length) return null;
          return (
            <section key={g} className="mb-10">
              <h2 className="font-display text-xl font-medium text-foreground mb-3 flex items-center gap-2">
                {g === "paid_careful" && <ShieldAlert className="h-4 w-4 text-amber-600" />}
                {GROUP_LABEL[g]}
              </h2>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {items.map((s) => (
                  <li key={s.opportunity.id}>
                    <OpportunityCard
                      s={s}
                      onEnquire={() => setEnquiryOpp(s.opportunity)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        {scored.length === 0 && (
          <div className="rounded-2xl border border-border bg-muted/40 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No opportunities matched yet. We'll add more as Clear Routes grows.
            </p>
          </div>
        )}

        <p className="mt-10 text-xs text-muted-foreground border-t border-border pt-4">
          Some opportunities may be sponsored. Sponsored options are labelled. Sponsorship does not
          determine your route judgement or ranking. Listings shown here are for guidance only —
          check current availability, entry requirements, and funding before applying.
        </p>
      </main>

      <Footer />

      {enquiryContext && (
        <EnquiryDialog
          open={!!enquiryOpp}
          onOpenChange={(o) => !o && setEnquiryOpp(null)}
          opportunity={enquiryOpp}
          context={enquiryContext}
        />
      )}
    </div>
  );
};

function ContextCell({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "amber";
}) {
  return (
    <div
      className={`rounded-lg border p-2.5 ${
        tone === "amber" ? "border-amber-200 bg-amber-50" : "border-border bg-card"
      }`}
    >
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="text-xs font-medium text-foreground mt-0.5 leading-snug">{value}</dd>
    </div>
  );
}

function NextStepCard({ s }: { s: ScoredOpportunity }) {
  const o = s.opportunity;
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
      <div className="flex items-center gap-1.5 text-amber-700 mb-1">
        <Sparkles className="h-3.5 w-3.5" />
        <p className="text-[10px] font-semibold uppercase tracking-wider">May fit</p>
      </div>
      <p className="text-sm font-semibold text-foreground leading-snug">{o.title}</p>
      {o.provider_name && <p className="text-xs text-muted-foreground mt-0.5">{o.provider_name}</p>}
      {s.reasons[0] && <p className="text-xs text-foreground mt-2 leading-relaxed">{s.reasons[0]}</p>}
    </div>
  );
}

function OpportunityCard({
  s,
  onEnquire,
}: {
  s: ScoredOpportunity;
  onEnquire: () => void;
}) {
  const o = s.opportunity;
  const location = o.is_remote
    ? "Remote"
    : o.is_online
    ? "Online"
    : o.location_name ?? (o.outward_code ?? "—");
  return (
    <div className="rounded-xl border border-border bg-card p-4 h-full flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground leading-snug">{o.title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {o.provider_name ?? o.employer_name ?? "—"}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {o.is_sponsored && (
            <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-800">
              {o.sponsor_label ?? "Sponsored"}
            </span>
          )}
          {o.is_seed && (
            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
              Example listing
            </span>
          )}
        </div>
      </div>

      <dl className="mt-3 space-y-1.5 text-xs">
        <Row icon={<MapPin className="h-3.5 w-3.5 text-muted-foreground" />} label="Location" value={location} />
        {(o.salary || o.cost) && (
          <Row
            icon={<span className="text-xs text-muted-foreground">£</span>}
            label={o.salary ? "Salary" : "Cost"}
            value={o.salary ?? o.cost ?? "—"}
          />
        )}
        {o.entry_requirements && (
          <Row
            icon={<CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />}
            label="Entry"
            value={o.entry_requirements}
          />
        )}
      </dl>

      {s.reasons.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 mb-1">
            Why this may fit
          </p>
          <ul className="space-y-0.5 text-xs text-foreground">
            {s.reasons.slice(0, 3).map((r, i) => (
              <li key={i} className="flex gap-1.5">
                <span className="text-emerald-600">•</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {s.checks.length > 0 && (
        <div className="mt-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 mb-1">
            What to check
          </p>
          <ul className="space-y-0.5 text-xs text-muted-foreground">
            {s.checks.slice(0, 3).map((c, i) => (
              <li key={i} className="flex gap-1.5">
                <span className="text-amber-600">•</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-auto pt-3 flex flex-wrap items-center gap-2">
        {o.application_url && (
          <a
            href={o.application_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            View opportunity <ExternalLink className="h-3 w-3" />
          </a>
        )}
        <Button size="sm" variant="outline" onClick={onEnquire} className="ml-auto h-7 text-xs">
          Register interest
        </Button>
      </div>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-1.5">
      <div className="mt-0.5">{icon}</div>
      <div className="min-w-0">
        <dt className="sr-only">{label}</dt>
        <dd className="text-foreground leading-snug">
          <span className="text-muted-foreground">{label}: </span>
          {value}
        </dd>
      </div>
    </div>
  );
}

export default OpportunitiesPage;
