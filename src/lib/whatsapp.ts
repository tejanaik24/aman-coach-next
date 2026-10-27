/**
 * Official Meta WhatsApp Cloud API Service Helper
 * Direct integration with https://graph.facebook.com/
 * No third-party middlemen or local Docker containers required.
 */

import { SITE_URL } from "@/lib/site";

interface MetaConfig {
  token: string;
  phoneNumberId: string;
  apiVersion: string;
}

export function isWhatsAppDryRunKey(rawKey?: string | null): boolean {
  const k = (rawKey ?? "").trim().toLowerCase();
  if (!k) return false;
  return k.startsWith("dummy") || k.startsWith("re_dummy") || k === "test";
}

export function getWhatsAppConfigStatus(): {
  configured: boolean;
  dryRun: boolean;
  error?: string;
} {
  const token = (
    process.env.META_WA_TOKEN ||
    process.env.WHATSAPP_ACCESS_TOKEN ||
    ""
  ).trim();
  const phoneNumberId = (
    process.env.META_WA_PHONE_NUMBER_ID ||
    process.env.WHATSAPP_PHONE_NUMBER_ID ||
    ""
  ).trim();

  if (!token) {
    return { configured: false, dryRun: false, error: "whatsapp_not_configured" };
  }
  if (isWhatsAppDryRunKey(token) || isWhatsAppDryRunKey(phoneNumberId)) {
    return { configured: false, dryRun: true, error: "dry_run" };
  }
  if (!phoneNumberId) {
    return { configured: false, dryRun: false, error: "whatsapp_not_configured" };
  }
  return { configured: true, dryRun: false };
}

function getMetaConfig(): MetaConfig | null {
  const token = (
    process.env.META_WA_TOKEN ||
    process.env.WHATSAPP_ACCESS_TOKEN ||
    ""
  ).trim();
  const phoneNumberId = (
    process.env.META_WA_PHONE_NUMBER_ID ||
    process.env.WHATSAPP_PHONE_NUMBER_ID ||
    ""
  ).trim();
  const apiVersion = process.env.META_WA_API_VERSION || "v21.0";

  if (!token) {
    console.error(
      "[Meta WhatsApp] META_WA_TOKEN must be configured in environment",
    );
    return null;
  }
  if (isWhatsAppDryRunKey(token)) {
    return {
      token,
      phoneNumberId: phoneNumberId || "dummy_phone_id",
      apiVersion,
    };
  }
  if (!phoneNumberId) {
    console.error(
      "[Meta WhatsApp] META_WA_PHONE_NUMBER_ID must be configured in environment",
    );
    return null;
  }
  return {
    token,
    phoneNumberId,
    apiVersion,
  };
}

/**
 * Format phone number to clean E.164 digits without '+' or special symbols.
 * Default assumes Indian numbers (country code 91) if 10 digits are provided.
 */
export function formatMetaPhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  // If 10 digits starting with 6, 7, 8, 9, prepend India country code 91
  if (cleaned.length === 10 && /^[6-9]/.test(cleaned)) {
    cleaned = `91${cleaned}`;
  }
  return cleaned;
}

export interface WhatsAppSendResult {
  success: boolean;
  skipped?: boolean;
  dryRun?: boolean;
  messageId?: string;
  data?: unknown;
  error?: string;
}

function isDryRunConfig(config: MetaConfig): boolean {
  return (
    isWhatsAppDryRunKey(config.token) ||
    isWhatsAppDryRunKey(config.phoneNumberId)
  );
}

/**
 * Send a plain text message via Meta WhatsApp Cloud API
 */
export async function sendWhatsAppText(
  phone: string,
  message: string,
): Promise<WhatsAppSendResult> {
  try {
    const config = getMetaConfig();
    if (!config) {
      return {
        success: false,
        error: "whatsapp_not_configured",
      };
    }

    const recipientPhone = formatMetaPhone(phone);
    if (isDryRunConfig(config)) {
      return {
        success: false,
        dryRun: true,
        messageId: "dry_run_text",
        error:
          config.token === "dummy_wa_fail" || config.token === "dummy_text_fail"
            ? "Meta 24h window closed for free-text message (dryRun)"
            : "dry_run",
        data: { dryRun: true, to: recipientPhone, type: "text" },
      };
    }

    const endpoint = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`;

    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipientPhone,
      type: "text",
      text: {
        preview_url: false,
        body: message,
      },
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      const errorMsg = data?.error?.message || `Meta API Error (${res.status})`;
      const errorDetails =
        data?.error?.error_data?.details || data?.error?.error_subcode || "";
      console.warn(
        "[Meta WhatsApp] sendWhatsAppText failed:",
        errorMsg,
        errorDetails,
      );
      return {
        success: false,
        error: `${errorMsg} ${errorDetails}`.trim(),
        data,
      };
    }

    const messageId = data?.messages?.[0]?.id;
    return { success: true, messageId, data };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[Meta WhatsApp] Exception in sendWhatsAppText:", msg);
    return { success: false, error: msg };
  }
}

/**
 * Send a document / PDF / file via Meta WhatsApp Cloud API
 */
export async function sendWhatsAppFile(
  phone: string,
  fileUrl: string,
  filename: string,
  caption?: string,
): Promise<WhatsAppSendResult> {
  try {
    const config = getMetaConfig();
    if (!config) {
      return { success: false, error: "whatsapp_not_configured" };
    }

    const recipientPhone = formatMetaPhone(phone);
    if (isDryRunConfig(config)) {
      return {
        success: false,
        dryRun: true,
        messageId: "dry_run_file",
        error: "dry_run",
        data: { dryRun: true, to: recipientPhone, type: "document", filename },
      };
    }

    const endpoint = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`;

    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipientPhone,
      type: "document",
      document: {
        link: fileUrl,
        filename: filename,
        caption: caption || "",
      },
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      const errorMsg = data?.error?.message || `Meta API Error (${res.status})`;
      console.warn("[Meta WhatsApp] sendWhatsAppFile failed:", errorMsg);
      return { success: false, error: errorMsg, data };
    }

    const messageId = data?.messages?.[0]?.id;
    return { success: true, messageId, data };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[Meta WhatsApp] Exception in sendWhatsAppFile:", msg);
    return { success: false, error: msg };
  }
}

/**
 * Send an approved Meta Template Message
 * Required by Meta for initiating conversations outside the 24-hour service window.
 */
export async function sendWhatsAppTemplate(
  phone: string,
  templateName: string,
  languageCode: string = "en_US",
  components: unknown[] = [],
): Promise<WhatsAppSendResult> {
  try {
    const config = getMetaConfig();
    if (!config) {
      return { success: false, error: "whatsapp_not_configured" };
    }

    const recipientPhone = formatMetaPhone(phone);
    if (isDryRunConfig(config)) {
      return {
        success: false,
        dryRun: true,
        messageId: "dry_run_template",
        error:
          config.token === "dummy_wa_fail"
            ? "Simulated template failure (dryRun)"
            : "dry_run",
        data: { dryRun: true, to: recipientPhone, type: "template", templateName },
      };
    }

    const endpoint = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`;

    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipientPhone,
      type: "template",
      template: {
        name: templateName,
        language: {
          code: languageCode,
        },
        components: components.length > 0 ? components : undefined,
      },
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      const errorMsg =
        data?.error?.message || `Meta Template Error (${res.status})`;
      console.warn("[Meta WhatsApp] sendWhatsAppTemplate failed:", errorMsg);
      return { success: false, error: errorMsg, data };
    }

    const messageId = data?.messages?.[0]?.id;
    return { success: true, messageId, data };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[Meta WhatsApp] Exception in sendWhatsAppTemplate:", msg);
    return { success: false, error: msg };
  }
}

/**
 * Template Helper: Welcome Message for New Client
 */
export async function sendClientWelcomeMessage(
  phone: string,
  clientName: string,
) {
  const text =
    `👋 *Welcome to Aman Khurana Fitness!*\n\n` +
    `Hi ${clientName},\n` +
    `Coach Aman Khurana has added you to the client portal.\n\n` +
    `📋 Please complete your onboarding questionnaire to get started:\n` +
    `${SITE_URL}/onboarding\n\n` +
    `Let's get started on your transformation! 💪`;
  return sendWhatsAppText(phone, text);
}

/**
 * Template Helper: Check-in Reminder for Client
 */
export async function sendCheckinReminder(
  phone: string,
  clientName: string,
  checkinUrl: string = `${SITE_URL}/checkin`,
  dueDate?: string,
) {
  const name = (clientName || "").trim() || "there";
  const url = (checkinUrl || "").trim() || `${SITE_URL}/checkin`;
  const validDate = Boolean(dueDate && /^\d{4}-\d{2}-\d{2}$/.test(dueDate));
  const dateFormatted = validDate
    ? `${dueDate!.slice(8, 10)}-${dueDate!.slice(5, 7)}-${dueDate!.slice(0, 4)}`
    : dueDate || "your scheduled date";

  // 1. Primary: checkin_reminder_v2 (name, dd-MM-yyyy date, link)
  try {
    const v2Result = await sendWhatsAppTemplate(
      phone,
      "checkin_reminder_v2",
      "en",
      [
        {
          type: "body",
          parameters: [
            { type: "text", text: name },
            { type: "text", text: dateFormatted },
            { type: "text", text: url },
          ],
        },
      ],
    );

    if (v2Result.success && !v2Result.dryRun) {
      return v2Result;
    }
  } catch (err: unknown) {
    console.error(
      "[Meta WhatsApp] Exception sending template checkin_reminder_v2:",
      err instanceof Error ? err.message : err,
    );
  }

  // 2. Fallback to old "checkin_reminder" template (name, link)
  try {
    const templateResult = await sendWhatsAppTemplate(
      phone,
      "checkin_reminder",
      "en",
      [
        {
          type: "body",
          parameters: [
            { type: "text", text: name },
            { type: "text", text: url },
          ],
        },
      ],
    );

    if (templateResult.success && !templateResult.dryRun) {
      return templateResult;
    }

    console.error(
      "[Meta WhatsApp] Template checkin_reminder failed to send. Error:",
      templateResult.error || templateResult.data || "Unknown template error",
    );
  } catch (err: unknown) {
    console.error(
      "[Meta WhatsApp] Exception sending template checkin_reminder:",
      err instanceof Error ? err.message : err,
    );
  }

  // 3. Fallback to free-text send in Aman's own wording
  console.warn(
    "[Meta WhatsApp] Falling back to free-text message for check-in reminder in Aman's wording",
  );
  const text = `Dear ${name}, this is to Remind you that, Your Check - In / Feedback is scheduled for ${dateFormatted}, Kindly Make Sure to Fill Up the form Attached below Positively on your scheduled date, to Avoid Any Delay In Your Updated Plan.\n${url}\n\nRegards\nAman Khurana #teamAKF`;
  return sendWhatsAppText(phone, text);
}

export interface CoachAlertTarget {
  coachId?: string | null;
  clientId?: string | null;
  userId?: string | null;
  coachPhone?: string | null;
}

async function checkCoachNotifications(
  coachPhone: string,
  target?: string | CoachAlertTarget | null,
): Promise<boolean> {
  const { isCoachNotificationsEnabled } = await import(
    "@/lib/automation-delivery"
  );
  if (typeof target === "string") {
    return isCoachNotificationsEnabled({ coachId: target, coachPhone });
  }
  return isCoachNotificationsEnabled({ coachPhone, ...(target ?? {}) });
}

/**
 * Template Helper: Form Submission Alert for Coach
 */
export async function sendCoachSubmissionAlert(
  coachPhone: string,
  clientName: string,
  formType: string,
  target?: string | CoachAlertTarget | null,
): Promise<WhatsAppSendResult> {
  if (!(await checkCoachNotifications(coachPhone, target))) {
    return { success: false, skipped: true, error: "coach_notifications_off" };
  }

  const formLabels: Record<string, string> = {
    standard_joining: "Standard Joining Questionnaire",
    antenatal_joining: "AN-PN Pregnancy Questionnaire",
    checkin: "Check-in Form",
  };

  const text =
    `🚨 *NEW FORM SUBMISSION*\n\n` +
    `👤 Client: *${clientName}*\n` +
    `📋 Form: *${formLabels[formType] || formType}*\n` +
    `📅 Time: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}\n\n` +
    `🔗 Review Submission in Coach Portal:\n` +
    `${SITE_URL}/submissions`;
  return sendWhatsAppText(coachPhone, text);
}

/**
 * Template Helper: Alert Coach when a client sends a form
 */
export async function sendCoachFormAlert(
  coachPhone: string,
  formLabel: string,
  clientName: string,
  target?: string | CoachAlertTarget | null,
): Promise<WhatsAppSendResult> {
  if (!(await checkCoachNotifications(coachPhone, target))) {
    return { success: false, skipped: true, error: "coach_notifications_off" };
  }

  const formLabels: Record<string, string> = {
    standard_joining: "Standard Joining Questionnaire",
    antenatal_joining: "AN-PN Pregnancy Questionnaire",
    checkin: "Check-in Form",
    consultation_booking: "Consultation Call Booking",
  };

  const resolvedLabel = formLabels[formLabel] || formLabel || "Form Submission";
  const var1 = (resolvedLabel || "").trim() || "Form";
  const var2 = (clientName || "").trim() || "Client";
  const var3 = `${SITE_URL}/dashboard`;

  // Same alert on Aman's phone as a notification (WhatsApp alone was easy to miss)
  const { sendCoachPush } = await import("@/lib/server/coach-push");
  await sendCoachPush(`New ${var1}`, `${var2} just submitted it. Tap to open.`, formLabel === "checkin" ? "/checkins" : "/submissions");

  const components = [
    {
      type: "body",
      parameters: [
        { type: "text", text: var1 },
        { type: "text", text: var2 },
        { type: "text", text: var3 },
      ],
    },
  ];

  try {
    const templateResult = await sendWhatsAppTemplate(
      coachPhone,
      "client_form_received",
      "en",
      components,
    );

    if (templateResult.success) {
      return templateResult;
    }

    console.error(
      "[Meta WhatsApp] Template client_form_received failed to send. Error:",
      templateResult.error || templateResult.data || "Unknown template error",
    );
  } catch (err: unknown) {
    console.error(
      "[Meta WhatsApp] Exception sending template client_form_received:",
      err instanceof Error ? err.message : err,
    );
  }

  // Fallback to free-text send if template send fails
  console.warn(
    "[Meta WhatsApp] Falling back to free-text message for coach form alert",
  );
  const text =
    `🚨 *NEW FORM SUBMISSION*\n\n` +
    `👤 Client: *${var2}*\n` +
    `📋 Form: *${var1}*\n` +
    `📅 Time: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}\n\n` +
    `🔗 Review in Coach App:\n` +
    `${var3}`;
  return sendWhatsAppText(coachPhone, text);
}

/**
 * Alias helper: sendCoachAlert (checks specific coach notification setting)
 */
export const sendCoachAlert = sendCoachFormAlert;

/**
 * Template Helper: New Consultation Call Booking Alert for Coach
 */
export async function sendConsultationBookingAlert(
  coachPhone: string,
  name: string,
  phone: string,
  email: string,
  target?: string | CoachAlertTarget | null,
): Promise<WhatsAppSendResult> {
  if (!(await checkCoachNotifications(coachPhone, target))) {
    return { success: false, skipped: true, error: "coach_notifications_off" };
  }

  const text =
    `📞 *NEW CONSULTATION CALL BOOKED*\n\n` +
    `👤 Name: *${name}*\n` +
    `📱 Phone: ${phone}\n` +
    `✉️ Email: ${email || "—"}\n` +
    `📅 Time: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}\n\n` +
    `Payment proof uploaded — review in Coach Portal.`;
  return sendWhatsAppText(coachPhone, text);
}

/**
 * Template Helper: New General Enquiry Alert for Coach
 */
export async function sendEnquiryAlert(
  coachPhone: string,
  name: string,
  phone: string,
  interest: string,
  target?: string | CoachAlertTarget | null,
): Promise<WhatsAppSendResult> {
  if (!(await checkCoachNotifications(coachPhone, target))) {
    return { success: false, skipped: true, error: "coach_notifications_off" };
  }

  const var1 = (name || "").trim() || "Not given";
  const var2 = (phone || "").trim() || "Not given";
  const var3 = (interest || "").trim() || "Not given";

  const components = [
    {
      type: "body",
      parameters: [
        { type: "text", text: var1 },
        { type: "text", text: var2 },
        { type: "text", text: var3 },
      ],
    },
  ];

  try {
    const templateResult = await sendWhatsAppTemplate(
      coachPhone,
      "new_enquiry_alert",
      "en",
      components,
    );

    if (templateResult.success) {
      return templateResult;
    }

    console.error(
      "[Meta WhatsApp] Template new_enquiry_alert failed to send. Error:",
      templateResult.error || templateResult.data || "Unknown template error",
    );
  } catch (err: unknown) {
    console.error(
      "[Meta WhatsApp] Exception sending template new_enquiry_alert:",
      err instanceof Error ? err.message : err,
    );
  }

  // Fallback to free-text send if template send fails
  console.warn(
    "[Meta WhatsApp] Falling back to free-text message for enquiry alert",
  );
  const text =
    `📝 *NEW ENQUIRY*\n\n` +
    `👤 Name: *${name || "Not given"}*\n` +
    `📱 Phone: ${phone || "Not given"}\n` +
    `🎯 Interested In: ${interest || "—"}\n` +
    `📅 Time: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`;
  return sendWhatsAppText(coachPhone, text);
}

export type FeeReminderStage = "before" | "due" | "late"

/**
 * Template Helper: fee reminder to a client (before / on / after the due date).
 * No UPI or bank details in the text, only the /payments link (Aman's request).
 * Templates to create in Meta: fee_reminder_before, fee_reminder_due, fee_reminder_overdue
 * with body vars {{1}} full name, {{2}} package, {{3}} due date, {{4}} link. Falls back to free text.
 */
export async function sendFeeReminder(
  phone: string,
  fullName: string,
  packageName: string,
  dueDate: string,
  stage: FeeReminderStage,
  payLink?: string,
): Promise<WhatsAppSendResult> {
  const name = (fullName || "").trim() || "there"
  const pkg = (packageName || "").trim() || "your coaching"
  const link = payLink || `${SITE_URL}/payments`
  const templateName =
    stage === "before" ? "fee_reminder_before" : stage === "due" ? "fee_reminder_due" : "fee_reminder_overdue"

  const t = await sendWhatsAppTemplate(phone, templateName, "en", [
    {
      type: "body",
      parameters: [name, pkg, dueDate, link].map((text) => ({ type: "text", text })),
    },
  ])
  if (t.success && !t.dryRun) return t

  return sendWhatsAppText(phone, feeReminderText(fullName, packageName, dueDate, stage, link))
}

/** Exact fee reminder wording (same as the approved fee_reminder_* templates). Also shown to Aman before Remind sends. */
export function feeReminderText(fullName: string, packageName: string, dueDate: string, stage: FeeReminderStage, link: string) {
  const name = (fullName || "").trim() || "there"
  const pkg = (packageName || "").trim() || "your coaching"
  // Aman's own fee template (his old app), with the stage wording he asked for. No UPI/bank text: link only.
  const when =
    stage === "before" ? `will be due on ${dueDate}` : stage === "due" ? `is due on ${dueDate}` : `has been overdue since ${dueDate}`
  return `Dear ${name}, this is to Remind you that, Fee For your "${pkg}" package with Aman Khurana Fitness ${when}, kindly Timely Renew it, if you wish to continue with our services or if you wish to upgrade or change your package, kindly discuss with your Coach Aman Khurana for the same. Thank you.\n\nView your bill and pay here: ${link}\n\nThanks & Regards\n#teamAKF`
}

/**
 * Template Helper: client message forwarded to the coach.
 * Template-only (no free-text fallback) so the inbox can see the real result.
 * Template `client_message_alert` must be approved in Meta: body vars {{1}} name, {{2}} phone, {{3}} message.
 */
export async function sendClientMessageAlert(
  coachPhone: string,
  name: string,
  phone: string,
  message: string,
): Promise<WhatsAppSendResult> {
  const clean = (v: string, max: number) =>
    (v || "").replace(/[\r\n\t]+/g, " ").replace(/ {5,}/g, "    ").trim().slice(0, max) || "Not given";
  return sendWhatsAppTemplate(coachPhone, "client_message_alert", "en", [
    {
      type: "body",
      parameters: [
        { type: "text", text: clean(name, 60) },
        { type: "text", text: clean(phone, 30) },
        { type: "text", text: clean(message, 600) },
      ],
    },
  ]);
}

/**
 * Template Helper: Welcome Setup for New Client
 */
export async function sendWelcomeSetupTemplate(
  phone: string,
  name: string,
  setupUrl: string,
  onboardingUrl: string,
) {
  const var1 = (name || "").trim() || "Not given";
  const var2 = (setupUrl || "").trim() || "Not given";
  const var3 = (onboardingUrl || "").trim() || "Not given";

  const components = [
    {
      type: "body",
      parameters: [
        { type: "text", text: var1 },
        { type: "text", text: var2 },
        { type: "text", text: var3 },
      ],
    },
  ];

  try {
    const templateResult = await sendWhatsAppTemplate(
      phone,
      "client_welcome_v2",
      "en",
      components,
    );

    if (templateResult.success) {
      return templateResult;
    }

    console.error(
      "[Meta WhatsApp] Template client_welcome_v2 failed to send. Error:",
      templateResult.error || templateResult.data || "Unknown template error",
    );
  } catch (err: unknown) {
    console.error(
      "[Meta WhatsApp] Exception sending template client_welcome_v2:",
      err instanceof Error ? err.message : err,
    );
  }

  // Fallback to free-text send if template send fails
  console.warn(
    "[Meta WhatsApp] Falling back to free-text message for welcome setup",
  );
  const text =
    `Welcome to Aman Khurana Fitness! 🎉\n` +
    `Hi ${name}, set your password here: ${setupUrl}\n` +
    `Then complete your joining form: ${onboardingUrl}`;
  return sendWhatsAppText(phone, text);
}

/**
 * Template Helper: Check-in Reviewed for Client
 */
export async function sendCheckinReviewedTemplate(
  phone: string,
  name: string,
  link: string,
  feedback: string = "",
) {
  const var1 = (name || "").trim() || "Not given";
  const var2 = (link || "").trim() || "Not given";

  const components = [
    {
      type: "body",
      parameters: [
        { type: "text", text: var1 },
        { type: "text", text: var2 },
      ],
    },
  ];

  try {
    const templateResult = await sendWhatsAppTemplate(
      phone,
      "checkin_reviewed",
      "en",
      components,
    );

    if (templateResult.success) {
      return templateResult;
    }

    console.error(
      "[Meta WhatsApp] Template checkin_reviewed failed to send. Error:",
      templateResult.error || templateResult.data || "Unknown template error",
    );
  } catch (err: unknown) {
    console.error(
      "[Meta WhatsApp] Exception sending template checkin_reviewed:",
      err instanceof Error ? err.message : err,
    );
  }

  // Fallback to free-text send if template send fails
  console.warn(
    "[Meta WhatsApp] Falling back to free-text message for check-in reviewed",
  );
  const text = feedback
    ? `Hi ${name} 👋\n\nCoach Aman has reviewed your check-in.\n\nFeedback: ${feedback}`
    : `Hi ${name} 👋\n\nCoach Aman has reviewed your check-in.`;
  return sendWhatsAppText(phone, text);
}
