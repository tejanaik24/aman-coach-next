# AK Fitness — Product Requirements Document (PRD)
# Version: 1.0 | Date: 2026-07-24

---

## CRITICAL DECISIONS LOCKED

| Item | Decision |
|------|----------|
| Photos | Claude Code lists all photos first, Teja approves placement |
| WAHA + n8n | Local server (same as Movement Fitness setup) |
| UPI | Placeholder for now, add later |
| Video calls | Booking = voice/chat call, not video |
| AN-PN form | Separate client type with own questionnaire |

---

## PACKAGES — Full List (15 packages)

These go into a dropdown when coach adds a client:

| Package | Duration |
|---------|----------|
| One Time On-Call Consult | 1 Day |
| Bodybuilding Contest Prep (12 Weeks) | 84 Days |
| Bodybuilding Contest Prep (24 Weeks) | 168 Days |
| Complete Online Coaching - Any Goals (12 Weeks) | 84 Days |
| Complete Online Coaching - Any Goals (24 Weeks) | 168 Days |
| Complete Online Coaching - Any Goals (1 Year) | 365 Days |
| Only Nutrition/Diet (12 Weeks) | 84 Days |
| Only Nutrition/Diet (24 Weeks) | 168 Days |
| Bodybuilding Posing Coaching (4 Sessions) | 30 Days |
| Bodybuilding Posing Coaching (8 Sessions) | 60 Days |
| Antenatal-Postnatal Complete Care | 280 Days |
| Child Nutrition (One Time) | 3 Days |
| Child Nutrition (1 Month) | 30 Days |
| Offline Exercise Training Camp (3-5 Days) | 30 Days |
| Postpartum Care 12 Weeks | 84 Days |
| Postpartum Care 24 Weeks | 168 Days |

### PACKAGE LOGIC IMPLICATIONS

- **Package type determines which joining form is sent:**
  - Antenatal/Postpartum → AN-PN questionnaire
  - All others → Standard questionnaire
- **Package duration** → auto-calculates fee due dates
- **Package type** → determines workout plan type (posing, nutrition-only, full coaching)
  - Posing packages → no workout plan, only posing session schedule
  - Nutrition-only → no workout plan, only diet plan
  - One-time consult → booking flow only, no plans

---

## UPDATED ADD CLIENT FLOW

When coach adds client:

1. Name, email, phone
2. Package selector (dropdown — all 15)
3. Fee amount + start date (auto-calculates end date)
4. System determines: form type, plan types allowed, fee schedule
5. Creates DB rows
6. Sends correct joining questionnaire link to client WhatsApp
7. Client appears in list with package badge

---

## DESIGN SYSTEM

- **Theme**: Dark gold — `#0A0A0A` background, `#FFB800` gold accent, `#111111` card background
- **Typography**: Bebas Neue headings, system sans body
- **Motion**: GSAP + ScrollTrigger, spring animations, staggered reveals
- **Layout**: Mobile-first, card-based, bottom sheets for forms, max-w-lg centered
- **UX Philosophy**: Zero cognitive load — one tap to log, glanceable dashboards, celebratory feedback

---

## FINAL COMPLETE TODO — FROZEN

### 🎨 Phase 0 — Design System Reset
- [ ] Remove all Antigravity lime/cream tokens
- [ ] Implement `#0A0A0A` / `#FFB800` / `#111111` dark gold system
- [ ] GSAP + ScrollTrigger install
- [ ] Animation constants file
- [ ] Claude Code lists all photos from `C:\Users\user\Downloads\aman app` — Teja approves each placement

### 🔐 Phase 1 — Auth
- [ ] Login — full-bleed Aman photo, gold reveal, real Supabase auth
- [ ] Reset password — dark gold theme
- [ ] ~~Middleware rename proxy.ts → middleware.ts~~ ✅ DONE
- [ ] ~~must_reset_password check in middleware~~ ✅ DONE

### 📝 Phase 2 — Forms
- [ ] Standard joining questionnaire — 8 sections, multi-step, dark gold, file uploads
- [ ] AN-PN questionnaire — pregnancy-specific, 10 sections, multi-step
- [ ] Check-in form — exact Aman questions, 5 sections, 6 photo slots, auto-save draft
- [ ] Coach submissions view `/submissions`
- [ ] Form type auto-selected by package

### 👨‍💼 Phase 3 — Coach Dashboard
- [ ] Hero with Aman photo + parallax
- [ ] Stats count-up animated
- [ ] Revenue trend graph — GSAP drawn
- [ ] Needs attention list
- [ ] Expiring packages alert
- [ ] Quick actions from dashboard
- [ ] Automation failure badge
- [ ] FAB → Add Client (with package selector + 15 packages)

### 👥 Phase 4 — Coach Clients
- [ ] Client list — search, filter, status
- [ ] Client cards — package badge, streak, last check-in
- [ ] Client detail — 4 tabs
- [ ] Before/after photo slider
- [ ] Adherence score + streak
- [ ] Reset client password
- [ ] Progress report PDF

### 🏋️ Phase 5 — Plans Builder
- [ ] Workout plan builder
- [ ] Diet plan builder
- [ ] Posing session scheduler (for posing packages)
- [ ] Assign to client
- [ ] Auto-send PDF to client WhatsApp on assign
- [ ] Plan edit + duplicate

### 💰 Phase 6 — Fees + Payments
- [ ] Fee ledger — all clients
- [ ] Overdue highlighted
- [ ] UPI payment link generator (placeholder, fill UPI ID later)
- [ ] One-click WhatsApp send of payment link
- [ ] Mark paid → receipt PDF → client WhatsApp
- [ ] GST invoice PDF
- [ ] Revenue graph — monthly bar chart
- [ ] WhatsApp reminders: 1 week before, 1 day before, 1 week after overdue

### 📅 Phase 7 — Booking
- [ ] Coach sets availability
- [ ] Client books call slot
- [ ] Calendar view — coach side
- [ ] Upcoming session on client home
- [ ] WhatsApp confirmation on booking
- [ ] WhatsApp reminder 1 hour before

### 🏅 Phase 8 — Badges + Milestones
- [ ] Badge DB tables
- [ ] 8 badge types defined
- [ ] Badge display — client home + progress
- [ ] Gold confetti animation on unlock
- [ ] Coach sees badges on client detail
- [ ] WhatsApp message on badge unlock

### 📋 Phase 9 — Check-ins
- [ ] All check-ins queue — coach
- [ ] Full check-in detail view
- [ ] Coach feedback + mark reviewed
- [ ] Upload check-in PDF

### 💪 Phase 10 — Client Pages
- [ ] Home — hero, coach card, streak, fee badge, quick actions
- [ ] Workout — day tabs, rest timer, completion ring, PDF
- [ ] Diet — macro donut, meal checkboxes, calorie counter, water tracker, shopping list, PDF
- [ ] Check-in form — full Aman questions, auto-save, photo compare, confetti on submit
- [ ] Progress — GSAP graph, before/after slider, milestones, PDF
- [ ] Payments — fee history, UPI pay button, receipts
- [ ] Notifications center
- [ ] Settings

### 📲 Phase 11 — WhatsApp Automation
- [ ] WAHA local server setup
- [ ] n8n local server setup
- [ ] Plan assigned → PDF → client WhatsApp
- [ ] Check-in submitted → PDF → Aman WhatsApp
- [ ] Weekly reminder → Monday 8AM → all active clients
- [ ] Joining form link → new client on add (correct form by package)
- [ ] Payment reminder → 1 week before
- [ ] Payment reminder → 1 day before
- [ ] Payment overdue → 1 week after
- [ ] Payment received → receipt → client WhatsApp
- [ ] Badge unlocked → motivational message → client WhatsApp
- [ ] Booking confirmed → client + Aman WhatsApp
- [ ] Session reminder → 1 hour before
- [ ] All failures → logged, dashboard badge

### 🗄️ Phase 12 — Database Migrations
- [ ] `packages` table — all 15 packages with duration
- [ ] `form_submissions` table — questionnaire answers
- [ ] `client_type` field on clients (standard/antenatal)
- [ ] `badges` table
- [ ] `client_badges` table
- [ ] `bookings` table
- [ ] `availability` table
- [ ] ~~`form_data` JSONB on checkins~~ ✅ DONE

### 📱 Phase 13 — PWA
- [ ] `manifest.json`
- [ ] Service worker — offline plan cache
- [ ] Install prompt
- [ ] Splash screen — Aman branding
- [ ] Push notifications

### 🚀 Phase 14 — Deploy + Test
- [ ] All env vars on Vercel
- [ ] WAHA public URL configured
- [ ] n8n public URL configured
- [ ] UPI ID added (when ready)
- [ ] Full E2E test on real mobile
- [ ] Coach adds client → form sent → client joins → plan assigned → check-in submitted → fee paid → receipt sent

---

## START ORDER

Before Claude Code touches anything:

1. You share/approve photos from `C:\Users\user\Downloads\aman app`
2. Confirm WAHA server IP/port (reuse Movement Fitness setup)
3. Confirm n8n server IP/port

---

## COMPLETED (Previous Sessions)

### ✅ Auth System
- Firebase → Supabase migration complete
- Email+password login (coach + client)
- `must_reset_password` flow (middleware + login + reset page)
- Trigger: `on_auth_user_created` auto-creates profile with `must_reset_password=true` for clients
- Role-based route protection via `proxy.ts`

### ✅ Coach Features
- Dashboard with real Supabase queries
- Client list with search/filter
- Add client flow (email+password, default `Welcome@123`)
- Workout plan builder (days + exercises CRUD)
- Nutrition plan builder (meals + food items CRUD)
- Check-in review with feedback
- Fee management

### ✅ Client Features
- Home page with real coach name
- Workout view with PDF download (jsPDF)
- Check-in form with 5-day cooldown
- Diet page

### ✅ Automation
- Resend email integration (welcome, invoice, payment reminder, plan expiry)
- n8n workflow JSONs (weekly checkin, payment reminder, plan expiry, new client welcome)
- Webhook receivers (checkin submitted, payment received)

### ✅ Database
- Full schema (`001_initial_schema.sql`) applied
- `must_reset_password` column added
- `email` column added to `clients` table
- `form_data` JSONB on checkins
- RLS policies for all tables
- Coach profile seeded

### ✅ E2E Tests
- `e2e-fixes.mjs`: 4/4 PASS (trigger, must_reset_password, login redirect, password reset)
- `e2e-test.mjs`: Ready (6/6 expected)

---

## CREDENTIALS

- Coach: `coach@akfitness.in` / `AmanCoach@2026`
- Client: `tejasolryder24@gmail.com` / `Welcome@123`
- Supabase project: `muuegtbyaehlrfqjluqz`
- Supabase URL: `https://muuegtbyaehlrfqjluqz.supabase.co`
- Dev port: 3001
- Live: `https://aman-coach-next.vercel.app`
- All secrets in `.env.local`

---

## TECH STACK

- Next.js 16.2.6 (`proxy.ts`, NOT `middleware.ts`)
- React 19
- Supabase (Auth, Postgres, Storage)
- Tailwind CSS v4
- GSAP + ScrollTrigger (planned)
- motion/react (framer-motion)
- recharts
- jsPDF (client PDF generation)
- Resend (transactional email)
- n8n (automation workflows)
- WAHA (WhatsApp automation, planned)
