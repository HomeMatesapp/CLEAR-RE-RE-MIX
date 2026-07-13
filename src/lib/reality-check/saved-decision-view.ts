// Derivation layer for rendering saved decisions (Increment 4).
//
// Saved rows now come in two generations:
//   • legacy_engine rows — result_snapshot is the legacy result shape;
//     the existing readiness/verdict rendering applies.
//   • generic_pack rows  — result_snapshot is a versioned
//     RealityCheckResultV2 (written server-side by the claim RPC).
//
// This module is the single place list surfaces ask "what should this row
// say?", built on the versioned snapshot reader so unknown/invalid shapes
// degrade to legacy handling and old rows render exactly as before.

import { readResultSnapshot } from "@/lib/reality-check/result-snapshot";
import { ELIGIBILITY_LABEL, PRACTICAL_LABEL } from "@/lib/reality-check/v2-labels";

export interface SavedDecisionView {
  kind: "legacy" | "generic_v2";
  /** Strongest route title (V2) or null — caller falls back to the row's
   *  best_route_title column. */
  bestRouteTitle: string | null;
  /** Headline for the status card. Empty for legacy (caller keeps the
   *  readiness rendering). */
  statusHeadline: string;
  /** Supporting line under the headline. */
  statusDetail: string;
  /** Titles to seed the action checklist from (V2 immediate actions). */
  actionTitles: string[];
}

const LEGACY_VIEW: SavedDecisionView = {
  kind: "legacy",
  bestRouteTitle: null,
  statusHeadline: "",
  statusDetail: "",
  actionTitles: [],
};

export const describeSavedDecision = (resultSnapshot: unknown): SavedDecisionView => {
  const read = readResultSnapshot(resultSnapshot);
  if (read.version !== "reality-check-result/v2" || !read.v2) return LEGACY_VIEW;
  const v2 = read.v2;
  const strongest = v2.routes.find((r) => r.routeId === v2.strongestRouteId) ?? null;
  return {
    kind: "generic_v2",
    bestRouteTitle: strongest?.routeTitle ?? null,
    statusHeadline: strongest
      ? ELIGIBILITY_LABEL[strongest.eligibility]
      : "No route currently appears open",
    statusDetail: strongest
      ? PRACTICAL_LABEL[strongest.practicalFit]
      : "The reasons and next checks are in your full result.",
    actionTitles: v2.immediateActions.map((a) => a.title),
  };
};
