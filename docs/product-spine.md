# Clear Routes — Product Spine

> **Positioning:** Clear Routes helps people reality-check career routes before
> they commit time or money.

This document is the canonical description of the v1 product spine. If you are
adding a feature, it should either strengthen one of the steps below or be
deferred.

## Core user journey

```
Browse roles ──► Reality-check on a role ──► See judgement
                                                │
                                                ▼
                                  "Save to My Career Decisions"
                                                │
                          ┌─────────────────────┴─────────────────────┐
                          ▼                                           ▼
                  (logged-out)                                  (logged-in)
                  Sign up / log in                          Save immediately
                          │                                           │
                          ▼                                           ▼
                  Land on /my-decisions ◄────────────────────────────┘
                          │
                          ▼
               Decision Profile prefills the next Reality-check
```

Sign-up sits **after** the user has received value (a judgement they want to
keep). This is deliberate — anonymous users must always be able to run a
Reality-check.

## What Reality-check does

Reality-check is the core judgement engine. The user answers a short set of
constraint questions (starting point, income need, weekly hours, budget, area,
commute flexibility, free-text notes), and the app returns a structured
judgement for one specific role:

- **Overall verdict** — Realistic / Realistic but hard / Long shot / Probably
  not for you.
- **Best route** for this user, with estimated time, likely cost, main
  difficulty, and confidence.
- **Backup route** with its trade-off.
- **Route to avoid** with the reason it is risky for this profile.
- **Local realism rating** (approximate — see guardrails).
- **First 3 moves** the user can take this week.

It is a *decision tool*, not a careers-advice chatbot. No motivational fluff.

## What saved decisions are

When the user clicks "Save to My Career Decisions", we persist a row in
`saved_decisions` containing:

- The role identity (id, slug, name).
- An **immutable snapshot** of the answers they gave (`input_snapshot`).
- An **immutable snapshot** of the judgement they received (`result_snapshot`).
- Denormalised summary fields (verdict, best route title, first move, etc.) so
  `/my-decisions` can render the list without parsing JSON.

Snapshots are deliberately frozen. If the user re-runs Reality-check later,
they get a new saved decision — the old judgement is not rewritten. This lets
the user see how their thinking has changed over time.

## What the Decision Profile is

`decision_profiles` stores the user's reusable constraints — the answers that
tend to be stable across roles (area, starting point, income need, weekly
hours, budget band, commute flexibility). There is exactly one row per user
(`UNIQUE(user_id)`), updated via `upsert(..., { onConflict: "user_id" })`.

The Decision Profile is used to **prefill** future Reality-checks so the
product feels like it remembers the user's situation. If the user edits a
prefilled field and confirms, the profile updates. If they decline, the
profile stays as-is.

## Decision Profile vs saved decision snapshot

| | Decision Profile | Saved decision snapshot |
|---|---|---|
| Cardinality | 1 per user | Many per user |
| Mutability | Mutable | Immutable |
| Purpose | Prefill future Reality-checks | Preserve a past judgement |
| Scope | User's general constraints | One judgement on one role |
| Storage | `decision_profiles` | `saved_decisions` |

A saved decision is a *photograph*. The Decision Profile is the *current
address*.

## Why sign-up happens after value

Asking for an account before the user has seen a Reality-check would
collapse the funnel and break the "try it anonymously" promise. The
sign-up gate sits at "Save to My Career Decisions" because by that point
the user has a judgement they consider worth keeping.

While logged-out, an unsaved decision is **stashed in localStorage**
(`cr_pending_decision`). After sign-up/login, it is flushed once into
`saved_decisions` and cleared.

## What the AI layer is allowed / not allowed to do

See [reality-check-guardrails.md](./reality-check-guardrails.md) for the
authoritative rules. In short:

**Allowed**

- Judge whether each pathway fits the user's stated constraints.
- Pick a best / backup / avoid route from the supplied pathway text.
- Translate national patterns into a rough local realism rating.
- Suggest concrete first moves that name real, well-known portals
  (UCAS, NHS Jobs, Find an Apprenticeship, etc.).

**Not allowed**

- Inventing specific providers, universities, employers, or trusts.
- Claiming live local vacancy data.
- Generic strawman "routes to avoid".
- Motivational language ("journey", "passion", "exciting").

## Known v1 limitations

- Local realism is national-pattern-based, not vacancy-feed-based.
- One Decision Profile row per user — multi-context profiles ("considering
  for me" vs "for my partner") are out of scope.
- Saved decisions cannot be edited; only re-run.
- No comparison view across saved decisions yet.
- No paid tier or payment integration.
- No collaborative / shared decisions.
- Reality-check output quality depends on the role's authored pathway text.
