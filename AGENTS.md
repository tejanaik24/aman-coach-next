<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Aman Khurana Fitness Coach App (aman-coach-next)

## Live
https://aman-coach-next.vercel.app

## What Was Done (Session History)

### Session 1: Firebase → Supabase Migration
- Rewrote `src/lib/auth.ts`: signUp/signIn/signOut/getUserRole/getUserProfile/onAuthChange all call Supabase, no Firebase
- Deleted `src/lib/firebase.ts`, `src/lib/firestore.ts`, `src/lib/storage.ts`
- Rewrote `src/contexts/AuthContext.tsx`: uses `supabase.auth.onAuthStateChange`
- Rewrote `src/lib/store.ts`: re-exports from supabase-store
- Created `src/middleware.ts`: role-based route protection for /coach/* and /client/*
- Created `src/app/api/create-client/route.ts` + updated coach/clients/new page
- Fixed 15+ files: `user.uid` → `user.id`, `displayName` → `profile`
- Removed Google sign-up (deleted signInWithGoogle, callback route, Google button)
- Fixed signup duplicate key error: insert → upsert in signUp()
- Fixed email rate limit: set `mailer_autoconfirm=true` via Supabase Management API

### Session 2: WhatsApp Automation + n8n + Resend Email
- Installed Resend (`npm install resend`)
- Created `src/lib/email.ts`: 4 email functions (welcome, invoice, payment_reminder, plan_expiry) with black bg, purple CTA, AK FITNESS header
- Created 7 automation API routes under `src/app/api/automation/`: weekly-checkin, expiring-plans, pending-payments, send-email, mark-checkin-sent, dashboard-stats, send-manual-reminder
- Created 2 webhook receivers: checkin-submitted, payment-received
- Created 4 n8n workflow JSON files in `/n8n-workflows/`
- Updated create-client route: posts to NEW_CLIENT_WEBHOOK_URL, falls back to direct Resend email
- Updated coach/admin page: automations card with check-in count, expiring count, manual reminder button
- Added env vars to Vercel: AUTOMATION_SECRET, APP_URL, RESEND_API_KEY

### Session 3: Fixes + E2E Testing
- Re-set AUTOMATION_SECRET on Vercel (was empty)
- Re-added RESEND_API_KEY on Vercel
- Tested signup via Supabase Auth API
- Tested login as coach
- Tested create-client API (creates auth user + db row + triggers welcome flow)
- Tested weekly-checkin and dashboard-stats automation endpoints
- Tested send-email via Resend — delivered successfully
- Changed FROM to `onboarding@resend.dev` (need domain verify to use `noreply@akfitness.in`)
- Saved all API keys and process to this file

### Session 5: Trigger Fix + E2E Verification
- Fixed `on_auth_user_created` trigger via Supabase Dashboard SQL Editor
- Recreated with `public.profiles` schema prefix (was failing without it)
- Updated trigger to set `must_reset_password=true` for new clients, `false` for coaches
- Added `email TEXT` column to `clients` table (was missing, caused e2e test failure)
- Fixed `scripts/e2e-fixes.mjs`: removed invalid `name`/`email` fields from client insert
- **Result: e2e-fixes.mjs 4/4 PASS** — trigger creates profile, must_reset_password=true, login redirect works, password reset flips flag

### Session 4: Real Supabase Queries + Auth Routing + Login Overhaul

**Dashboard & Hook — Mock → Real Supabase:**
- `src/hooks/useCoach.ts`: Replaced mock data with real Supabase queries. Fetches clients (joined with profiles), then runs 4 parallel count/sum queries: activeClients, pendingCheckins, feesDue, monthlyRevenue.
- `src/app/(coach)/dashboard/page.tsx`: Replaced mock `fetchData` with real queries. Gets auth user, fetches client IDs, runs 5 parallel queries for recent check-ins (with client names), stats, and attention clients (active + no check-in in 14 days, filtered client-side).

**Auth Routing Fix — proxy.ts → middleware.ts:**
- Renamed `src/proxy.ts` → `src/middleware.ts` so Next.js actually picks it up. Was dead code before.
- Added `getRole()` helper: queries `profiles` table for role (not `user_metadata`).
- Middleware now reads role from `profiles` table for all route protection logic.
- Login page `redirectAfterLogin()`: also queries `profiles` table for role, not `user_metadata`. Coach → `/dashboard`, client → `/home`, no profile → `/onboarding`.

**Login Page Overhaul — Phone OTP → Email+Password:**
- `src/app/(auth)/login/page.tsx`: Removed phone OTP flow entirely. Single email+password form for all users (coach and client). Stripped from 258 lines to 111 lines.
- Removed: `Method` type, `phone`, `otp` state, `handleSendOtp`, `handleVerifyOtp`, `BackHeader` component, all phone-related JSX.
- Added: single `handleSubmit` that signs in with email+password, queries `profiles` table for role, redirects accordingly.

**Client Creation — Phone → Email+Password:**
- `src/app/api/clients/create/route.ts`: Changed from phone-based auth user creation to email+password. Accepts `email` (required) + `phone` (optional). Creates auth user with `email`, `password: "Welcome@123"`, `email_confirm: true`. Returns the default password in the response.
- `src/components/coach/AddClientModal.tsx`: Added required `email` field (labeled "used for login"). Phone is now optional. On success, shows toast with default password: `Client added! Password: Welcome@123`.

**Database Schema Discovery:**
- Live Supabase DB only had old `users` table — migration `001_initial_schema.sql` was never applied.
- Prepared 3 SQL blocks to run in Supabase SQL Editor:
  1. Full `001_initial_schema.sql` (creates profiles, clients, checkins, fees, etc.)
  2. Coach profile seed: `INSERT INTO profiles (id, name, role) VALUES ('640e5cd9-89e3-4303-9c6f-ff351276250d', 'Aman Khurana', 'coach')`
  3. `onboarding_forms` table (used by client onboarding questionnaire)

**Test Credentials:**
- Coach: `coach@akfitness.in` / `AmanCoach@2026` (auth id: `640e5cd9-89e3-4303-9c6f-ff351276250d`)
- Client 1: `tejasolryder24@gmail.com` / `Welcome@123` (auth id: `4920019d-6708-4011-afc4-d8b23f91902e`)
- Client 2: `test-e2e-62733@akfitness.in` / `Welcome@123` (auth id: `a27152a9-261b-4b93-8156-129e9d09c637`)

**Scripts Created:**
- `scripts/check-coach-profile.ts`: Checks/fixes coach profile in `profiles` table using service role key.

**Key Architectural Decisions:**
- Role is always read from `profiles` table, never from `user_metadata`.
- Default password for coach-created clients: `Welcome@123`.
- `onboarding_forms` table: stores client onboarding questionnaire as JSONB `data` column, upserts on `user_id`.
- Dev server runs on port 3001.

## Credentials
- **All secrets:** see `.env.local` — never commit secrets to this file

## Supabase
- **Project ref:** muuegtbyaehlrfqjluqz
- **Project name:** aman coach
- **URL:** https://muuegtbyaehlrfqjluqz.supabase.co
- **Anon key:** see `.env.local` → NEXT_PUBLIC_SUPABASE_ANON_KEY
- **Service role key:** see `.env.local` → SUPABASE_SERVICE_ROLE_KEY

## Vercel (Production)
- **Project:** tejasolryder24-4493s-projects/aman-coach-next
- **AUTOMATION_SECRET:** see `.env.local` → AUTOMATION_SECRET
- **RESEND_API_KEY:** see `.env.local` → RESEND_API_KEY
- **APP_URL:** https://aman-coach-next.vercel.app

## Resend
- **API key:** see `.env.local` → RESEND_API_KEY
- **FROM (current):** AK Fitness <onboarding@resend.dev>
- **Needed:** Verify domain `akfitness.in` in Resend (add DNS records), then change FROM to `AK Fitness <noreply@akfitness.in>` in `src/lib/email.ts`

## Email Types (src/lib/email.ts)
- `sendWelcomeEmail` — new client welcome
- `sendInvoiceEmail` — monthly invoice
- `sendPaymentReminderEmail` — overdue payment
- `sendPlanExpiryEmail` — plan about to expire

## Automation Endpoints
All protected by `x-automation-secret` header (value in `.env.local` → AUTOMATION_SECRET):
- `POST /api/automation/send-email` — send any email type
- `POST /api/automation/weekly-checkin` — list active clients for check-in prompts
- `POST /api/automation/expiring-plans` — get expiring plans
- `POST /api/automation/pending-payments` — get pending payments
- `POST /api/automation/mark-checkin-sent` — mark check-in as sent
- `POST /api/automation/send-manual-reminder` — manual payment reminder
- `GET /api/automation/dashboard-stats` — public dashboard stats (no auth)

## n8n Workflows
Import from `/n8n-workflows/`:
- `weekly-checkin.json`
- `payment-reminder.json`
- `plan-expiry.json`
- `new-client-welcome.json`

## Coach Admin User
- **ID:** b1ea3c60-b40f-4187-9f19-de0de703cfe3
- **Role:** coach
- **Status:** active
