import { ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { trackEvent } from "@/lib/posthog";

export interface ProviderCardData {
  id: string;
  name: string;
  who_its_for?: string | null;
  publishes_outcomes?: boolean | null;
  publishes_note?: string | null;
  clear_routes_note?: string | null;
  website?: string | null;
  apply_url?: string | null;
  tier?: string | null;
}

interface Props {
  provider: ProviderCardData;
  roleSlug: string;
}

export const ProviderCard = ({ provider, roleSlug }: Props) => {
  const url = provider.apply_url || provider.website;
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col h-full">
      <div className="flex-1">
        <div className="flex items-start justify-between gap-3 mb-1">
          <Link to={`/provider/${provider.id}`} className="font-display font-semibold text-foreground hover:underline">
            {provider.name}
          </Link>
        </div>

        {provider.who_its_for && (
          <p className="text-sm text-muted-foreground mt-1">{provider.who_its_for}</p>
        )}

        {provider.publishes_outcomes && provider.publishes_note ? (
          <p className="text-sm text-foreground mt-3 whitespace-pre-line">
            <span className="text-muted-foreground">Publishes: </span>
            {provider.publishes_note}
          </p>
        ) : (
          <p className="text-sm mt-3 text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
            Outcomes not published — ask before enrolling.
          </p>
        )}

        {provider.clear_routes_note && (
          <p className="text-xs text-muted-foreground italic mt-3">{provider.clear_routes_note}</p>
        )}
      </div>

      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent("provider_link_clicked", { role: roleSlug, provider: provider.name })}
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Visit website <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );
};
