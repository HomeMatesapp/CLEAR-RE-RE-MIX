# Clear Routes

Reality-check a UK career route before committing time or money. Clear Routes combines reviewed role data with a deterministic readiness engine to show a readiness state, the most suitable route, a safer fallback, the main blocker, and a concrete next action.

Live at: https://clearroutes.co.uk

## What it does

- **Reality-check** — a rules-based route judgement for a reviewed role, based on the user's situation.
- **My Career Decisions** — saved route checks users can revisit and compare.
- **Decision Profile** — saved constraints such as hours, budget, qualifications and region.
- **Support matching** — surfaces UK-funded programmes that may be relevant to a Decision Profile.
- **Role pages** — curated role information covering pathways, salary ranges, competition, AI exposure and providers.
- **Verified opportunities** — only active, non-seed records with a verification timestamp are publicly shown.

The product is free. There is no paid tier and no checkout.

## Tech stack

- Frontend: React 18, TypeScript, Vite, Tailwind, shadcn/ui
- Backend: Supabase-compatible Postgres, Auth and Edge Functions through Lovable Cloud
- Reality-check: deterministic four-state readiness engine, mirrored in the client and edge function
- Analytics: PostHog, disabled until explicit consent
- Hosting: Lovable frontend and EU-region backend

## Project structure

- `/src/pages` — top-level routes
- `/src/components` — shared UI components
- `/src/components/role` — role-page and Reality-check components
- `/src/lib/reality-check` — deterministic readiness, profile mapping and source logic
- `/src/lib/saved-decisions.ts` — privacy-minimised saved-decision helpers
- `/src/hooks` — custom React hooks
- `/src/integrations/supabase` — backend client and generated types
- `/supabase/functions` — edge functions
- `/supabase/migrations` — database schema and access-policy migrations

## Edge functions

- `reality-check` — validates a role and answer payload, then returns the deterministic readiness result
- `search-roles` — role search for the homepage
- `get-role` — role page payload
- `fetch-job-count` — cached UK job-count lookup using the Reed API

All browser-facing functions use an origin allowlist rather than wildcard CORS.

## Environment variables

Copy `.env.example` to `.env` for local development.

- `VITE_SUPABASE_URL` — active backend URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` — browser-safe publishable key
- `VITE_SUPABASE_PROJECT_ID` — must match the project reference in the URL
- `VITE_POSTHOG_KEY` — optional; analytics remains off until the visitor explicitly agrees
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `REED_API_KEY` — backend-only edge-function secrets managed by the deployment platform

The client fails fast when the URL and project ID do not match.

## Local development

```bash
npm install
npm run dev
```

The app runs at http://localhost:5173.

## Testing

```bash
npm test
npm run build
```

Vitest covers readiness classification, profile mapping, source selection, role helpers, opportunity matching and saved-decision privacy behaviour.

## Data and privacy controls

- PostHog is not initialised and no analytics storage is created before consent.
- Authenticated analytics uses the internal user ID only; email addresses are not sent to PostHog.
- Pending browser decisions expire after 24 hours and exclude notes and free-text background details.
- Session Reality-check answers expire after two hours and omit notes plus non-essential answer fields.
- Database snapshots contain only fields needed for matching and compact result summaries.
- Public opportunity reads are restricted by row-level security to active, verified, non-seed and non-expired records.

## Known technical debt

- Some generated Supabase types still require narrow casts and should be regenerated after the latest migration is deployed.
- `RolePage.tsx` remains oversized and should be decomposed.
- End-to-end coverage of signup confirmation and the complete Reality-check-to-save flow should be expanded.
