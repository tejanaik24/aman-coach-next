/**
 * WhatsApp Service helper via WAHA (WhatsApp HTTP API)
 */

const WAHA_URL = process.env.WAHA_URL || "http://localhost:3000"
const WAHA_SESSION = process.env.WAHA_SESSION || "aman-coach"
const WAHA_API_KEY = process.env.WAHA_API_KEY || "aman-coach"

function formatJid(phone: string): string {
  const cleaned = phone.replace(/\D/g, "")
  if (cleaned.endsWith("@c.us")) return cleaned
  return `${cleaned}@c.us`
}

/**
 * Send a plain text WhatsApp message via WAHA
 */
export async function sendWhatsAppText(phone: string, message: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const chatId = formatJid(phone)
    const res = await fetch(`${WAHA_URL}/api/sendText`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": WAHA_API_KEY
      },
      body: JSON.stringify({
        chatId,
        text: message,
        session: WAHA_SESSION
      })
    })

    if (!res.ok) {
      const errText = await res.text()
      console.warn(`[WAHA] sendText failed (${res.status}):`, errText)
      return { success: false, error: errText }
    }

    const data = await res.json()
    return { success: true, data }
  } catch (error: any) {
    console.error("[WAHA] Error sending text:", error.message || error)
    return { success: false, error: error.message || String(error) }
  }
}

/**
 * Send a file / PDF via WAHA
 */
export async function sendWhatsAppFile(phone: string, fileUrl: string, filename: string, caption?: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const chatId = formatJid(phone)
    const res = await fetch(`${WAHA_URL}/api/sendFile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": WAHA_API_KEY
      },
      body: JSON.stringify({
        chatId,
        file: {
          url: fileUrl,
          filename: filename
        },
        caption: caption || "",
        session: WAHA_SESSION
      })
    })

    if (!res.ok) {
      const errText = await res.text()
      console.warn(`[WAHA] sendFile failed (${res.status}):`, errText)
      return { success: false, error: errText }
    }

    const data = await res.json()
    return { success: true, data }
  } catch (error: any) {
    console.error("[WAHA] Error sending file:", error.message || error)
    return { success: false, error: error.message || String(error) }
  }
}

/**
 * Template: Welcome Message for New Client
 */
export async function sendClientWelcomeMessage(phone: string, clientName: string) {
  const text = `👋 *Welcome to Aman Khurana Fitness!*\n\n` +
    `Hi ${clientName},\n` +
    `Coach Aman Khurana has added you to the client portal.\n\n` +
    `📋 Please complete your onboarding questionnaire to get started:\n` +
    `https://aman-coach-next.vercel.app/onboarding\n\n` +
    `Let's get started on your transformation! 💪`
  return sendWhatsAppText(phone, text)
}

/**
 * Template: Check-in Reminder for Client
 */
export async function sendCheckinReminder(phone: string, clientName: string) {
  const text = `⏰ *WEEKLY CHECK-IN REMINDER*\n\n` +
    `Hi ${clientName},\n` +
    `Your weekly check-in is due! Regular check-ins help Coach Aman track your progress, measurements, and adjust your nutrition & training plans.\n\n` +
    `📝 Complete your check-in form now (takes ~3 mins):\n` +
    `https://aman-coach-next.vercel.app/checkin\n\n` +
    `Thank you!`
  return sendWhatsAppText(phone, text)
}

/**
 * Template: Form Submission Alert for Coach
 */
export async function sendCoachSubmissionAlert(coachPhone: string, clientName: string, formType: string) {
  const formLabels: Record<string, string> = {
    standard_joining: "Standard Joining Questionnaire",
    antenatal_joining: "AN-PN Pregnancy Questionnaire",
    checkin: "Weekly Check-in Form"
  }

  const text = `🚨 *NEW FORM SUBMISSION*\n\n` +
    `👤 Client: *${clientName}*\n` +
    `📋 Form: *${formLabels[formType] || formType}*\n` +
    `📅 Time: ${new Date().toLocaleString("en-IN")}\n\n` +
    `🔗 Review Submission in Coach Portal:\n` +
    `https://aman-coach-next.vercel.app/submissions`
  return sendWhatsAppText(coachPhone, text)
}

/**
 * Template: New Consultation Call Booking Alert for Coach
 */
export async function sendConsultationBookingAlert(coachPhone: string, name: string, phone: string, email: string) {
  const text = `📞 *NEW CONSULTATION CALL BOOKED*\n\n` +
    `👤 Name: *${name}*\n` +
    `📱 Phone: ${phone}\n` +
    `✉️ Email: ${email || "—"}\n` +
    `📅 Time: ${new Date().toLocaleString("en-IN")}\n\n` +
    `Payment proof uploaded — review in Coach Portal.`
  return sendWhatsAppText(coachPhone, text)
}

/**
 * Template: New General Enquiry Alert for Coach
 */
export async function sendEnquiryAlert(coachPhone: string, name: string, phone: string, interest: string) {
  const text = `📝 *NEW ENQUIRY*\n\n` +
    `👤 Name: *${name}*\n` +
    `📱 Phone: ${phone}\n` +
    `🎯 Interested In: ${interest || "—"}\n` +
    `📅 Time: ${new Date().toLocaleString("en-IN")}`
  return sendWhatsAppText(coachPhone, text)
}
