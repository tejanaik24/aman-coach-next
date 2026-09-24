# Official Meta source checklist: WhatsApp Business Platform (Cloud API)

> **Purpose:** a plain-English setup map for an owner who wants the official Meta WhatsApp Business Platform, rather than a browser-automation or unofficial WhatsApp integration. Sources below are Meta-owned and were checked on 12 August 2026. Meta changes its Dashboard labels and requirements, so use the linked page as the deciding source if the UI differs.

## The short version

1. Aman needs a Meta Business Portfolio and must be an admin of it.
2. Create a Meta app, add the **WhatsApp** product/use case, and complete Meta's Cloud API onboarding. This creates or connects the WhatsApp Business Account (WABA) and phone-number assets.
3. Add the production phone number, complete its SMS/voice verification, and submit the display name for Meta review.
4. Complete business verification in the Business Portfolio if Meta asks for it / before relying on full production access.
5. A developer configures the permanent token, webhook endpoint, message sending, and security. Test tokens are not a production credential.
6. Collect consent before messaging people; obtain Meta approval before sending template messages outside a customer-service conversation window.

## Setup checklist with official sources

### 1. Set up the Meta business owner and portfolio

**Aman can do this, if he owns the business and can supply its legal details.** Create or use the business's Meta Business Portfolio, make sure the correct people are portfolio admins, and keep its legal name, address, website, and supporting documents consistent. Meta's Cloud API onboarding begins from the Meta app/WhatsApp setup flow, where the business assets are selected or created.

- [Cloud API Get Started](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started) — Meta's official entry point for creating the app, adding WhatsApp, obtaining the test assets/token, and moving to a real business number.
- [Business verification in Meta Business Manager](https://www.facebook.com/business/help/2058515294227817) — Meta's business-verification process and document/eligibility guidance.

**Not Aman alone:** Meta performs the verification decision. If another agency/developer owns the portfolio or app, that owner must grant Aman the appropriate admin access; otherwise he cannot reliably control billing, people, assets, or tokens.

### 2. Create the app, WhatsApp account, and phone-number asset

**Owner action with a developer beside him:** In Meta for Developers, create an app for the business, add the WhatsApp product/use case, and use the WhatsApp API Setup/onboarding screen to associate the Business Portfolio and create/select its WABA. Meta provides test assets for initial API testing; production requires registering the real number.

- [Cloud API Get Started](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started) — app creation/onboarding and test-versus-production path.
- [Phone Numbers](https://developers.facebook.com/docs/whatsapp/phone-numbers) — adding, verifying, registering, and managing WABA phone numbers and their display names.

Prepare a dedicated business number that can receive the verification code by SMS or voice call. Do **not** assume an existing WhatsApp app number must be removed: current number eligibility/coexistence options are determined by the phone-number flow in Meta's Dashboard and the linked phone-number documentation.

**Not Aman alone:** a developer needs the app/WABA IDs and API configuration; Meta controls number registration and can reject a number or display name.

### 3. Business verification and display-name review

Use the real business details consistently. Submit the proposed WhatsApp display name when the number is added/managed. The display name is reviewed under Meta's WhatsApp naming rules; it should identify the business and not mislead users. A verified business can unlock/maintain production capabilities, but the dashboard shows the exact outstanding requirement for that portfolio.

- [Phone Numbers — display-name management](https://developers.facebook.com/docs/whatsapp/phone-numbers) — official phone and display-name workflow.
- [WhatsApp Business Platform policies](https://www.whatsapp.com/legal/business-policy/) — the binding policy layer for business use of WhatsApp.
- [Business verification](https://www.facebook.com/business/help/2058515294227817) — Meta's separate legal-business verification flow.

**Not Aman alone:** Meta approves or rejects the verification and display name; an appeal/retry follows the status and reason Meta supplies in its tools.

### 4. Use the right access token

The token shown during initial WhatsApp API setup is for testing and is temporary. Do not place it in a public repository, browser code, screenshots, or chat. For a server integration, create a least-privilege System User in the Business Portfolio and generate a token for the app/business assets; store it only in the server's secret store/environment configuration and rotate it on staff/vendor changes.

- [Cloud API Get Started](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started) — temporary token shown in initial setup.
- [System Users](https://developers.facebook.com/docs/marketing-api/system-users/) — Meta's official System User/token administration guidance.
- [Access Tokens](https://developers.facebook.com/docs/facebook-login/guides/access-tokens/) — token types, expiry and handling fundamentals.

**Not Aman alone:** the developer should create, scope, install, rotate, and test the production token. Aman should retain Business Portfolio admin ownership and never send a token to a third party in plain text.

### 5. Configure a webhook before treating the integration as live

Cloud API sends delivery/status and inbound-message events to a public HTTPS callback URL. The developer must supply a callback URL and verification token in the app's Webhooks configuration, pass Meta's verification challenge, and subscribe the WABA to the required fields (at minimum, messages for inbound/status processing). The endpoint must validate requests and handle retries/idempotency safely.

- [WhatsApp Cloud API Webhooks](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components) — WhatsApp webhook fields, subscription and payload behaviour.
- [Graph API Webhooks — Getting Started](https://developers.facebook.com/docs/graph-api/webhooks/getting-started) — callback verification and general webhook configuration.

**Not Aman alone:** a developer must deploy and secure the endpoint. Aman can approve the domain/hosting and check that no customer data is routed to an unapproved vendor.

### 6. Templates, customer consent, and the 24-hour service window

Get a user's WhatsApp opt-in *before* contacting them through the Platform. Keep evidence of how, when, and for which message category the person consented; offer a clear way to opt out. Free-form replies are for the customer-service conversation window after a user message. For business-initiated messages outside that window, send a Meta-approved template in the appropriate category; do not send an unapproved template merely because it looks transactional or personal.

- [Getting Opt-In](https://developers.facebook.com/docs/whatsapp/overview/getting-opt-in/) — Meta's opt-in requirement and acceptable collection guidance.
- [Message Templates](https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates) — creating/managing templates through Meta's official API.
- [Cloud API: Send Messages](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages) — message sending and conversation-window context.
- [WhatsApp Business Messaging Policy](https://www.whatsapp.com/legal/business-policy/) — policy restrictions and user-experience obligations.

**Not Aman alone:** Meta approves/rejects template submissions. A developer must implement opt-in evidence, unsubscribe handling, template submission, and the logic that prevents messages outside the allowed window.

### 7. Billing, payment, and India

Meta's current WhatsApp pricing is usage-based and the official pricing page/rate card is the only safe source for the applicable currency, country and template-category price. The business owner should add/confirm an approved payment method in the Business Portfolio before production scale, then record which legal entity owns the charges. Do not budget from a third-party blog or an old per-conversation rate.

- [WhatsApp Business Platform Pricing](https://developers.facebook.com/docs/whatsapp/pricing/) — official pricing model and links to the current rate information.
- [Meta Business Help Center](https://www.facebook.com/business/help) — official help surface for payment-method and billing-account UI changes.

**India-specific finding:** these core Meta sources do not state a separate India-only Cloud API setup sequence or a universal India-only payment method. Treat India as the destination/country selected in Meta's current pricing/rate information and confirm the payment methods actually offered to the Business Portfolio in its dashboard before committing to spend.

## Owner hand-off checklist

Give the developer only what is necessary, through a secure channel:

- Aman remains a Business Portfolio admin and app admin.
- The portfolio's legal details and website are accurate and business verification is submitted when requested.
- A real production phone number is available for SMS/voice verification.
- The approved display name, business website, privacy policy URL, and customer-support process are ready.
- The developer provides the webhook domain, data-handling explanation, and a test plan; Aman approves them before production use.
- Opt-in wording and records are approved before any outbound campaign.
- Billing owner and payment method are confirmed in Meta, with a small controlled test before scale.

## What this document does **not** prove

This is a source checklist, not evidence that Aman already has an approved portfolio, business verification, display name, registered number, paid billing account, webhook, or template. Each of those must be confirmed in the relevant Meta dashboard/API response.
