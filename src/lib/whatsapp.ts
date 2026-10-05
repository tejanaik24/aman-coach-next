/**
 * Official Meta WhatsApp Cloud API Service Helper
 * Direct integration with https://graph.facebook.com/
 * No third-party middlemen or local Docker containers required.
 */

const META_WA_TOKEN =
  process.env.META_WA_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN || "";
const META_WA_PHONE_NUMBER_ID =
  process.env.META_WA_PHONE_NUMBER_ID ||
  process.env.WHATSAPP_PHONE_NUMBER_ID ||
  "";
const META_WA_API_VERSION = process.env.META_WA_API_VERSION || "v21.0";

interface MetaConfig {
  token: string;
  phoneNumberId: string;
  apiVersion: string;
}

function getMetaConfig(): MetaConfig | null {
  const token =
    process.env.META_WA_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN || "";
  const phoneNumberId =
    process.env.META_WA_PHONE_NUMBER_ID ||
    process.env.WHATSAPP_PHONE_NUMBER_ID ||
    "";
  const apiVersion = process.env.META_WA_API_VERSION || "v21.0";

  if (!token || !phoneNumberId) {
    console.error(
      "[Meta WhatsApp] META_WA_TOKEN and META_WA_PHONE_NUMBER_ID must be configured in environment",
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
  messageId?: string;
  data?: any;
  error?: string;
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
        error:
          "Meta WhatsApp API is not configured (missing token or phone number ID)",
      };
    }

    const recipientPhone = formatMetaPhone(phone);
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
  } catch (error: any) {
    console.error(
      "[Meta WhatsApp] Exception in sendWhatsAppText:",
      error.message || error,
    );
    return { success: false, error: error.message || String(error) };
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
      return { success: false, error: "Meta WhatsApp API is not configured" };
    }

    const recipientPhone = formatMetaPhone(phone);
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
  } catch (error: any) {
    console.error(
      "[Meta WhatsApp] Exception in sendWhatsAppFile:",
      error.message || error,
    );
    return { success: false, error: error.message || String(error) };
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
  components: any[] = [],
): Promise<WhatsAppSendResult> {
  try {
    const config = getMetaConfig();
    if (!config) {
      return { success: false, error: "Meta WhatsApp API is not configured" };
    }

    const recipientPhone = formatMetaPhone(phone);
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
  } catch (error: any) {
    console.error(
      "[Meta WhatsApp] Exception in sendWhatsAppTemplate:",
      error.message || error,
    );
    return { success: false, error: error.message || String(error) };
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
    `https://aman-coach-next.vercel.app/onboarding\n\n` +
    `Let's get started on your transformation! 💪`;
  return sendWhatsAppText(phone, text);
}

/**
 * Template Helper: Check-in Reminder for Client
 */
export async function sendCheckinReminder(phone: string, clientName: string) {
  const text =
    `⏰ *WEEKLY CHECK-IN REMINDER*\n\n` +
    `Hi ${clientName},\n` +
    `Your weekly check-in is due! Regular check-ins help Coach Aman track your progress, measurements, and adjust your nutrition & training plans.\n\n` +
    `📝 Complete your check-in form now (takes ~3 mins):\n` +
    `https://aman-coach-next.vercel.app/checkin\n\n` +
    `Thank you!`;
  return sendWhatsAppText(phone, text);
}

/**
 * Template Helper: Form Submission Alert for Coach
 */
export async function sendCoachSubmissionAlert(
  coachPhone: string,
  clientName: string,
  formType: string,
) {
  const formLabels: Record<string, string> = {
    standard_joining: "Standard Joining Questionnaire",
    antenatal_joining: "AN-PN Pregnancy Questionnaire",
    checkin: "Weekly Check-in Form",
  };

  const text =
    `🚨 *NEW FORM SUBMISSION*\n\n` +
    `👤 Client: *${clientName}*\n` +
    `📋 Form: *${formLabels[formType] || formType}*\n` +
    `📅 Time: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}\n\n` +
    `🔗 Review Submission in Coach Portal:\n` +
    `https://aman-coach-next.vercel.app/submissions`;
  return sendWhatsAppText(coachPhone, text);
}

/**
 * Template Helper: New Consultation Call Booking Alert for Coach
 */
export async function sendConsultationBookingAlert(
  coachPhone: string,
  name: string,
  phone: string,
  email: string,
) {
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
) {
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
  } catch (err: any) {
    console.error(
      "[Meta WhatsApp] Exception sending template new_enquiry_alert:",
      err?.message || err,
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
