# Release 2 — launch hardening

Date: 29 June 2026

## Included

- Explicit opt-in analytics banner and privacy-page preference controls.
- PostHog remains uninitialised before consent; session recording is disabled.
- Signed-in analytics uses only the internal user ID, never the account email.
- Error analytics no longer sends stack traces or error messages.
- Signup first name is stored in auth metadata and copied into `user_profiles` after confirmation.
- Password-reset links use the current trusted application origin rather than a hardcoded production URL.
- Frontend Supabase configuration is reduced to one project and validated at startup.
- Browser-facing edge functions share a production/preview/local origin allowlist.
- Public opportunity reads are limited to active, verified, non-seed and non-expired records in both the client query and row-level security.
- Pending and session Reality-check records expire and exclude notes plus unnecessary free-text/sensitive fields.
- Saved database snapshots contain only matching fields and compact result summaries.
- README, FAQ, How It Works, Privacy, Terms and Methodology now describe the deterministic engine accurately.

## Required deployment steps

1. Apply `supabase/migrations/20260629210000_launch_hardening.sql`.
2. Deploy all four edge functions and the new `supabase/functions/_shared/cors.ts` helper.
3. Confirm the deployment environment contains the three matching `VITE_SUPABASE_*` values.
4. Add `VITE_POSTHOG_KEY` only where analytics should be available; analytics still requires visitor consent.
5. Confirm Supabase Auth redirect allowlists include the production domain, approved Lovable preview domains and local development URLs used by the team.
6. Deploy the frontend.
7. Verify that any real opportunity intended for display has `status = 'active'`, `is_seed = false`, a non-null `verified_at`, and no past deadline.

## Validation completed

- TypeScript: clean (`npx tsc --noEmit -p tsconfig.app.json`).
- Unit tests: 97 passing across 11 test files.
- Production build: successful.
- ESLint: zero errors; 25 existing warnings remain, mainly Fast Refresh file-structure warnings and older hook-dependency warnings.

## Deferred

- One-question-at-a-time Reality-check form refactor.
- Route-level code splitting; the production bundle still raises Vite's over-500-kB chunk warning.
- Full browser QA of email confirmation, password reset and authenticated opportunity flows against the deployed backend.
