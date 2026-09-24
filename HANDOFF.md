# Aman Khurana Fitness — Safe Handoff

## Current release state

- The local project is not deployed automatically. Deploy only after an approved staging test and Teja's explicit approval.
- All production secrets belong only in the hosting provider's environment settings or an approved secret manager.
- Rotate any credential that was present in older handoff material before release.

## Required checks before deployment

1. Confirm Supabase, Razorpay, Resend, WAHA, n8n, VAPID, and automation variables are configured for the target environment.
2. Use a non-production database and Razorpay test mode for payments and end-to-end tests.
3. Confirm WhatsApp delivery from WAHA/gateway logs, not only workflow success.
4. Run `npm run lint`, `npm run build`, and a manual authentication/payment smoke test.
