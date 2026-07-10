import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FROZEN_DEEP_ROLES, getTaxonomyEntry } from "@/lib/roles/role-taxonomy";

interface Props {
  roleSlug: string;
  roleName: string;
}

// User-facing shortlist of pilot roles to suggest. We only surface roles that
// (a) are in the frozen deep-reviewed set AND (b) appear in this preferred
// order. This keeps the fallback honest: every suggestion below actually has
// a reviewed Reality-check today.
const PREFERRED_PILOT_ORDER = [
  "registered-nurse",
  "software-engineer",
  "electrician",
  "solicitor",
  "police-officer",
];

function pilotSuggestions(currentSlug: string) {
  const frozen = new Set(FROZEN_DEEP_ROLES as readonly string[]);
  return PREFERRED_PILOT_ORDER
    .filter((slug) => slug !== currentSlug && frozen.has(slug))
    .slice(0, 3)
    .map((slug) => {
      const t = getTaxonomyEntry(slug);
      return { slug, name: t?.roleName ?? slug };
    });
}

export const UnreviewedRealityCheckFallback = ({ roleSlug, roleName }: Props) => {
  const pilots = pilotSuggestions(roleSlug);
  const requestHref = `/support?topic=reality-check-request&role=${encodeURIComponent(roleSlug)}`;

  return (
    <main className="flex-1 container mx-auto px-4 py-12 max-w-2xl">
      <Link
        to={`/role/${roleSlug}`}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to {roleName}
      </Link>

      <h1 className="font-display text-2xl sm:text-3xl font-medium text-foreground mb-3">
        Reality-check is not ready for {roleName} yet
      </h1>
      <p className="text-sm text-muted-foreground leading-relaxed mb-3">
        We only show adaptive Reality-checks for roles where the entry routes,
        requirements and judgement logic have been reviewed. {roleName} is not
        reviewed yet, so we will not guess.
      </p>

      <section aria-labelledby="what-you-can-do" className="mt-8">
        <h2
          id="what-you-can-do"
          className="font-display text-xs uppercase tracking-[0.15em] text-muted-foreground mb-4"
        >
          What you can do instead
        </h2>

        <div className="space-y-6">
          <div>
            <Button asChild variant="default">
              <Link to={`/role/${roleSlug}`}>View the {roleName} role page</Link>
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              General information, pathways and honest picture for {roleName}.
            </p>
          </div>

          {pilots.length > 0 && (
            <div>
              <p className="text-sm font-medium text-foreground mb-2">
                Try a reviewed pilot role
              </p>
              <ul className="flex flex-wrap gap-2 list-none p-0 m-0">
                {pilots.map((p) => (
                  <li key={p.slug}>
                    <Link
                      to={`/role/${p.slug}/reality-check`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border border-border bg-card hover:bg-muted text-foreground transition-colors"
                    >
                      {p.name}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <Button asChild variant="outline">
              <Link to={requestHref}>
                <MessageSquarePlus className="h-4 w-4 mr-2" />
                Request this Reality-check
              </Link>
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              Tell us {roleName} matters to you — we prioritise reviews by demand.
            </p>
          </div>
        </div>
      </section>

      <p className="mt-10 text-xs text-muted-foreground leading-relaxed border-t border-border pt-6">
        This does not mean {roleName} is a bad route. It means Clear Routes has
        not reviewed this route deeply enough to judge it yet.
      </p>
    </main>
  );
};
