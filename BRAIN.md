# BRAIN.md — AMAN KHURANA FITNESS PWA

## 30-SECOND BRIEF
Aman Khurana Fitness is an elite 1-on-1 Fitness, Nutrition & Pregnancy Coaching PWA built with Next.js 16 (Turbopack), Tailwind CSS, Framer Motion, GSAP, Supabase Auth/DB, WAHA WhatsApp API, and n8n. Features Dark Gold design system (#0A0A0A bg, #1A1A1A cards, #FFB800 accents), Typeform-style 1-question-per-screen conversational form engine across all 3 client forms, 8 gamified milestone badges, 1-on-1 call booking system, GST tax invoice generator, UPI payment link integration, and offline PWA support.

---

## CURRENT STATUS & RECENT ACHIEVEMENTS
- **Conversational Form Engine Redesign (3 Forms)**: Converted all 3 forms (`/checkin`, `/onboarding`, `/onboarding/antenatal`) into world-class Typeform-style 1-question-per-screen mobile flows with:
  - Full screen per question (100vh)
  - Animated thin gold progress bar (#FFB800) + step counter ("3 of 27")
  - Top-left BACK button & fixed bottom gold NEXT button
  - Image card pickers, chip multi-selects, gold sliders, number steppers, native date pickers, dark textareas, and dedicated full-screen photo dropzones
  - Touch swipe left/right gesture navigation
  - Draft auto-save to `localStorage` + "Continue where you left off?" resume modal banner
  - 100% field preservation, Supabase submission logic, `/api/forms/submit` POST integration & PDF download.
- **Design System Overhaul (13 Screens)**: 100% completed dark/gold visual redesign across all client and coach screens (`/home`, `/workout`, `/diet`, `/checkin`, `/progress`, `/schedule`, `/payments`, `/dashboard`, `/clients`, `/clients/[id]`, `/submissions`, `/fees`, `/coach/schedule`).
- **Production Build**: Verified clean `npm run build` (0 TypeScript errors, 0 warnings, 28/28 routes static & dynamic).
- **Form Audits & PDF Exports**: Audited 3 major forms (`/onboarding`, `/onboarding/antenatal`, `/checkin`). Generated 3 standalone PDF form documents saved directly to `Downloads`.

---

## INFRASTRUCTURE & CONTAINERS
- **WAHA Container**: Active on `http://localhost:3000` (Session: `aman-coach`, QR code saved to `qr.png`).
- **n8n Container**: Active on `http://localhost:5678`.
- **WhatsApp Integration Module**: `src/lib/whatsapp.ts` with automated triggers for form alerts, welcome messages, check-in reminders, payment reminders, and badge unlocks.

---

## KEY FILE PATHS
- Conversational Form Components: [src/components/forms/ConversationalFormComponents.tsx](file:///C:/claude%20code/aman-coach-next/src/components/forms/ConversationalFormComponents.tsx)
- Weekly Checkin Form: [src/app/(client)/checkin/page.tsx](file:///C:/claude%20code/aman-coach-next/src/app/%28client%29/checkin/page.tsx)
- Standard Onboarding Form: [src/app/(client)/onboarding/page.tsx](file:///C:/claude%20code/aman-coach-next/src/app/%28client%29/onboarding/page.tsx)
- Antenatal Onboarding Form: [src/app/(client)/onboarding/antenatal/page.tsx](file:///C:/claude%20code/aman-coach-next/src/app/%28client%29/onboarding/antenatal/page.tsx)
- Handoff & Memory Log: [HANDOFF.md](file:///C:/claude%20code/aman-coach-next/HANDOFF.md)

---

## NEXT RECOMMENDED ACTION
1. Test all 3 conversational forms live on mobile/desktop browsers (`/checkin`, `/onboarding`, `/onboarding/antenatal`).
2. Have Coach Aman scan `qr.png` to link WhatsApp for automated notification delivery.
