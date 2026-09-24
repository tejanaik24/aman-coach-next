# Aman Khurana
# Simple Guide: Getting the Official WhatsApp API

**Purpose:** This moves Aman Khurana from an unofficial WhatsApp connection to Meta's official WhatsApp Business Platform (also called the Cloud API). It is the reliable option for reminders, check-ins, payment updates, and client messages.

**Important:** You do not need to be technical. Complete the steps marked **Aman to do**. Do not share passwords, one-time codes, API keys, or your Facebook login with anybody. When you reach a step marked **Stop and send to Teja/Vyzma**, take a screenshot and send it to us.

---

## What you need before starting

Keep these ready before opening Meta:

1. A personal Facebook account owned by Aman. It must have two-factor authentication turned on.
2. Aman's legal business details exactly as they appear on official documents: legal name, address, email, phone number, and website/social profile.
3. One business document if Meta requests verification. This may be a GST registration, business registration, tax document, utility bill, or bank document. The name and address must match the details entered in Meta.
4. A business phone number that can receive an SMS or phone call right now.
5. A business email address Aman can access.
6. A payment card or billing access if Meta requests it for messaging charges.

### Best phone-number choice

For the smoothest first setup, use a **new Aman Khurana business number** that is not currently being used in personal WhatsApp, WhatsApp Business, or the old WAHA setup.

If Aman wants to use the current coaching number instead, **do not remove or migrate it yet**. Send Vyzma a screenshot first. Meta has different migration/coexistence options and we will choose the safe route before anything is disconnected.

---

## The process at a glance

1. Create or check the Aman Khurana Meta Business Portfolio.
2. Add business details and complete Meta's business verification when requested.
3. Create the official WhatsApp app inside Meta for Developers.
4. Add and verify the Aman Khurana business phone number.
5. Choose the WhatsApp display name clients will see.
6. Give Vyzma controlled technical access; Vyzma connects the app securely.
7. Create approved message templates and collect client consent.
8. Test with Aman before switching client automation on.

---

## Step 1 — Set up the Meta Business Portfolio

**Aman to do**

1. On a computer, open [business.facebook.com](https://business.facebook.com/).
2. Log in using Aman's own Facebook account.
3. If Meta asks to create a Business Portfolio, choose **Create business portfolio**.
4. Enter:
   - Business name: `Aman Khurana` or the exact registered business name.
   - Your name: Aman's real legal name.
   - Business email: an email Aman checks regularly.
5. Open **Business settings** and confirm that Aman is shown as an admin with full control.
6. Turn on two-factor authentication when Meta asks.

**Stop and send to Teja/Vyzma:** a screenshot showing the Business Portfolio name and Aman listed as an admin. Hide personal email addresses if preferred.

---

## Step 2 — Add accurate business details and verify the business

**Aman to do**

1. In Business settings, look for **Security Center**, **Business info**, or **Business verification**. Meta changes these labels occasionally.
2. Enter the legal business name, address, website, phone number, and email exactly as they appear on the supporting document.
3. Start **Business verification** if the button is available.
4. Upload only the document Meta asks for. Do not send documents to anyone on WhatsApp.
5. Complete Meta's email, SMS, or phone confirmation if prompted.

**What to expect:** Meta may approve immediately or ask for a clearer/matching document. If it rejects the verification, do not keep changing details randomly; send the rejection screenshot to Vyzma so we can identify the mismatch.

**Important:** Business verification and display-name approval are Meta decisions. Nobody can honestly guarantee approval or a fixed turnaround time.

---

## Step 3 — Create the official WhatsApp app

**Aman to do**

1. Open [developers.facebook.com/apps](https://developers.facebook.com/apps/).
2. Confirm you are signed into the same Facebook account.
3. Select **Create App**.
4. Choose the option for a **Business** app. If Meta asks you to choose a use case first, select the option closest to **Other** or **Business**, then choose Business as the app type.
5. Use a clear name such as `Aman Khurana WhatsApp`.
6. Select the Aman Khurana Business Portfolio created in Step 1.
7. After the app is created, find **Add products** and add **WhatsApp**.
8. Open WhatsApp **API Setup** or **Getting Started**. Meta may show a temporary test number and test access token. This is only for initial testing; do not treat it as the final setup.

**Stop and send to Teja/Vyzma:** a screenshot of the WhatsApp API Setup page. Do not include the access token in the screenshot.

---

## Step 4 — Add the real Aman Khurana business phone number

**Aman to do**

1. On the WhatsApp API Setup page, select **Add phone number**.
2. Enter the country code and the Aman Khurana business number selected earlier.
3. Enter the business profile information truthfully.
4. Choose the display name clients should see. Recommended: **Aman Khurana**.
5. Choose SMS or phone call verification and enter the code only on the Meta screen.
6. Wait for Meta to confirm the number and review the display name.

**Do not:** send the verification code to Vyzma, a developer, or anyone else. Vyzma never needs the code.

**If the number is already on WhatsApp:** stop at this screen and tell Vyzma before continuing. We will confirm whether the current WhatsApp setup can coexist or needs a planned migration.

---

## Step 5 — Give Vyzma access safely (no password sharing)

Once the Business Portfolio and WhatsApp app exist, Vyzma needs access to connect the Aman Khurana coaching app. Aman remains the owner.

**Aman to do**

1. Go to Business settings.
2. Open **Users** or **People** and select **Invite people**.
3. Invite the Vyzma email address supplied by Teja.
4. Give only the permissions Vyzma confirms are needed for the WhatsApp account/app integration. Aman should keep full admin control.
5. Do not share your Facebook password, 2FA code, or recovery codes.

**Vyzma will do after access is granted**

- Create a secure long-lived system access token.
- Store secrets in the app's protected environment settings, never in WhatsApp messages or public files.
- Configure the webhook so Meta can notify the Aman Khurana coaching app about message status and replies.
- Restrict access so the token is not exposed in the browser.
- Send a test message and confirm delivery with Aman.

---

## Step 6 — Billing and sending rules

Meta charges for some business-initiated WhatsApp messages. The exact price and billing rules depend on country, message category, and Meta's current policy. Review the current pricing in Meta Business Manager before sending campaigns.

For Aman's coaching business, these are the safe initial message types:

- New-client welcome
- Weekly check-in reminder
- Payment due reminder
- Plan-expiry reminder
- Booking confirmation/reminder
- Coach notification after a client submits a form

### Client consent is required

Before sending proactive marketing or reminder messages, keep a record that the client agreed to receive WhatsApp messages from Aman Khurana. A simple onboarding checkbox can say:

> “I agree to receive coaching updates, appointment reminders and payment reminders from Aman Khurana on WhatsApp. I can opt out by replying STOP.”

After a client messages Aman Khurana, free-form replies are allowed only within Meta's 24-hour customer-service window. For business-initiated messages outside that window, Meta requires an approved message template. Vyzma will submit templates such as “Weekly Check-in Reminder” and “Payment Reminder” for approval before enabling automation.

---

## Step 7 — Final test before going live

Vyzma and Aman will test in this order:

1. Aman receives one test message on his own phone.
2. A test client receives one approved template message.
3. The client replies; the reply reaches the Aman Khurana coaching system.
4. A test check-in creates a coach alert.
5. A payment-status test does not send duplicate messages.
6. Aman confirms the wording, phone number, and display name are correct.

Only after all six checks pass will we turn on messages for real clients.

---

## Send this message to Teja/Vyzma when Steps 1–4 are complete

> Hi Teja, I have created the Aman Khurana Meta Business Portfolio and the WhatsApp app. The business phone number has been added/verified. Please send me the Vyzma email address to invite in Business Settings. I have not shared any password, access token or verification code.

---

## Help links

- [Meta Business Suite](https://business.facebook.com/)
- [Meta for Developers — Apps](https://developers.facebook.com/apps/)
- [Meta WhatsApp Cloud API: Getting Started](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started)
- [Meta WhatsApp Cloud API documentation](https://developers.facebook.com/docs/whatsapp/cloud-api/)
- [Meta WhatsApp phone-number setup and display names](https://developers.facebook.com/docs/whatsapp/phone-numbers)
- [Meta WhatsApp opt-in guidance](https://developers.facebook.com/docs/whatsapp/overview/getting-opt-in/)
- [Meta WhatsApp message templates](https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates/)
- [Meta WhatsApp pricing](https://developers.facebook.com/docs/whatsapp/pricing/)

**Last updated:** 12 August 2026. Meta changes button names and review requirements occasionally. If Aman sees a screen that does not match this guide, he should send a screenshot before proceeding.
