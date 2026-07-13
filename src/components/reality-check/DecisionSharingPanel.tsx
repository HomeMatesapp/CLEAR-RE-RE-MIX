// DecisionSharingPanel — participant-side consent controls (Increment 8).
//
// Pure and props-driven so it renders deterministically and is fully
// testable; loading and persistence live in the page.
//
// Language rules: sharing is framed as the participant's grant ("You control
// who sees this"), revocation is one click, and what an adviser can and
// cannot see is stated plainly. No dark patterns: not sharing is the default
// and the panel says so.

import { useState } from "react";
import { Link2, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OrgLink, DecisionShare } from "@/lib/institutions";

interface Props {
  links: OrgLink[];
  shares: DecisionShare[];
  busy: boolean;
  onJoin: (code: string) => void;
  onShare: (organisationId: string) => void;
  onRevokeShare: (shareId: string) => void;
  onRevokeLink: (linkId: string) => void;
  joinError?: string | null;
}

export const DecisionSharingPanel = ({
  links, shares, busy, onJoin, onShare, onRevokeShare, onRevokeLink, joinError,
}: Props) => {
  const [code, setCode] = useState("");
  const shareFor = (orgId: string) => shares.find((s) => s.organisation_id === orgId && !s.revoked_at) ?? null;

  return (
    <section aria-label="Sharing with your adviser">
      <p className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
        Sharing with your adviser
      </p>
      <p className="text-sm text-muted-foreground mb-4 flex items-start gap-2">
        <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />
        <span>
          Nothing is shared unless you choose to share it. If you share this decision with an
          organisation, their advisers can see this saved result — nothing else — and you can stop
          sharing at any time.
        </span>
      </p>

      {links.length === 0 ? (
        <p className="text-sm text-muted-foreground mb-3">
          Not connected to an organisation. If your college, service or adviser gave you a code,
          enter it here.
        </p>
      ) : (
        <ul className="space-y-2 mb-4">
          {links.map((link) => {
            const share = shareFor(link.organisation_id);
            return (
              <li key={link.id} className="rounded-lg border border-border px-4 py-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="font-medium text-sm">{link.organisation_name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {share ? "Sharing this decision" : "Not sharing this decision"}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {share ? (
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => onRevokeShare(share.id)}>
                        Stop sharing
                      </Button>
                    ) : (
                      <Button size="sm" disabled={busy} onClick={() => onShare(link.organisation_id)}>
                        Share this decision
                      </Button>
                    )}
                    <Button
                      size="sm" variant="ghost" disabled={busy}
                      onClick={() => onRevokeLink(link.id)}
                      aria-label={`Disconnect from ${link.organisation_name}`}
                    >
                      <X className="h-4 w-4" aria-hidden /> Disconnect
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex gap-2 items-center">
        <label htmlFor="org-join-code" className="sr-only">Organisation code</label>
        <input
          id="org-join-code"
          className="rounded-lg border border-border px-3 py-2 text-sm bg-background w-44"
          placeholder="Organisation code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <Button
          size="sm" variant="outline"
          disabled={busy || code.trim().length === 0}
          onClick={() => { onJoin(code.trim()); setCode(""); }}
        >
          <Link2 className="h-4 w-4 mr-1" aria-hidden /> Connect
        </Button>
      </div>
      {joinError ? (
        <p className="text-sm text-red-700 mt-2" role="alert">{joinError}</p>
      ) : null}
    </section>
  );
};
