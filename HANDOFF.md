# AMAN KHURANA FITNESS — PWA PROJECT HANDOFF & MEMORY LOG

**Last Updated:** July 25, 2026  
**Production URL:** [https://aman-coach-next.vercel.app](https://aman-coach-next.vercel.app)  
**Project Location:** `C:\claude code\aman-coach-next`  

---

## 1. COMPLETED PHASES SUMMARY

### ✅ Phase 1 — Core App Upgrade
- Built modern Dark Gold PWA UI framework with Next.js 16 (App Router), Tailwind CSS, Framer Motion, and GSAP.
- Client Portal (`/home`, `/workout`, `/nutrition`, `/progress`) & Coach Portal (`/dashboard`, `/clients`, `/plans`, `/fees`, `/checkins`).
- Authentication via Supabase (`AuthContext`) with automatic role routing (`client` vs `coach`).

### ✅ Phase 2 — Forms Upgrade
- **Form 1: Standard Joining Questionnaire** (`/onboarding`) — 8 multi-step wizard sections matching 100% of Aman's original fields.
- **Form 2: AN-PN Questionnaire** (`/onboarding/antenatal`) — Pregnancy specific 8+ sections with BP & blood glucose tracking.
- **Form 3: Weekly Check-in Form** (`/checkin`) — 5 sections, 6 photo slots, 5-day cooldown guard, PDF download via `jsPDF`, and gold confetti.
- **Form 4: Coach Submissions View** (`/submissions`) — Filterable list of all submissions (client, type, date) with full detail view.

### ✅ Phase 3 — WhatsApp + Automation Setup
- **WAHA Container**: Running on `http://localhost:3000` (`devlikeapro/waha`) with session `aman-coach` (QR scan pending).
- **n8n Container**: Running on `http://localhost:5678` (`n8nio/n8n`).
- **WhatsApp Integration Module**: `src/lib/whatsapp.ts` for automated WhatsApp alerts, check-in reminders, and welcome messages.
- **Automated Webhooks**: `/api/forms/submit`, `/api/webhooks/checkin-reminder`, `/api/clients/create`.

### ✅ Phase 4 — Badges & Milestones
- Database migration `20260725000002_create_badges.sql` created and executed.
- `src/lib/badges.ts` helper with automated condition checks & canvas gold confetti particle animation.
- `BadgesGrid.tsx` component mounted on Client Home (`/home`), Progress (`/progress`), and Coach Client Detail View (`/clients/[id]`).

### ✅ Phase 5 — Booking System
- Database migration `20260725000003_create_bookings.sql` created and executed.
- `src/lib/bookings.ts` helper for availability config, 30-min slot generation, and call booking management.
- Client Booking Page (`/schedule`) & Coach Schedule & Calendar View (`/coach/schedule`).
- Hero "Book Call" button on Client Home page.

### ✅ Phase 6 — Payments System & GST Invoices
- Database migration `20260725000004_create_payments.sql` created and executed.
- `src/lib/payments.ts` helper for UPI link generation (`upi://pay?pa=amankhurana@upi...`), official GST Tax Invoice PDF generation (`generateGstInvoicePdf`), and automated payment reminders.
- Coach Fee Ledger (`/fees`) with overdue highlight in red, pending in gold, paid in green, Monthly Revenue bar chart, UPI link generator, GST Invoice download, and WhatsApp reminders (1 week before, 1 day before, 1 week overdue).
- Client Payments View (`/payments`).

### ✅ Phase 7 — PWA & Offline Experience
- `public/manifest.json` with AK Coach branding.
- Service Worker `public/sw.js` for caching static assets, images, and plans offline.
- `PwaInstallPrompt.tsx` ("Add to Home Screen" banner) mounted in root layout.

---

## 2. DATABASE MIGRATIONS APPLIED (ALL 4)

1. `20260725000001_create_form_submissions.sql`: Created `form_submissions` table & RLS policies.
2. `20260725000002_create_badges.sql`: Created `badges` & `client_badges` tables + 8 default seeded badges.
3. `20260725000003_create_bookings.sql`: Created `availability` & `bookings` tables + RLS policies.
4. `20260725000004_create_payments.sql`: Created `invoices` & `payments` transaction log tables + RLS policies.

---

## 3. ENVIRONMENT VARIABLES (`.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://muuegtbyaehlrfqjluqz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1...
RESEND_API_KEY=
AUTOMATION_SECRET=akcoach-webhook-2026
SETUP_SECRET=akcoach-setup-2026

WAHA_URL=http://localhost:3000
WAHA_SESSION=aman-coach
WAHA_API_KEY=aman-coach
AMAN_WHATSAPP=919815690656
N8N_URL=http://localhost:5678
```

---

## 4. CONTAINER STATUS & AUTOMATION INFRASTRUCTURE

- **WAHA**: Running on `http://localhost:3000` (ID: `16ed0b15a3ba`). Session `aman-coach` started; QR code saved at `qr.png` (scan pending until tomorrow when Aman wakes up).
- **n8n**: Running on `http://localhost:5678` (ID: `fada4662d229`). Workflows to be built in next phase.

### WhatsApp Automation Triggers Status:
- ✅ Form Submission Coach Alert (`/api/forms/submit`) — **BUILT**
- ✅ New Client Welcome WhatsApp (`/api/clients/create`) — **BUILT**
- ✅ Weekly Check-in Reminder Webhook (`/api/webhooks/checkin-reminder`) — **BUILT**
- ✅ Payment Reminders (1 week before, 1 day before, 1 week overdue) — **BUILT**
- ✅ Badge Unlock WhatsApp Alert — **BUILT**
- ⏳ Pending: Live QR code scan by Coach Aman on WhatsApp.

---

## 5. ALL 28 GENERATED ROUTES LIST

```
┌ ○ /
├ ○ /_not-found
├ ƒ /api/admin/setup-coach
├ ƒ /api/clients/create
├ ƒ /api/forms/submit
├ ƒ /api/webhooks/checkin
├ ƒ /api/webhooks/checkin-reminder
├ ○ /checkin
├ ○ /checkins
├ ○ /clients
├ ƒ /clients/[id]
├ ○ /coach/schedule
├ ○ /dashboard
├ ○ /diet
├ ○ /fees
├ ○ /home
├ ○ /login
├ ○ /manifest.webmanifest
├ ○ /nutrition
├ ○ /onboarding
├ ○ /onboarding/antenatal
├ ○ /payments
├ ○ /plans
├ ƒ /plans/nutrition/[id]
├ ƒ /plans/workout/[id]
├ ○ /progress
├ ○ /reset-password
├ ○ /schedule
├ ○ /submissions
└ ○ /workout
```

---

## 6. DESIGN SYSTEM TOKENS

- **Background Primary**: `#0A0A0A`
- **Surface / Card**: `#121212` (Border: `#1A1A1A` / `#27272A`)
- **Accent Gold**: `#FFB800` (Hover: `#FFC82C`, Sheen: `#FFD700`)
- **Status Colors**: Overdue Red (`#EF4444`), Active Gold (`#FFB800`), Completed Green (`#10B981`)
- **Typography**: Inter (Body) & Space Grotesk (Headings)

---

## 7. PACKAGE LIST (15 DEPENDENCIES)

1. `next` (v16.2.6)
2. `react` & `react-dom` (v19)
3. `@supabase/supabase-js`
4. `@supabase/ssr`
5. `motion` (Framer Motion v12)
6. `gsap`
7. `jspdf`
8. `recharts`
9. `lucide-react`
10. `date-fns`
11. `react-hot-toast`
12. `clsx`
13. `tailwind-merge`
14. `tailwindcss`
15. `typescript`

---

## 8. BADGE TYPES (ALL 8)

1. `first_checkin` — **First Check-in**: Submitted first weekly check-in form.
2. `streak_4w` — **4-Week Streak**: Completed 4 consecutive weekly check-ins.
3. `streak_8w` — **8-Week Streak**: Completed 8 consecutive weekly check-ins.
4. `streak_12w` — **12-Week Master**: Completed 12 consecutive weekly check-ins.
5. `weight_loss_5kg` — **5kg Milestone**: Achieved first 5kg weight loss.
6. `workout_80` — **Iron Commitment**: Achieved 80%+ workout completion.
7. `diet_90` — **Nutrition Master**: Maintained 90%+ diet adherence.
8. `first_plan` — **Plan Activated**: Received custom nutrition or workout plan.

---

## 9. ALL CREATED/MODIFIED FILE PATHS

- `supabase/migrations/20260725000001_create_form_submissions.sql`
- `supabase/migrations/20260725000002_create_badges.sql`
- `supabase/migrations/20260725000003_create_bookings.sql`
- `supabase/migrations/20260725000004_create_payments.sql`
- `src/lib/whatsapp.ts`
- `src/lib/badges.ts`
- `src/lib/bookings.ts`
- `src/lib/payments.ts`
- `src/components/client/BadgesGrid.tsx`
- `src/components/shared/PwaInstallPrompt.tsx`
- `src/app/(client)/onboarding/page.tsx`
- `src/app/(client)/onboarding/antenatal/page.tsx`
- `src/app/(client)/checkin/page.tsx`
- `src/app/(client)/schedule/page.tsx`
- `src/app/(client)/payments/page.tsx`
- `src/app/(coach)/submissions/page.tsx`
- `src/app/(coach)/coach/schedule/page.tsx`
- `src/app/(coach)/fees/page.tsx`
- `src/app/(coach)/clients/[id]/page.tsx`
- `src/app/(client)/home/page.tsx`
- `src/app/(client)/progress/page.tsx`
- `src/app/api/forms/submit/route.ts`
- `src/app/api/webhooks/checkin-reminder/route.ts`
- `src/app/api/clients/create/route.ts`
- `src/proxy.ts`
- `public/manifest.json`
- `public/sw.js`

---

## 10. NEXT SESSION START INSTRUCTIONS

1. Have Coach Aman open WhatsApp -> Linked Devices -> Link a Device and scan `qr.png` generated by WAHA.
2. Verify WAHA session status via `GET http://localhost:3000/api/sessions/aman-coach`.
3. Construct custom n8n workflows on `http://localhost:5678` for advanced drip notifications.
