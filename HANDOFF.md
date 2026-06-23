# Aman Coach PWA — End-to-End Handoff Report
**Date:** 2026-06-23 | **Branch:** main | **Latest commit:** cb70a2d

---

## Live URLs

| What | URL |
|------|-----|
| **Production app** | https://aman-coach-next.vercel.app |
| **Coach login** | https://aman-coach-next.vercel.app/auth/login |
| **Coach admin panel** | https://aman-coach-next.vercel.app/coach/admin |
| **Client dashboard** | https://aman-coach-next.vercel.app/client/dashboard |
| **Public homepage** | https://aman-coach-next.vercel.app |

---

## Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Coach (Aman) | aman@akfitness.in | AmanCoach@2024 |
| Test client | (create via /coach/clients/new) | |

---

## Infrastructure

### Supabase
- **Project ref:** muuegtbyaehlrfqjluqz
- **URL:** https://muuegtbyaehlrfqjluqz.supabase.co
- **Anon key:** eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11dWVndGJ5YWVobHJmcWpsdXF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MDcyMDcsImV4cCI6MjA5NjQ4MzIwN30.pGDD68mdl_OK2yrdRKq03S_gmoS5KZ6FBRxqHiDbQYo
- **Service role key:** eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11dWVndGJ5YWVobHJmcWpsdXF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDkwNzIwNywiZXhwIjoyMDk2NDgzMjA3fQ.QlD5IfUDeqqJHnmrF1Vhi3NUxn7V5h6AKQyKml2Hv6g

### Vercel
- **Project:** tejasolryder24-4493s-projects/aman-coach-next
- **AUTOMATION_SECRET:** akfitness_automation_secret_2026
- **RESEND_API_KEY:** re_T1zzrTqm_5KYsydGWttAsKWqmLE7NVTQP
- **APP_URL:** https://aman-coach-next.vercel.app

### Resend (Email)
- **FROM (current):** AK Fitness <onboarding@resend.dev>
- **TODO:** Verify domain `akfitness.in` in Resend dashboard → change FROM to `AK Fitness <noreply@akfitness.in>`

---

## Tech Stack

- **Framework:** Next.js (App Router), React 19, TypeScript strict
- **Auth + DB:** Supabase (fully migrated from Firebase — Firebase is 100% gone)
- **Styling:** Tailwind v4 — always use explicit hex in brackets e.g. `bg-[#FFB800]`, never color shortcuts
- **Animation:** `motion/react` — NOT `framer-motion`
- **Package manager:** npm (not uv — that's for other projects)
- **Deploy:** Vercel CLI (`npx vercel deploy --prod --yes`)

---

## Design Rules — NEVER BREAK THESE

- Background: `#000000`
- Card: `#111111`, Card hover: `#1A1A1A`
- Gold (primary): `#FFB800`
- Gold (dark): `#B28000`
- Gold (bright): `#FFD200`
- Border: `rgba(255, 184, 0, 0.25)`
- Headings: Bebas Neue, ALL CAPS, `letter-spacing: 0.05em`
- Body font: Barlow
- All major animations: `motion/react` with spring physics — no raw CSS transitions

---

## What Is Built (All 36 Routes)

### Public
- `/` — Homepage (has Aman hero images, services, CTA)
- `/about` — About Aman
- `/services` — Service listings
- `/transformations` — Before/after showcase (currently placeholder data)
- `/contact` — Contact form

### Auth
- `/auth/login` — Email/password login (Supabase)
- `/auth/signup` — New user signup

### Coach Panel (`/coach/*`)
- `/coach/admin` — Main dashboard: stats, clients, leads, automation
- `/coach/clients` — Client list
- `/coach/clients/[id]` — Client detail: overview, checkins, payments, plans, notes tabs
- `/coach/clients/new` — Add new client
- `/coach/checkins` — Review submitted checkins
- `/coach/payments` — Payment records
- `/coach/plans` — Workout/diet plan builder
- `/coach/leads` — Lead management
- `/coach/messages` — Messaging
- `/coach/analytics` — Analytics view
- `/coach/appointments` — Appointment scheduler
- `/coach/availability` — Availability settings
- `/coach/broadcast` — Broadcast messages
- `/coach/forms` — Form submissions viewer
- `/coach/todo` — Coach to-do list

### Client Panel (`/client/*`)
- `/client/dashboard` — Client home: plan progress, quick actions, checkin summary
- `/client/workout` — Workout plan viewer
- `/client/diet` — Diet plan viewer
- `/client/checkin` — Weekly check-in (5-step form)
- `/client/onboarding` — Onboarding questionnaire (8-step form)
- `/client/onboarding/antenatal` — Antenatal questionnaire
- `/client/habits` — Daily habits tracker
- `/client/nutrition` — Meal logging
- `/client/progress` — Progress tracking
- `/client/payments` — Payment history
- `/client/profile` — Profile settings
- `/client/schedule` — Book session
- `/client/messages` — Message coach
- `/client/wellness` — Wellness metrics
- `/client/more` — More menu

---

## What Is Working

- Auth: login, signup, logout, role-based routing (coach vs client)
- Middleware: cookie-based route protection (zero network calls, no timeout)
- Coach admin panel loads
- Create new client (API route: `POST /api/create-client`)
- Email via Resend (welcome, invoice, reminder, expiry)
- Automation API routes (all 7 endpoints under `/api/automation/`)
- Supabase real-time notifications (NotificationBell component)
- PWA manifest + service worker file exists (`public/sw.js`)
- 8-step onboarding form UI built
- 5-step weekly check-in form UI built
- Antenatal form UI built

---

## Known Issues / What Still Needs Work

### CRITICAL (fix before showing to Aman)
1. **`onboarding_forms` table missing in Supabase** — the form exists in the UI but saving will fail. SQL to run in Supabase SQL editor:
   ```sql
   CREATE TABLE IF NOT EXISTS onboarding_forms (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     user_id UUID REFERENCES users(id),
     form_type TEXT DEFAULT 'standard',
     data JSONB,
     status TEXT DEFAULT 'pending',
     created_at TIMESTAMPTZ DEFAULT now(),
     submitted_at TIMESTAMPTZ,
     reviewed_at TIMESTAMPTZ
   );
   ```

2. **Progress photos not saved** — checkin form collects photos but `addCheckin()` in `supabase-store.ts` doesn't include photos in the Supabase insert. Photos go into state but never reach the database.

3. **Workout week selector does nothing** — week tabs in `/client/workout` exist but all weeks show identical data. Either remove the week tabs or wire them properly.

4. **Diet plan shows hardcoded meal names** — `/client/diet` shows "Breakfast, Lunch, Dinner" hardcoded instead of reading from the actual diet plan data.

5. **PDF download button on diet page doesn't work** — button exists, jsPDF is installed, but no actual PDF generation code.

### HIGH PRIORITY
6. **Transformations page is all placeholder** — `/transformations` has fake client names, fake results, fake photos. Needs real before/after photos from Aman.

7. **n8n workflows never run** — 4 workflow JSON files exist in `/n8n-workflows/` but n8n is not set up anywhere. These need to either be imported into an n8n instance or replaced with Supabase Edge Functions (recommended).

8. **Push notifications incomplete** — `public/sw.js` exists and `PWAInstallPrompt.tsx` tries to register it, but the service worker has no push event handler and there is no `push_subscriptions` table in Supabase.

9. **Compliance dashboard missing** — planned in Phase 4 but not built yet. Clients and coaches both need weekly compliance score (diet + workout + checkin + habits = 0-100%).

10. **Client notes don't persist** — coach notes in `/coach/clients/[id]` save locally in state only, not to Supabase.

### MEDIUM
11. **Resend FROM address** — currently `onboarding@resend.dev`. Verify `akfitness.in` domain in Resend to use `noreply@akfitness.in`.
12. **Energy scale inconsistency** — check-in stores energy 1–5, some displays show "/10". Fix to "/5" everywhere.
13. **No real client data** — app works but Aman hasn't added any actual clients yet.

---

## Mistakes Made This Session — Do Not Repeat

### Mistake 1: Leaving 111 files uncommitted across multiple sessions
**What happened:** Multiple sessions of work (Firebase→Supabase migration, form builds, etc.) were never committed to git. When OpenCode was given access, it read git history and thought the app was still on Firebase. It re-wrote code based on the old Firebase state.
**Rule going forward:** Commit after every session. Every single time. `git add -A && git commit -m "..."`. Never leave work floating.

### Mistake 2: Middleware using Supabase SSR client on Edge Runtime
**What happened:** Three rounds of middleware fixes. First used `getUser()` (network call to Supabase auth servers). Then switched to `getSession()` (still initializes full Supabase SSR client). Both caused 504 MIDDLEWARE_INVOCATION_TIMEOUT because Edge Runtime has a 1.5s limit and cold starts with the Supabase client exceeded it.
**Correct approach:** On Edge Runtime middleware, never import Supabase. Just check for the cookie directly:
```typescript
const hasSession = request.cookies.has(`sb-${projectRef}-auth-token`)
```
**The Supabase auth cookie name is always:** `sb-{project-ref}-auth-token`

### Mistake 3: Generating Invalid Dates crashing React
**What happened:** `mapUser()` in `supabase-store.ts` did `new Date(row.start_date || row.created_at)`. When both were null, this produced `new Date("")` = Invalid Date. `differenceInDays()` from date-fns throws `RangeError: Invalid time value` on Invalid Date. The crash triggered ErrorBoundary showing "Something went wrong".
**Rule going forward:** Always guard date creation:
```typescript
// Safe pattern:
const d = row.start_date ? new Date(row.start_date) : null
// Never: new Date(value || fallback) — if value is "" this breaks
```

### Mistake 4: Passing OpenCode a vague prompt
**What happened:** The prompt given to OpenCode didn't clearly state that the app is 100% on Supabase (not Firebase). OpenCode partially re-introduced Firebase patterns.
**Rule going forward:** Any prompt to any AI (OpenCode, another Claude session) must start with: "This app is fully on Supabase. Firebase is completely removed. Do not introduce any Firebase code."

### Mistake 5: Not verifying Vercel deployment SHA matches latest commit
**What happened:** Vercel sometimes runs a stale deployment. After pushing code, always verify the production deployment's git SHA matches `git log --oneline -1`.
**How to check:** `npx vercel ls` → look at the top deployment's age. If it's older than your last commit, re-deploy: `npx vercel deploy --prod --yes`

---

## File Map — Most Important Files

| File | What It Does |
|------|-------------|
| `src/middleware.ts` | Route protection — cookie check only, zero Supabase, zero network |
| `src/contexts/AuthContext.tsx` | Global auth state, role, profile |
| `src/hooks/useAuth.ts` | Hook to access auth context |
| `src/hooks/useCoach.ts` | Hook: fetches clients, checkins, payments, leads, analytics for coach |
| `src/hooks/useClient.ts` | Hook: fetches client's own data, checkins, payments |
| `src/lib/supabase-store.ts` | ALL Supabase queries live here (500+ lines) |
| `src/lib/auth.ts` | login, signup, logout, changePassword |
| `src/lib/email.ts` | 4 Resend email functions |
| `src/app/api/automation/` | 7 automation API endpoints |
| `src/app/coach/admin/page.tsx` | Coach dashboard page |
| `src/app/client/dashboard/page.tsx` | Client dashboard page |
| `supabase/migration.sql` | Main DB schema (run this in Supabase SQL editor for fresh setup) |

---

## Supabase Tables (Currently in DB)

| Table | Purpose |
|-------|---------|
| `users` | All users (coach + clients), with role, plan, status, dates |
| `checkins` | Weekly check-in submissions |
| `payments` | Payment records |
| `leads` | Prospective client leads |
| `diet_plans` | Coach-assigned diet plans |
| `workout_plans` | Coach-assigned workout plans |
| `habits` | Assigned daily habits per client |
| `habit_logs` | Daily habit completion logs |
| `notifications` | In-app notification queue (drives NotificationBell) |
| `meal_logs` | Meal logging by clients |
| `wearable_metrics` | Step count, manual health metrics |
| **`onboarding_forms`** | **MISSING — run the CREATE TABLE SQL above** |

---

## What To Build Next (Priority Order)

1. **Run `onboarding_forms` table SQL** in Supabase (5 min, unblocks forms)
2. **Fix progress photos** in `addCheckin()` — add photos array to Supabase insert
3. **Fix workout week selector** — remove broken tabs, show clean day view
4. **Fix diet plan** — read from actual plan data, fix PDF download
5. **Transformations page** — get real before/after photos from Aman, replace placeholder
6. **Compliance dashboard** — weekly score 0-100% for both coach and client views
7. **Supabase Edge Functions** — replace n8n with built-in Supabase cron for reminders
8. **Client notes persistence** — wire save button to Supabase `client_notes` table
9. **Resend domain verification** — change FROM to `noreply@akfitness.in`

---

## How To Deploy

```bash
cd "c:\claude code\aman-coach-next"
npm run build                          # must pass with zero errors
git add -A
git commit -m "your message"
npx vercel deploy --prod --yes         # deploys to https://aman-coach-next.vercel.app
```

## How To Check If Correct Code Is Live

```bash
npx vercel ls    # top entry should be <1 min old after your deploy
```

---

## Automation Endpoints (All Require Header)

All need header: `x-automation-secret: akfitness_automation_secret_2026`

| Endpoint | Method | What It Does |
|----------|--------|-------------|
| `/api/automation/dashboard-stats` | GET | Coach dashboard stats (no auth needed) |
| `/api/automation/weekly-checkin` | POST | List clients who need check-in |
| `/api/automation/expiring-plans` | POST | List clients with expiring plans |
| `/api/automation/pending-payments` | POST | List clients with pending payments |
| `/api/automation/send-email` | POST | Send any email type via Resend |
| `/api/automation/mark-checkin-sent` | POST | Mark check-in reminder as sent |
| `/api/automation/send-manual-reminder` | POST | Send manual payment reminder |
