# AK Fitness — Feature Expansion Brief

## Overview
Add 4 world-class features to the Aman Khurana Fitness Coach PWA: Meal Logging, Habit Tracking, Wearable Integration, and Client Self-Scheduling.

## Design Direction
- **Theme**: Dark (existing), purple #7C3AED accent, zinc-800 borders
- **Typography**: Bebas Neue headings, system sans body
- **Motion**: Spring animations, staggered reveals, micro-interactions on every tap
- **Layout**: Mobile-first, card-based, bottom sheets for forms, max-w-lg centered
- **UX Philosophy**: Zero cognitive load — one tap to log, glanceable dashboards, celebratory feedback

## Audience
- **Clients**: Fitness clients of Aman Khurana (India, mobile-first, English/Hinglish)
- **Coaches**: Aman and his team managing 10-50 clients

## Tech Stack
- Next.js 16.2.6, React 19, Supabase, Tailwind v4
- motion/react (framer-motion), recharts, lucide-react
- PWA with service worker

## Architecture
All 4 features follow the existing patterns:
1. Migration SQL → `supabase/migration_v3.sql`
2. Types → `src/types/index.ts`
3. Store functions → `src/lib/supabase-store.ts` + `src/lib/store.ts`
4. Hooks → `src/hooks/use{Feature}.ts`
5. Routes → `src/app/client/{feature-name}/page.tsx`
6. Components → `src/components/{feature-name}/`

## Features

### F1: Meal Logging / Calorie Tracker
- Daily food log with timeline view
- Food database (pre-seeded common Indian foods)
- Calorie ring chart (consumed vs target)
- Macro breakdown (protein/carbs/fats)
- Add food via bottom sheet search
- Calendar history view

### F2: Habit & Wellness Tracking
- Daily habit checklist (water, steps, sleep, reading, meditation, etc.)
- Streak tracking with flame animation
- Weekly heatmap view
- Custom habit creation
- Habit categories (hydration, movement, mindfulness, nutrition)

### F3: Wearable Integration
- Manual entry for steps, heart rate, sleep, calories burned
- Fitbit OAuth2 connection (optional)
- Google Fit REST API connection (optional)
- Today's metrics dashboard (2x2 card grid)
- 7-day trend sparklines

### F4: Client Self-Scheduling
- Coach sets weekly availability (day/time blocks)
- Clients view and book available slots
- Booking confirmation with celebration animation
- Upcoming appointments list
- Appointment status (scheduled/completed/cancelled)

## Implementation Order
1. DB migration → Types → Store functions (all 4 at once)
2. Feature 1: Meal Logging UI
3. Feature 2: Habit Tracking UI
4. Feature 3: Wearable Integration UI
5. Feature 4: Scheduling UI
6. Polish: animations, transitions, error states
