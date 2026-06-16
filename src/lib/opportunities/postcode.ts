// Small UK postcode / area helper for opportunity matching.
// We do not geocode in v1 — we match by outward code (first half of a postcode)
// and fall back to a case-insensitive city/area substring match.

const OUTWARD_RE = /^[A-Z]{1,2}[0-9][A-Z0-9]?/;

/**
 * Pull the outward code out of a full or partial UK postcode.
 *   "m1 1aa"   -> "M1"
 *   "M1"       -> "M1"
 *   "SE15 4AB" -> "SE15"
 *   "Leeds"    -> null
 */
export function extractOutwardCode(input: string | null | undefined): string | null {
  if (!input) return null;
  const cleaned = input.trim().toUpperCase().replace(/\s+/g, " ");
  if (!cleaned) return null;
  // First token only — avoids matching "M1" inside city names by accident.
  const firstToken = cleaned.split(" ")[0];
  const m = firstToken.match(OUTWARD_RE);
  return m ? m[0] : null;
}

/** Normalise a free-text area for substring matching. */
export function normaliseArea(input: string | null | undefined): string {
  return (input ?? "").trim().toLowerCase();
}

export interface LocationMatch {
  matched: boolean;
  reason: "remote" | "online" | "outward" | "area" | "none";
}

/**
 * Decide whether an opportunity location plausibly matches a user's area.
 * Remote/online opportunities always match (they have no location constraint).
 */
export function matchesLocation(
  opp: {
    is_remote?: boolean | null;
    is_online?: boolean | null;
    outward_code?: string | null;
    location_name?: string | null;
  },
  userArea: string | null | undefined,
): LocationMatch {
  if (opp.is_remote) return { matched: true, reason: "remote" };
  if (opp.is_online) return { matched: true, reason: "online" };

  const userOutward = extractOutwardCode(userArea);
  const oppOutward = (opp.outward_code ?? "").trim().toUpperCase() || null;

  if (userOutward && oppOutward && userOutward === oppOutward) {
    return { matched: true, reason: "outward" };
  }

  const userText = normaliseArea(userArea);
  const oppText = normaliseArea(opp.location_name);
  if (userText && oppText && (oppText.includes(userText) || userText.includes(oppText))) {
    return { matched: true, reason: "area" };
  }

  return { matched: false, reason: "none" };
}
