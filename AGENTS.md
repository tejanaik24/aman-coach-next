# Aman Khurana Fitness Coach App

## Project

- Production URL: `https://aman-coach-next.vercel.app`
- Stack: Next.js, Supabase, Razorpay, Resend, n8n, and WAHA.
- Read the relevant Next.js guide in `node_modules/next/dist/docs/` before changing framework code.

## Release safety

- Never commit secrets, passwords, credentials, recovery codes, QR codes, or exported environment files.
- Keep service keys server-only. Do not add fallback secrets in source code.
- Use a non-production Supabase project and Razorpay test mode for end-to-end testing.
- Verify payment ownership and the amount due on the server; never accept either from the browser.
- Do not deploy without Teja's explicit approval.

## Operational notes

- The application requires configured Supabase, Razorpay, Resend, WAHA, n8n, VAPID, and automation variables where their related features are enabled.
- Use an approved secret manager or the hosting provider environment settings for production values.
- Rotate any value that existed in the removed historical handoff files before release.
