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

# Session 2026-09-29 — Aman's WhatsApp change list (DEPLOYED, commit 0bc954ff)

## What's Done
- Loader: inline logo overlay at top of `<body>` on all 6 static pages (was JS-created → red photo flashed first). `sw.js` cache = `ak-coach-v3`.
- Home slider: 7 tabs (Contest Prep, Fat Loss, Muscle Building, Antenatal Postnatal Care, Postpartum Care, Child Nutrition, Posing Coaching).
- `/services`: 11 services, each once, no prices (only On-Call "₹2000"). `/packages`: separate page, price + duration removed, linked in nav/footer.
- `/book`: AMOUNT 1000 → 2000. Contact: address removed (page + JSON-LD streetAddress). Contest Prep tagline added. Antenatal training/exercise bullets added.
- 17 new images with Aman as the coach (one image per service). One image per service is the rule — do NOT make 12wk/24wk/1yr variants.
- Verified live on www.amankhuranafitness.com (content + image byte sizes match). Note apex redirects 308 → www; follow redirects when checking.

## What's Pending
- About page (`public/about.html`) hero still shows `images/aman/about-hero.webp` = Aman in RED SLEEVELESS top. Aman objected to that photo when loading on mobile. Loader now covers the flash; swapping the photo itself is Teja's call (suggested `aman/aman-11.jpeg`).
- Home hero background `images/aman-hero-1.webp` is still the red t-shirt photo (garbled fake logo on shirt).
- Antenatal bullets wording not yet shown to Aman. He will discuss merging Services sections + Packages page on a call.
- Aman said "Not yet" to mock testing (2026-09-29 17:50).
- Internal client app pages still say "AK Fitness" (layout.tsx title, login, emails) — not touched.

## Image workflow notes
- Antigravity (Gemini) chat could not receive attached files; it works when given one self-contained pasted prompt (Aman described in words). Read-only `ask_antigravity` MCP cannot generate images.
- Always view every generated image before placing; convert PNG → webp (`ffmpeg -c:v libwebp -quality 82`); stop stale `next start` on port 3010 before re-testing (old server serves old files).
