import { useEffect, useState } from "react";
import { ExternalLink, LifeBuoy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Support circumstance keys. Kept in one place so the Decision Profile
 * checkboxes and the opportunity criteria stay in sync.
 *
 * Sensitive — never sent to analytics.
 */
export const SUPPORT_CIRCUMSTANCE_KEYS = [
  "care_leaver",
  "estranged",
  "parent_carer",
  "disability_or_health",
  "first_gen",
  "low_income",
  "benefits",
  "refugee_asylum",
  "returner",
  "veteran",
  "other",
] as const;

export type SupportCircumstanceKey = (typeof SUPPORT_CIRCUMSTANCE_KEYS)[number];

export const SUPPORT_CIRCUMSTANCE_LABELS: Record<SupportCircumstanceKey, string> = {
  care_leaver: "Care leaver",
  estranged: "Estranged from family",
  parent_carer: "Parent or carer",
  disability_or_health: "Disabled or long-term health condition",
  first_gen: "First in family to attend university",
  low_income: "Low-income household",
  benefits: "Unemployed or receiving benefits",
  refugee_asylum: "Refugee or asylum background",
  returner: "Returning to work after a break",
  veteran: "Armed forces veteran or family member",
  other: "Other support need",
};

type Opportunity = {
  id: string;
  name: string;
  organisation_name: string | null;
  type: string;
  who_it_helps: string | null;
  eligibility_summary: string | null;
  amount_or_value: string | null;
  location_scope: string | null;
  source_url: string | null;
  last_checked_at: string | null;
  sectors: string[] | null;
  role_slugs: string[] | null;
  criteria: string[] | null;
};

interface SupportMatchesProps {
  roleSlug: string;
  roleName: string;
  /** Pre-supplied circumstances (e.g. from Reality-check input). Otherwise pulled from profile. */
  circumstances?: SupportCircumstanceKey[];
  max?: number;
}

const formatDate = (iso: string | null): string | null => {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", year: "numeric" });
  } catch {
    return null;
  }
};

export const SupportMatches = ({
  roleSlug,
  roleName,
  circumstances,
  max = 3,
}: SupportMatchesProps) => {
  const { user } = useAuth();
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [profileCircs, setProfileCircs] = useState<SupportCircumstanceKey[] | null>(null);
  const [loading, setLoading] = useState(true);

  // Pull user's saved circumstances if not supplied. Never send to analytics.
  useEffect(() => {
    if (circumstances) {
      setProfileCircs(circumstances);
      return;
    }
    if (!user) {
      setProfileCircs([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("decision_profiles")
        .select("support_circumstances")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const raw = (data?.support_circumstances ?? []) as unknown;
      const arr = Array.isArray(raw) ? (raw as string[]) : [];
      setProfileCircs(
        arr.filter((k): k is SupportCircumstanceKey =>
          (SUPPORT_CIRCUMSTANCE_KEYS as readonly string[]).includes(k)
        )
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [user, circumstances]);

  // Fetch a reasonable candidate set, then score client-side.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("support_opportunities")
        .select(
          "id, name, organisation_name, type, who_it_helps, eligibility_summary, amount_or_value, location_scope, source_url, last_checked_at, sectors, role_slugs, criteria"
        )
        .eq("review_status", "active")
        .limit(100);
      if (cancelled) return;
      setOpps((data as Opportunity[] | null) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || profileCircs === null) return null;

  const userCircs = new Set(profileCircs);

  // Score: role match (slug or wildcard) is required; criteria overlap boosts.
  const scored = opps
    .map((o) => {
      const slugs = o.role_slugs ?? [];
      const sectors = o.sectors ?? [];
      const wildcard = slugs.includes("*") || sectors.includes("*");
      const slugHit = slugs.includes(roleSlug);
      const criteria = o.criteria ?? [];
      const circHits = criteria.filter((c) => userCircs.has(c as SupportCircumstanceKey)).length;
      const noCriteria = criteria.length === 0;

      // Eligibility relevance:
      //   - If opportunity has criteria, require at least one user circumstance match
      //     OR be a slug-specific opportunity (then show as "may be relevant").
      //   - Wildcard + criteria + no user circs → skip (would be noisy).
      let score = 0;
      if (slugHit) score += 4;
      else if (wildcard) score += 1;
      else return null; // unrelated role
      if (circHits > 0) score += 3 + circHits;
      else if (noCriteria) score += 1;
      else if (!slugHit) return null;

      const confident = circHits > 0 && slugHit;
      return { opp: o, score, confident };
    })
    .filter((x): x is { opp: Opportunity; score: number; confident: boolean } => x !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, max);

  if (scored.length === 0) return null;

  const anyConfident = scored.some((s) => s.confident);

  return (
    <section
      aria-label={`Support that may help if you're considering ${roleName}`}
      className="rounded-lg border border-gray-200 bg-white p-4 mb-6"
    >
      <div className="flex items-center gap-2 mb-1">
        <LifeBuoy className="h-4 w-4 text-primary" aria-hidden />
        <h2 className="text-sm font-semibold text-gray-900 m-0">Support that may help</h2>
      </div>
      <p className="text-xs text-gray-500 mb-3 leading-snug">
        {anyConfident
          ? "Based on your Decision Profile. Check current criteria before applying — eligibility changes."
          : "These may be worth checking, but eligibility depends on current criteria."}
      </p>

      <ul className="space-y-3">
        {scored.map(({ opp }) => {
          const checked = formatDate(opp.last_checked_at);
          return (
            <li key={opp.id} className="text-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 leading-snug">
                    {opp.name}
                    <span className="ml-2 text-[10px] font-medium uppercase tracking-wider text-gray-400">
                      {opp.type}
                    </span>
                  </p>
                  {opp.organisation_name && (
                    <p className="text-xs text-gray-500">{opp.organisation_name}</p>
                  )}
                </div>
                {opp.amount_or_value && (
                  <span className="flex-shrink-0 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded px-2 py-0.5">
                    {opp.amount_or_value}
                  </span>
                )}
              </div>
              {opp.who_it_helps && (
                <p className="text-xs text-gray-600 mt-1 leading-snug">{opp.who_it_helps}</p>
              )}
              {opp.eligibility_summary && (
                <p className="text-xs text-gray-500 mt-1 leading-snug">
                  <span className="font-medium text-gray-600">Worth checking if:</span>{" "}
                  {opp.eligibility_summary}
                </p>
              )}
              <div className="mt-1.5 flex items-center gap-3 text-xs">
                {opp.source_url && (
                  <a
                    href={opp.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    Source <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {opp.location_scope && (
                  <span className="text-gray-400">{opp.location_scope}</span>
                )}
                {checked && <span className="text-gray-400">Last checked {checked}</span>}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-[10px] text-gray-400 mt-3">
        Clear Routes surfaces these as a prompt — we don't confirm eligibility.
      </p>
    </section>
  );
};
