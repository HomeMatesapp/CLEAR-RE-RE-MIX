# Clear Routes

UK career pathway advisor. Generates step-by-step routes into new careers, with funded training options, real provider names, and weekly accountability plans.

Live at: https://clearroutes.co.uk

## What it does

Clear Routes turns a short intake quiz (or a direct role search) into a personalised UK career pathway. The pathway itself is free to explore. A one-off £49 unlock gives users the full toolkit: the role-specific Insider Guide PDF, a 22-week Weekly Checklist calibrated to their available hours, and weekly accountability emails.

## Tech stack

- Frontend: React 18, TypeScript, Vite, Tailwind, shadcn/ui
- Backend: Supabase (Postgres + Auth + Edge Functions)
- AI: Anthropic Claude (`claude-opus-4-7` for pathway generation, Insider Guide content, and weekly plan generation)
- Payments: Stripe
- Email: Resend
- Analytics: PostHog
- Hosting: Lovable (frontend), Supabase (backend, EU region)

## Project structure

- `/src/pages` — top-level routes
- `/src/components` — shared UI components
- `/src/hooks` — custom React hooks
- `/src/lib` — utility functions and adapters
- `/src/integrations/supabase` — Supabase client and generated types
- `/supabase/functions` — edge functions (`generate-pathway`, `generate-pdf-content`, `generate-weekly-plan`, `process-payment`, `verify-payment`, `stripe-webhook`, `send-email`, `fetch-job-count`, `process-weekly-emails`)
- `/supabase/migrations` — database schema migrations

## Edge functions

- `generate-pathway` — takes a role + optional quiz answers, returns a pathway JSON via Claude
- `generate-pdf-content` — generates the Insider Guide content
- `generate-weekly-plan` — generates the 22-week checklist
- `process-payment` — creates a Stripe checkout session
- `verify-payment` — verifies a Stripe payment and unlocks paid features
- `stripe-webhook` — handles Stripe webhook events for payment confirmation
- `send-email` — sends transactional emails via Resend
- `fetch-job-count` — fetches live UK job count for a role (Reed API)
- `process-weekly-emails` — cron-triggered, sends weekly accountability emails

## Environment variables

- `VITE_SUPABASE_URL` — Supabase project URL (frontend)
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase anon/publishable key (frontend)
- `VITE_SUPABASE_PROJECT_ID` — Supabase project ref (frontend)
- `ANTHROPIC_API_KEY` — Anthropic API key for Claude calls (Supabase secret)
- `STRIPE_SECRET_KEY` — Stripe secret key for checkout sessions (Supabase secret)
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret (Supabase secret)
- `RESEND_API_KEY` — Resend API key for transactional email (Supabase secret)
- `RESEND_FROM_EMAIL` — verified sender address used by `send-email` (Supabase secret)
- `POSTHOG_KEY` — currently hardcoded in `src/lib/posthog.ts`; should be moved to env

## Local development

```bash
npm install
npm run dev
```

The app runs at http://localhost:5173. Edge functions run on Supabase and are not run locally — changes to edge functions auto-deploy when pushed via Lovable.

## Testing

```bash
npm run test
```

Currently has minimal test coverage. Integration tests for the core funnel (quiz → pathway → signup → payment) are a known gap.

## Deployment

Frontend deploys via Lovable on push. Edge functions deploy via Supabase. Domain (clearroutes.co.uk) is managed via Namecheap with DNS pointing at Lovable.

## Known issues / tech debt

- Several pages use `as any` to bypass Supabase type checks; types should be regenerated
- `Pathway.tsx` and `WeeklyPlan.tsx` are oversized and should be decomposed
- `src/lib/pathwayAdapter.ts` is over 270 lines and should be split (schema / transforms / main)
- Test coverage is minimal — only one example test exists
- PostHog API key is hardcoded in `src/lib/posthog.ts` and should be moved to env
