import { createClient } from "@supabase/supabase-js"
import { jsPDF } from "jspdf"
import { sendWhatsAppText, sendWhatsAppFile } from "./whatsapp"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Invoice = {
  id: string
  clientId: string
  feeId?: string
  invoiceNumber: string
  amount: number
  gstRate: number
  gstAmount: number
  totalAmount: number
  upiId: string
  paymentLink?: string
  status: "pending" | "paid" | "overdue"
  dueDate: string
  paidAt?: string
  notes?: string
  clientName?: string
  clientPhone?: string
  createdAt: string
}

export const DEFAULT_UPI_ID = "amankhurana@upi"

/**
 * Generate a standard UPI payment URL link
 */
export function generateUpiPaymentUrl(amount: number, clientName: string, refId: string): string {
  const upiId = process.env.AMAN_UPI_ID || DEFAULT_UPI_ID
  const name = encodeURIComponent("Aman Khurana Fitness")
  const note = encodeURIComponent(`Coaching Fee - ${clientName} (${refId})`)
  return `upi://pay?pa=${upiId}&pn=${name}&am=${amount}&cu=INR&tn=${note}`
}

/**
 * Fetch all invoices / fees for Coach Ledger
 */
export async function getAllInvoices(): Promise<Invoice[]> {
  try {
    const { data, error } = await supabase
      .from("invoices")
      .select("*, clients(id, user_id, profiles!user_id(name, phone))")
      .order("due_date", { ascending: false })
    if (error) console.error("getAllInvoices failed:", error.message)

    if (data && data.length > 0) {
      return data.map((inv: any) => {
        const clientProfile = inv.clients?.profiles as any
        return {
          id: inv.id,
          clientId: inv.client_id,
          feeId: inv.fee_id,
          invoiceNumber: inv.invoice_number,
          amount: Number(inv.amount),
          gstRate: Number(inv.gst_rate || 18),
          gstAmount: Number(inv.gst_amount || 0),
          totalAmount: Number(inv.total_amount),
          upiId: inv.upi_id || DEFAULT_UPI_ID,
          paymentLink: inv.payment_link || generateUpiPaymentUrl(Number(inv.total_amount), clientProfile?.name || "Client", inv.invoice_number),
          status: inv.status,
          dueDate: inv.due_date,
          paidAt: inv.paid_at,
          notes: inv.notes,
          clientName: clientProfile?.name || "Client",
          clientPhone: clientProfile?.phone || "",
          createdAt: inv.created_at
        }
      })
    }
  } catch (e) {
    console.warn("Invoice fetch note:", e)
  }
  return []
}

/**
 * Generate GST Tax Invoice PDF as Data URI or blob
 */
export function generateGstInvoicePdf(inv: Invoice): jsPDF {
  const doc = new jsPDF()

  // Header background
  doc.setFillColor(10, 10, 10)
  doc.rect(0, 0, 210, 45, "F")

  // Brand Name
  doc.setTextColor(255, 184, 0) // Gold
  doc.setFontSize(20)
  doc.setFont("helvetica", "bold")
  doc.text("AMAN KHURANA FITNESS", 15, 22)

  doc.setTextColor(200, 200, 200)
  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.text("Official GST Tax Invoice & Receipt", 15, 30)
  doc.text("GSTIN: 03AAAAA0000A1Z5 | Reg: Punjab, India", 15, 36)

  // Invoice Details Box
  doc.setDrawColor(220, 220, 220)
  doc.setFillColor(248, 248, 248)
  doc.roundedRect(15, 55, 180, 35, 3, 3, "FD")

  doc.setTextColor(40, 40, 40)
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.text(`INVOICE #: ${inv.invoiceNumber}`, 22, 67)
  doc.text(`DATE: ${new Date(inv.createdAt).toLocaleDateString("en-IN")}`, 22, 75)
  doc.text(`DUE DATE: ${new Date(inv.dueDate).toLocaleDateString("en-IN")}`, 22, 83)

  doc.text(`CLIENT: ${inv.clientName || "Valued Client"}`, 110, 67)
  doc.text(`STATUS: ${inv.status.toUpperCase()}`, 110, 75)
  doc.text(`PAYMENT METHOD: UPI`, 110, 83)

  // Items Table
  doc.setFillColor(10, 10, 10)
  doc.rect(15, 100, 180, 10, "F")
  doc.setTextColor(255, 184, 0)
  doc.setFontSize(9)
  doc.setFont("helvetica", "bold")
  doc.text("DESCRIPTION", 22, 106.5)
  doc.text("BASE AMOUNT", 110, 106.5)
  doc.text("GST (18%)", 145, 106.5)
  doc.text("TOTAL (INR)", 175, 106.5)

  doc.setTextColor(50, 50, 50)
  doc.setFont("helvetica", "normal")
  doc.text("1-on-1 Fitness & Nutrition Coaching Package", 22, 118)
  doc.text(`INR ${inv.amount.toFixed(2)}`, 110, 118)
  doc.text(`INR ${inv.gstAmount.toFixed(2)}`, 145, 118)
  doc.text(`INR ${inv.totalAmount.toFixed(2)}`, 175, 118)

  doc.setDrawColor(200, 200, 200)
  doc.line(15, 125, 195, 125)

  // Total Summary
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(10, 10, 10)
  doc.text("TOTAL AMOUNT PAID:", 110, 138)
  doc.setTextColor(218, 165, 32)
  doc.text(`INR ${inv.totalAmount.toLocaleString("en-IN")}`, 165, 138)

  // Footer
  doc.setFontSize(8)
  doc.setTextColor(120, 120, 120)
  doc.setFont("helvetica", "italic")
  doc.text("Thank you for choosing Aman Khurana Fitness. For queries, contact info@amankhuranafitness.com", 105, 160, { align: "center" })

  return doc
}

/**
 * Mark Invoice / Fee as Paid & Send WhatsApp Receipt
 */
export async function markInvoicePaid(invId: string, clientName: string, clientPhone?: string): Promise<boolean> {
  const paidAt = new Date().toISOString()
  try {
    await supabase.from("invoices").update({ status: "paid", paid_at: paidAt }).eq("id", invId)
    await supabase.from("fees").update({ status: "paid", paid_date: paidAt.split("T")[0] }).eq("id", invId)

    if (clientPhone) {
      const msg = `✅ *PAYMENT RECEIVED & CONFIRMED*\n\n` +
        `Hi ${clientName},\n` +
        `We have received your coaching fee payment.\n\n` +
        `📄 Your official GST Tax Receipt is available in your client portal:\n` +
        `https://aman-coach-next.vercel.app/payments\n\n` +
        `Thank you!`
      sendWhatsAppText(clientPhone, msg).catch(e => console.error("Payment WA receipt note:", e))
    }
    return true
  } catch (e) {
    console.error("Mark paid error:", e)
    return false
  }
}

/**
 * Send WhatsApp Payment Reminders (1 week before, 1 day before, 1 week overdue)
 */
export async function sendPaymentReminderWhatsApp(phone: string, clientName: string, amount: number, dueDateStr: string, reminderType: "1week_before" | "1day_before" | "1week_overdue") {
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
  const fullMsg = `${title}\n\n${body}\n\n📲 *Pay via UPI Link*:\n${upiLink}\n\nOr view details in portal:\nhttps://aman-coach-next.vercel.app/payments`

  return sendWhatsAppText(phone, fullMsg)
}
