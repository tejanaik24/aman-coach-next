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
  memberNumber?: number
  packageName?: string
  startDate?: string
  endDate?: string
  otherCharges?: number
  discount?: number
  rewardPointsRedeemed?: number
  amountPaid?: number
}

export const DEFAULT_UPI_ID = "9815690656@upi"

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

let cachedReceiptLogo: string | null = null
async function getReceiptLogoBase64(): Promise<string | null> {
  if (cachedReceiptLogo !== null) return cachedReceiptLogo
  try {
    const res = await fetch("/images/aman/logo.jpg")
    const blob = await res.blob()
    cachedReceiptLogo = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve((reader.result as string).split(",")[1])
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch {
    cachedReceiptLogo = ""
  }
  return cachedReceiptLogo || null
}

const TERMS_AND_CONDITIONS = [
  "1. Payment once made will be non-refundable.",
  "2. The Above Start & End Dates are set on the bases of the Day You Received Your First Plan, not on the bases of the Date of payment Received.",
  "3. After you receive your plans, if you do not follow the plans due to any reasons, it will be completely on you, neither the payment nor any number of days will be adjusted or extended on request for the same.",
  "4. Payment or any number of days will only be adjusted or extended if there will be any delay (More than 1 week) in the updation of your plans from \"OUR END\" due to any unavoidable circumstances (You will get informed for the same).",
  "5. At times of unavoidable circumstances or medical emergencies On \"YOUR END\", keeping your Enrollment \"ON HOLD\" will only be accepted for minimum 1 Month Period (not less than 1 month) with prior notice & authentication (Holding Period will be Valid for 3 Months only).",
]

function fmtDate(d?: string): string {
  if (!d) return "-"
  const parsed = new Date(d)
  if (isNaN(parsed.getTime())) return "-"
  return parsed.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

/**
 * Generate the full itemized Payment Receipt / Invoice PDF, matching Aman's
 * established invoice format: Client Detail / Description / Billing Detail
 * sections, pending-amount line, and the real Terms & Conditions.
 */
export async function generatePaymentReceiptPdf(inv: Invoice): Promise<jsPDF> {
  const doc = new jsPDF()
  const left = 16
  const right = 194
  const width = right - left
  const orange: [number, number, number] = [255, 106, 26]
  const black: [number, number, number] = [15, 13, 12]
  const gray: [number, number, number] = [100, 100, 100]

  const otherCharges = inv.otherCharges ?? 0
  const discount = inv.discount ?? 0
  const rewardPointsRedeemed = inv.rewardPointsRedeemed ?? 0
  const amountPaid = inv.amountPaid ?? 0
  const subtotal = inv.amount + otherCharges
  const netPayable = subtotal - discount - rewardPointsRedeemed
  const pendingAmount = Math.max(netPayable - amountPaid, 0)
  const isPaid = pendingAmount <= 0

  // Logo + brand (top left)
  const logoBase64 = await getReceiptLogoBase64()
  if (logoBase64) {
    doc.addImage(`data:image/jpeg;base64,${logoBase64}`, "JPEG", left, 14, 16, 16)
  }
  const brandX = logoBase64 ? left + 20 : left
  doc.setTextColor(...black)
  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.text("AMAN KHURANA", brandX, 21)
  doc.setTextColor(...gray)
  doc.setFontSize(7.5)
  doc.setFont("helvetica", "normal")
  doc.text("FITNESS & NUTRITION COACHING", brandX, 26)

  // Diagonal ribbon + "INVOICE" title (top right)
  const ribbonY = 12
  const ribbonH = 14
  doc.setFillColor(...orange)
  doc.triangle(115, ribbonY, 128, ribbonY, 115, ribbonY + ribbonH, "F")
  doc.rect(128, ribbonY, right - 128, ribbonH, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(19)
  doc.setFont("helvetica", "bold")
  doc.text("INVOICE", right - 2, ribbonY + ribbonH - 4, { align: "right" })

  let y = 40
  doc.setDrawColor(225, 225, 225)
  doc.setLineWidth(0.3)
  doc.line(left, y, right, y)
  y += 8

  // Invoice to / Invoice # + Date
  doc.setTextColor(...gray)
  doc.setFontSize(8)
  doc.setFont("helvetica", "bold")
  doc.text("INVOICE TO:", left, y)
  doc.setFont("helvetica", "normal")
  doc.text("Invoice#", 130, y)
  doc.text("Date", 130, y + 5)

  doc.setTextColor(...black)
  doc.setFont("helvetica", "bold")
  doc.text(inv.invoiceNumber, 155, y)
  doc.setFont("helvetica", "normal")
  doc.text(fmtDate(inv.createdAt), 155, y + 5)

  y += 5
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.text(inv.clientName || "Valued Client", left, y)
  y += 5
  doc.setFontSize(8.5)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(...gray)
  if (inv.clientPhone) { doc.text(inv.clientPhone, left, y); y += 4.5 }
  doc.text(`Member ID: ${inv.memberNumber ?? "-"}`, left, y)
  y += 12

  // Item table
  const col = { sl: left, item: left + 10, start: 115, end: 148, total: right }
  doc.setFillColor(...black)
  doc.rect(left, y, width, 8, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(8)
  doc.setFont("helvetica", "bold")
  doc.text("SL.", col.sl + 2, y + 5.3)
  doc.text("ITEM DESCRIPTION", col.item, y + 5.3)
  doc.text("START", col.start, y + 5.3)
  doc.text("END", col.end, y + 5.3)
  doc.text("AMOUNT", col.total - 2, y + 5.3, { align: "right" })
  y += 8

  type LineItem = { label: string; amount: number }
  const items: LineItem[] = [
    { label: inv.packageName || "Coaching Package", amount: inv.amount },
  ]
  if (otherCharges) items.push({ label: "Other Charges", amount: otherCharges })
  if (discount) items.push({ label: "Discount", amount: -discount })
  if (rewardPointsRedeemed) items.push({ label: "Reward Points Redeemed", amount: -rewardPointsRedeemed })

  items.forEach((item, i) => {
    const rowH = 9
    if (i % 2 === 1) {
      doc.setFillColor(245, 245, 245)
      doc.rect(left, y, width, rowH, "F")
    }
    doc.setTextColor(...black)
    doc.setFontSize(8.5)
    doc.setFont("helvetica", "normal")
    doc.text(String(i + 1), col.sl + 2, y + 6)
    doc.text(item.label, col.item, y + 6)
    if (i === 0) {
      doc.text(fmtDate(inv.startDate), col.start, y + 6)
      doc.text(fmtDate(inv.endDate), col.end, y + 6)
    }
    doc.text(`${item.amount < 0 ? "-" : ""}INR ${Math.abs(item.amount).toFixed(2)}`, col.total - 2, y + 6, { align: "right" })
    y += rowH
  })
  doc.setDrawColor(225, 225, 225)
  doc.line(left, y, right, y)
  y += 8

  // Totals block (bottom right)
  const labelX = 140
  function totalRow(label: string, value: string, bold = false) {
    doc.setTextColor(...(bold ? black : gray))
    doc.setFontSize(9)
    doc.setFont("helvetica", bold ? "bold" : "normal")
    doc.text(label, labelX, y)
    doc.text(value, right - 2, y, { align: "right" })
    y += 6
  }
  totalRow("Sub Total:", `INR ${subtotal.toFixed(2)}`)
  if (discount) totalRow("Discount:", `- INR ${discount.toFixed(2)}`)
  if (rewardPointsRedeemed) totalRow("Reward Points:", `- INR ${rewardPointsRedeemed.toFixed(2)}`)
  totalRow("Amount Paid:", `INR ${amountPaid.toFixed(2)}`)
  y += 1

  doc.setFillColor(...(isPaid ? [60, 180, 90] as [number, number, number] : orange))
  doc.rect(labelX - 4, y - 5, right - labelX + 4, 9, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.text(isPaid ? "PAID IN FULL" : "Balance Due:", labelX, y + 1)
  doc.text(`INR ${pendingAmount.toFixed(2)}`, right - 2, y + 1, { align: "right" })
  y += 16

  // Terms & Conditions + Payment Info (bottom left), aligned with totals block
  const bottomBlockTop = y - 32
  let ty = bottomBlockTop
  doc.setTextColor(...black)
  doc.setFontSize(9)
  doc.setFont("helvetica", "bold")
  doc.text("Thank you for choosing #teamAKF", left, ty)
  ty += 6

  doc.setFontSize(8.5)
  doc.setFont("helvetica", "bold")
  doc.text("Terms & Conditions", left, ty)
  ty += 4
  doc.setFontSize(6.3)
  doc.setFont("helvetica", "italic")
  doc.setTextColor(190, 60, 40)
  for (const clause of TERMS_AND_CONDITIONS) {
    const lines = doc.splitTextToSize(clause, 105)
    doc.text(lines, left, ty)
    ty += lines.length * 2.9 + 1.2
  }
  y = Math.max(y, ty + 4)

  // Authorised Sign
  doc.setDrawColor(...gray)
  doc.setLineWidth(0.3)
  doc.line(right - 45, y, right, y)
  doc.setTextColor(...gray)
  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.text("Authorised Sign", right - 22.5, y + 5, { align: "center" })
  y += 16

  // Footer
  doc.setDrawColor(...orange)
  doc.setLineWidth(1.2)
  doc.line(left, 280, right, 280)
  doc.setTextColor(...gray)
  doc.setFontSize(7.5)
  doc.setFont("helvetica", "normal")
  doc.text("+91 98156 90656  |  Chandigarh, India  |  www.amankhuranafitness.com", 105, 286, { align: "center" })

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
        `📄 Your payment receipt is available in your client portal:\n` +
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
