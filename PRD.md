# Aman Khurana Fitness Coach App

## Purpose

Provide an authenticated client portal for coaching plans, check-ins, progress, payments, and communication, with a coach workspace for client management.

## Core requirements

- Client and coach roles are enforced on the server.
- Health information, photos, and personal contact details are private to the client and their coach.
- Payment orders are tied to the authenticated client or responsible coach, with price and ownership determined by the server.
- Public enquiries have input validation and abuse protection.
- Payment, email, push, and WhatsApp configuration stays server-side.

## Release requirements

- No credentials, QR images, or local environment exports in source control.
- Dependency audit, lint, build, and staging smoke tests must pass.
- Test external services only with approved non-production credentials.
- Production deployment needs Teja's explicit approval.
