import { sendWhatsAppText } from "@/lib/whatsapp"
import { SITE_URL } from "@/lib/site"
import { generateUpiPaymentUrl } from "@/lib/payments"

/**
 * Server-only payment notification helpers (never imported by client components).
 */
export async function sendPaymentReminderWhatsApp(
  phone: string,
  clientName: string,
  amount: number,
  dueDateStr: string,
  reminderType: "1week_before" | "1day_before" | "1week_overdue"
) {
  let title = "⏰ PAYMENT REMINDER"
  let body = ""

  if (reminderType === "1week_before") {
    title = "⏰ *UPCOMING FEE REMINDER (1 Week Out)*"
    body = `Hi ${clientName}, your coaching fee of ₹${amount.toLocaleString("en-IN")} is due on *${dueDateStr}*.`
  } else if (reminderType === "1day_before") {
    title = "🚨 *PAYMENT DUE TOMORROW*"
    body = `Hi ${clientName}, your coaching fee of ₹${amount.toLocaleString("en-IN")} is due tomorrow (*${dueDateStr}*).`
  } else {
    title = "⚠️ *FEE OVERDUE REMINDER*"
    body = `Hi ${clientName}, your coaching fee payment of ₹${amount.toLocaleString("en-IN")} is past due date (*${dueDateStr}*). Please complete your payment.`
  }

  const upiLink = generateUpiPaymentUrl(amount, clientName, "REMINDER")
  const fullMsg = `${title}\n\n${body}\n\n📲 *Pay via UPI Link*:\n${upiLink}\n\nOr view details in portal:\n${SITE_URL}/payments`

  return sendWhatsAppText(phone, fullMsg)
}

