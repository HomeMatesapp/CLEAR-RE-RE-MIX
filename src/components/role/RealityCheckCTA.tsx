import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Gavel, Sparkles } from "lucide-react";
import {
  loadSessionResult,
  verdictTone,
  type SessionRCEntry,
} from "@/components/role/reality-check-shared";

/**
 * Compact role-page entry point for the Reality-check.
 * - If the user has no in-session result yet → shows a "Start Reality-check" CTA.
 * - If they already have a result for this role → shows a compact summary
 *   (verdict, best route, first move) with a link back to the full check.
 * Never embeds the full form.
 */
export const RealityCheckCTA = ({
  roleSlug,
  roleName,
}: {
  roleSlug: string;
  roleName: string;
}) => {
  const [cached, setCached] = useState<SessionRCEntry | null>(null);

  useEffect(() => {
    setCached(loadSessionResult(roleSlug));
  }, [roleSlug]);

  const target = `/role/${roleSlug}/reality-check`;

  if (cached) {
    const r = cached.result;
    const firstMove = r.firstMoves?.[0];
    return (
      <section
        aria-label="Your route judgement"
        className="rounded-xl border border-amber-300/40 bg-gradient-to-br from-gray-900 to-gray-800 p-4 mb-6 text-white shadow-sm"
      >
        <div className="flex items-center gap-2 mb-2 text-amber-300">
          <Gavel className="h-4 w-4" />
          <p className="text-[11px] font-semibold uppercase tracking-wider">Your route judgement</p>
        </div>
        <div className="mb-3">
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${verdictTone(
              r.overallVerdict,
            )}`}
          >
            {r.overallVerdict}
          </span>
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">Best route</dt>
            <dd className="text-sm text-gray-100 leading-snug mt-0.5">{r.bestRoute.title}</dd>
          </div>
          {firstMove && (
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-sky-300">First move</dt>
              <dd className="text-sm text-gray-100 leading-snug mt-0.5">{firstMove}</dd>
            </div>
          )}
        </dl>
        <Link
          to={target}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-amber-200 hover:text-white underline underline-offset-2"
        >
          View full Reality-check <ArrowRight className="h-3 w-3" />
        </Link>
      </section>
    );
  }

  return (
    <section
      aria-label="Reality-check this route"
      className="rounded-xl border border-gray-800 bg-gradient-to-br from-gray-900 to-gray-800 p-4 mb-6 text-white shadow-sm"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <Sparkles className="h-3.5 w-3.5 text-amber-300" />
        <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-300">
          Reality-check this route
        </p>
      </div>
      <h2 className="text-base font-semibold mb-1">
        Is {roleName} realistic for you?
      </h2>
      <p className="text-xs text-gray-300 mb-3 leading-relaxed">
        Answer a few questions about your background, qualifications, budget, time, and area.
        We'll show the route with the best odds — plus the one to be careful with.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to={target}
          className="inline-flex items-center gap-1.5 text-sm font-medium bg-amber-300 text-gray-900 px-4 py-2 rounded-lg hover:bg-amber-200 transition-colors"
        >
          <Sparkles className="h-4 w-4" />
          Start Reality-check
        </Link>
        <a
          href="#about-this-role"
          className="text-xs text-gray-300 underline underline-offset-2 hover:text-white"
        >
          Read about the role first
        </a>
      </div>
    </section>
  );
};
