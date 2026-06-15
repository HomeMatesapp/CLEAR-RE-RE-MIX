# Reality-check — AI Guardrails

These rules govern the AI layer behind the Reality-check engine
(`supabase/functions/reality-check`). They exist because the tool's value
collapses as soon as users notice fabricated specifics. Treat this file as
the source of truth; the edge function prompt must enforce every rule below.

## 1. Do not invent providers, employers, trusts, or colleges

The model must only name a specific provider, university, employer,
NHS trust, college, or apprenticeship sponsor if that name appears in
the supplied role data (`key_employers`, pathway text, etc.).

When no specific name is supplied, use **generic descriptions**:

- "an NHS trust in your area"
- "a local FE college offering the Level 3"
- "a regional employer running a degree apprenticeship"

## 2. Do not claim live local availability

The app does not have a live vacancy feed. The model must not say things
like "there are currently 12 openings near you" or "this trust is hiring
now". Local realism is a *pattern-based estimate*, not a live signal.

Every `localRealism.summary` must read as approximate — e.g. "Based on
national patterns, demand in your area is usually…". The phrase
"approximate, based on national patterns" (or equivalent) is mandatory.

## 3. Local realism is approximate

Until we have structured location data, the `localRealism.rating`
(`strong` / `mixed` / `weak`) is a national-trend hint scoped to the
user's stated area. It must not be presented as a live local stat.

## 4. Route to avoid must be plausible, not a strawman

The "route to avoid" must be a route the user might *realistically be
tempted by* given their profile. Examples:

- A career-changer with savings → avoid a full-time self-funded BSc.
- A school-leaver with no budget → avoid an unfunded private bootcamp.

It must **not** be an obviously absurd path that no one would consider
(e.g. "avoid becoming a nurse by joining the circus"). Strawmen waste
the user's attention and signal an untrustworthy tool.

For clinical / regulated roles, do not name a real unregulated provider
as the avoid route — describe the category instead.

## 5. Constraints must heavily influence route choice

`incomeNeed`, `budget`, and `weeklyHours` are the dominant inputs. The
recommended `bestRoute` must visibly change when these change:

- `incomeNeed = "need_income"` → favour earn-while-you-learn routes
  (apprenticeships, on-the-job training).
- `budget = "zero"` or `"under_500"` → exclude self-funded full-time
  degrees from `bestRoute`.
- `weeklyHours = "0_5"` → exclude routes that require sustained weekly
  study commitments.

If two profiles for the same role produce the same `bestRoute.title`
despite materially different constraints, the prompt is too weak.

## 6. First moves must be concrete and actionable this week

Each entry in `firstMoves` must start with a concrete verb the user
can act on within seven days:

- `search`, `apply`, `check`, `contact`, `register`, `download`,
  `book`, `email`.

Forbidden:

- "Research the role."
- "Think about whether this is right for you."
- "Explore your options."

Where a well-known portal exists, name it (UCAS, NHS Jobs, Find an
Apprenticeship, Gov.uk Find a course). Do not invent portal names.

## 7. Prefer supplied pathway text over invented pathways

The role row contains `pathway_school_leaver`, `pathway_graduate`,
`pathway_adjacent`, and `pathway_no_background`. The model must base
`bestRoute` and `backupRoute` on whichever supplied pathway matches the
user's starting point (see `preferredPathway` in
`src/lib/reality-check/recommendRoute.ts`).

If the supplied pathway text contradicts the model's instinct, the
supplied text wins. If the supplied text is empty, the model may fall
back to a generic description but must not fabricate specifics.

## 8. No motivational fluff

Banned vocabulary in any field of the JSON response:

- "journey", "passion", "exciting", "amazing", "incredible",
  "embrace", "unlock", "dream", "thrive".

The voice is that of a clinical decision tool, not a careers coach.

## 9. Output shape is non-negotiable

The function must return exactly the `RealityCheckResult` shape defined
in `src/lib/reality-check/types.ts`. Extra prose outside the JSON or
missing fields will break the UI.

---

### When in doubt

If the model is uncertain whether a fact is supplied or invented, it
must use a generic description. Specificity that the user can disprove
in one Google search is worse than generic accuracy.
