# Project Safety Notes

- Do not read, print, commit, or copy values from `.env.local`.
- Use the provider environment configuration for secrets; source code may only reference environment variable names.
- Keep API authorization checks server-side and verify user ownership before database writes.
- Do not deploy or send external messages without explicit approval.
- Run `npm run lint`, `npm run build`, and an isolated staging smoke test before proposing a release.

# What's Done (as of 2026-09-23)

- Meta WhatsApp Cloud API live on +91 6284 452 695, credentials added to Vercel production env (were missing before, silently breaking every send).
- Webhook (`/api/webhooks/whatsapp`) registered + active with Meta; inbound client messages forward to Aman's personal WhatsApp (+91 98156 90656) with a reply link.
- Enquiry form (`/api/public/enquiry`) alerts Aman via email (Resend) + WhatsApp in parallel — redundant so one channel failing doesn't lose the lead.
- WhatsApp Business Profile: About/description/email/website set.
- Domain `amankhuranafitness.com` verified in Meta Business Manager (DNS TXT via GoDaddy).
- Meta Business Verification submitted (PAN, sole proprietorship, "Aman Khurana") — pending Meta review.

# What's Pending

- **Profile photo** — not actually saved to the WhatsApp Business Profile despite being added once; retry after Business Verification clears.
- **Billing card** — no payment method on file in Meta Business Suite yet; blocks template messages once needed.
- **Message templates** (client_welcome, checkin_reminder, coach_alert) — not created; only needed later for automated check-in reminders. Current flow (manual replies from Aman's personal WhatsApp) doesn't need them.
