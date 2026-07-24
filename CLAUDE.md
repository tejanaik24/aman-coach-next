# Aman Khurana Fitness Coach App

## What is this?
PWA for fitness coach Aman Khurana — coach dashboard + client portal.
Manages clients, check-ins, payments, and automated WhatsApp/email flows.

## Live URLs
- Vercel: aman-coach-next.vercel.app
- Dev server runs on port 3001

## Stack
- Next.js 16, React, Tailwind, TypeScript, Supabase
- Resend (emails), n8n (automation), WAHA (WhatsApp)
- Razorpay (payments — planned)

## Supabase
- Project: aman coach
- Ref: muuegtbyaehlrfqjluqz
- URL: https://muuegtbyaehlrfqjluqz.supabase.co
- All keys in .env.local — never commit

## Test Credentials
- Coach: coach@akfitness.in / AmanCoach@2026
- Client 1: tejasolryder24@gmail.com / Welcome@123
- Client 2: test-e2e-62733@akfitness.in / Welcome@123
- Default password for new clients: Welcome@123

## What's Done
- Firebase → Supabase migration complete
- Email/password auth (phone OTP removed)
- Coach dashboard with real Supabase queries
- Client creation flow with welcome email
- 7 automation API endpoints
- 4 n8n workflow JSONs in /n8n-workflows/
- Resend email working (4 email types)

## What's Pending
- Verify domain akfitness.in in Resend → change FROM to noreply@akfitness.in
- n8n workflows not imported yet — import from /n8n-workflows/
- WAHA WhatsApp automation — not connected yet
- Razorpay — not built yet

## Critical Rules
- Role always read from profiles table — never from user_metadata
- Never commit .env.local or any secrets
- Always check .env.local.example before running locally
- Dev port is 3001 not 3000
