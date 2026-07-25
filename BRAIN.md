# BRAIN.md — AMAN KHURANA FITNESS PWA

## 30-SECOND BRIEF
Aman Khurana Fitness is an elite 1-on-1 Fitness, Nutrition & Pregnancy Coaching PWA built with Next.js 16 (Turbopack), Tailwind CSS, Framer Motion, GSAP, Supabase Auth/DB, WAHA WhatsApp API, and n8n. Features Dark Gold design system (#0A0A0A bg, #1A1A1A cards, #FFB800 accents), Typeform-style 1-question-per-screen conversational form engine across all 3 client forms, 8 gamified milestone badges, 1-on-1 call booking system, GST tax invoice generator, UPI payment link integration, and offline PWA support.

---

## CURRENT STATUS & RECENT ACHIEVEMENTS
- **Rebuilt All 3 Forms with Coach Aman's Exact Questions**:
  - `/checkin` (27 questions): 1-question-per-screen, large textareas for workout/diet feedback, urine color chips, anthropometrics steppers, photo uploads with optional skip.
  - `/onboarding` (64 questions): 1-question-per-screen, full contact, lifestyle, health, diet, 5 meal time pickers, 6 daily diet textareas, 3 BP inputs, photos & anthropometrics.
  - `/onboarding/antenatal` (69 questions): 1-question-per-screen, gestational age, LMP/EDD, pre-conception health, 5 glucose inputs, 3 BP inputs, photos & maternity anthropometrics.
  - Added Step 0 Welcome Screens ("Time to Check In 🔥", "Welcome to #TeamAKF 👊", "Welcome, Mama 🌸") with info pills & coach note.
- **Standalone HTML Form Exports**: Updated `form-checkin.html`, `form-onboarding.html`, and `form-antenatal.html` in `C:\Users\user\Downloads\` with exact question sequences.
- **Production Build & Git Deployment**: Passed `npm run build` (0 TypeScript errors, 28/28 routes compiled) and pushed commit `24d2cf8a` to GitHub/Vercel.

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
