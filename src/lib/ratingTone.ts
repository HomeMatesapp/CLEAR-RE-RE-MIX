/**
 * Central rating → tone map.
 *
 * Tone encodes whether a rating value is GOOD or BAD NEWS for someone considering
 * the career — NOT the literal word. "High" is good for Demand, bad for Competition.
 *
 * To add a new rating type later (e.g. "job_security"), register it in `ratingKinds`
 * below. Anything not registered renders neutral.
 */

export type Tone = "good" | "mixed" | "bad" | "neutral";

export type RatingKind =
  | "demand"
  | "competition"
  | "pay"
  | "ai_risk"
  /* Add new rating kinds here — e.g. "job_security" */;

/** Map of value (lowercase, contains-match) → tone, per rating kind. */
const ratingKinds: Record<RatingKind, Array<{ match: string; tone: Tone }>> = {
  // Good = high, bad = low
  demand: [
    { match: "very high", tone: "good" },
    { match: "growing",   tone: "good" },
    { match: "high",      tone: "good" },
    { match: "moderate",  tone: "mixed" },
    { match: "medium",    tone: "mixed" },
    { match: "stable",    tone: "mixed" },
    { match: "low",       tone: "bad" },
    { match: "declining", tone: "bad" },
  ],
  // INVERTED: low competition = good
  competition: [
    { match: "extreme",  tone: "bad" },
    { match: "very high",tone: "bad" },
    { match: "high",     tone: "bad" },
    { match: "moderate", tone: "mixed" },
    { match: "medium",   tone: "mixed" },
    { match: "low",      tone: "good" },
  ],
  // Good = high pay, bad = low pay
  pay: [
    { match: "very high",tone: "good" },
    { match: "high",     tone: "good" },
    { match: "moderate", tone: "mixed" },
    { match: "medium",   tone: "mixed" },
    { match: "low",      tone: "bad" },
  ],
  // INVERTED: low AI risk = good
  ai_risk: [
    { match: "very high",tone: "bad" },
    { match: "high",     tone: "bad" },
    { match: "moderate", tone: "mixed" },
    { match: "medium",   tone: "mixed" },
    { match: "low",      tone: "good" },
    { match: "minimal",  tone: "good" },
  ],
};

/** Resolve the tone for a given rating kind + value. */
export function toneFor(kind: RatingKind, value: string | null | undefined): Tone {
  if (!value) return "neutral";
  const v = value.toLowerCase();
  for (const { match, tone } of ratingKinds[kind]) {
    if (v.includes(match)) return tone;
  }
  return "neutral";
}

/** Soft-tint class for a tone. ~7px/14px padding, rounded, weight 500. */
export function toneClass(tone: Tone): string {
  switch (tone) {
    case "good":
      // bg ~#e6efe2, text ~#2d6a3e
      return "bg-[#e6efe2] text-[#2d6a3e]";
    case "mixed":
      // bg ~#fdebd3, text ~#9a5b08
      return "bg-[#fdebd3] text-[#9a5b08]";
    case "bad":
      // bg ~#f7dcdc, text ~#b91c1c
      return "bg-[#f7dcdc] text-[#b91c1c]";
    default:
      return "bg-muted text-muted-foreground";
  }
}

/** Convenience: pill className for a rating value. */
export function ratingPillClass(kind: RatingKind, value: string | null | undefined): string {
  return `inline-flex items-center rounded-full text-xs font-medium px-3.5 py-[7px] ${toneClass(toneFor(kind, value))}`;
}
