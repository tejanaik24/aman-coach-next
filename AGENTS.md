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

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
