import { createClient } from "@supabase/supabase-js"
import type { jsPDF as JsPDFType } from "jspdf"
import { createClient as createSessionClient } from "@/lib/supabase/client"
import { COACH_UPI_ID, COACH_UPI_NAME, COACH_BANK, generateUpiLink } from "@/lib/upi"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Invoice = {
  id: string
  clientId: string
  feeId?: string
  invoiceNumber: string
  packageFee?: number
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
  currency?: string
}

export const DEFAULT_UPI_ID = COACH_UPI_ID

/**
 * Generate a standard UPI payment URL link
 */
export function generateUpiPaymentUrl(amount: number, clientName: string, refId: string): string {
  return generateUpiLink(amount, `Coaching Fee ${clientName} ${refId}`)
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
      return (data as Record<string, unknown>[]).map((inv) => {
        const clientsRel = inv.clients as { profiles?: { name?: string; phone?: string } } | null | undefined
        const clientProfile = clientsRel?.profiles
        return {
          id: String(inv.id),
          clientId: String(inv.client_id),
          feeId: inv.fee_id ? String(inv.fee_id) : undefined,
          invoiceNumber: String(inv.invoice_number),
          amount: Number(inv.amount),
          gstRate: Number(inv.gst_rate || 18),
          gstAmount: Number(inv.gst_amount || 0),
          totalAmount: Number(inv.total_amount),
          upiId: COACH_UPI_ID,
          paymentLink: generateUpiPaymentUrl(Number(inv.total_amount), clientProfile?.name || "Client", String(inv.invoice_number)),
          status: (inv.status as "pending" | "paid" | "overdue") || "pending",
          dueDate: String(inv.due_date),
          paidAt: inv.paid_at ? String(inv.paid_at) : undefined,
          notes: inv.notes ? String(inv.notes) : undefined,
          clientName: clientProfile?.name || "Client",
          clientPhone: clientProfile?.phone || "",
          createdAt: String(inv.created_at),
        }
      })
    }
  } catch (e) {
    console.warn("Invoice fetch note:", e)
  }
  return []
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return typeof btoa === "function" ? btoa(binary) : Buffer.from(bytes).toString("base64")
}

let cachedReceiptLogo: string | null = null
async function getReceiptLogoBase64(): Promise<string | null> {
  if (cachedReceiptLogo !== null) return cachedReceiptLogo
  try {
    const res = await fetch("/images/aman/logo.jpg")
    if (!res.ok) throw new Error("Failed to fetch logo")
    const buf = await res.arrayBuffer()
    cachedReceiptLogo = arrayBufferToBase64(buf)
  } catch {
    cachedReceiptLogo = ""
  }
  return cachedReceiptLogo || null
}

let cachedSignatureImg: string | null = null
async function getSignatureBase64(): Promise<string | null> {
  if (cachedSignatureImg !== null) return cachedSignatureImg
  try {
    const res = await fetch("/images/aman/signature.png")
    if (!res.ok) throw new Error("Failed to fetch signature")
    const buf = await res.arrayBuffer()
    cachedSignatureImg = arrayBufferToBase64(buf)
  } catch {
    cachedSignatureImg = ""
  }
  return cachedSignatureImg || null
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

function sanitizePdfText(s?: string | null): string {
  return (s || "")
    .replace(/\u20B9/g, "INR ")
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212\u2022\u00B7]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ")
    .replace(/[^\x20-\x7E]/g, "-")
}

/**
 * Generate the full itemized Payment Receipt / Invoice PDF, matching Aman's
 * established invoice format: Client Detail / Description / Billing Detail
 * sections, pending-amount line, and the real Terms & Conditions.
 */
export async function generatePaymentReceiptPdf(inv: Invoice): Promise<JsPDFType> {
  const { jsPDF } = await import("jspdf")
  const doc = new jsPDF()
  const left = 14
  const right = 196
  const width = right - left
  const gold: [number, number, number] = [218, 165, 32] // #DAA520 Luxury Dark Gold
  const amber: [number, number, number] = [255, 184, 0] // #FFB800
  const black: [number, number, number] = [18, 18, 18]
  const gray: [number, number, number] = [95, 95, 95]
  const lightGray: [number, number, number] = [248, 248, 248]

  const otherCharges = Number(inv.otherCharges ?? 0)
  const discount = Number(inv.discount ?? 0)
  const rewardPointsRedeemed = Number(inv.rewardPointsRedeemed ?? 0)
  const rawPaid = Number(inv.amountPaid ?? 0)
  // inv.amount is the final payable amount (packageFee - discount + otherCharges - rewardPointsRedeemed).
  // If packageFee is explicitly provided, use it; otherwise derive packageFee from amount + discount - otherCharges + rewardPointsRedeemed.
  const basePackageFee =
    inv.packageFee !== undefined && Number(inv.packageFee) > 0
      ? Number(inv.packageFee)
      : Number(inv.amount) + discount - otherCharges + rewardPointsRedeemed
  const finalAmount = Math.max(basePackageFee + otherCharges - discount - rewardPointsRedeemed, 0)
  const effectivePaid = inv.status === "paid" ? Math.max(rawPaid, finalAmount) : rawPaid
  const pendingAmount = inv.status === "paid" ? 0 : Math.max(finalAmount - effectivePaid, 0)
  const isPaid = inv.status === "paid" || pendingAmount <= 0

  const resolvedInvoiceNumber =
    (inv.invoiceNumber && inv.invoiceNumber.trim()) ||
    (inv.memberNumber !== undefined && inv.memberNumber !== null
      ? String(inv.memberNumber).padStart(5, "0")
      : "00001")

  // Currency resolution (Task B5)
  const curr = (inv.currency || "INR").toUpperCase()
  const CURRENCY_SYMBOLS: Record<string, string> = {
    INR: "INR",
    USD: "$",
    EUR: "EUR",
    GBP: "GBP",
    AED: "AED",
    CAD: "CAD",
  }
  const currSym = CURRENCY_SYMBOLS[curr] || curr
  const fmtCurr = (val: number) => {
    const sign = val < 0 ? "- " : ""
    return `${sign}${currSym} ${Math.abs(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  // Top Accent Bar
  doc.setFillColor(...gold)
  doc.rect(left, 10, width, 2.5, "F")

  // Logo + brand (top left)
  const logoBase64 = await getReceiptLogoBase64()
  if (logoBase64) {
    doc.addImage(`data:image/jpeg;base64,${logoBase64}`, "JPEG", left, 16, 18, 18, undefined, "FAST")
  }
  const brandX = logoBase64 ? left + 22 : left
  doc.setTextColor(...black)
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text("AMAN KHURANA FITNESS", brandX, 24)
  doc.setTextColor(...gray)
  doc.setFontSize(8.5)
  doc.setFont("helvetica", "normal")
  doc.text("ELITE 1-ON-1 NUTRITION & PHYSIQUE COACHING", brandX, 30)

  // Top Right: Modern INVOICE badge
  const badgeW = 55
  const badgeH = 16
  const badgeX = right - badgeW
  doc.setFillColor(...black)
  doc.roundedRect(badgeX, 16, badgeW, badgeH, 3, 3, "F")
  doc.setTextColor(...amber)
  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.text("OFFICIAL INVOICE", badgeX + badgeW / 2, 26.5, { align: "center" })

  let y = 44
  doc.setDrawColor(230, 230, 230)
  doc.setLineWidth(0.4)
  doc.line(left, y, right, y)
  y += 7

  // Client Info & Invoice Meta Grid
  doc.setTextColor(...gray)
  doc.setFontSize(8.5)
  doc.setFont("helvetica", "bold")
  doc.text("BILLED TO:", left, y)
  doc.text("INVOICE DETAILS:", 128, y)

  y += 5
  const detailsStartY = y

  doc.setTextColor(...black)
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  const clientNameLines: string[] = doc.splitTextToSize(
    sanitizePdfText(inv.clientName) || "Valued Athlete",
    108
  )
  doc.text(clientNameLines, left, detailsStartY)
  let leftY = detailsStartY + (clientNameLines.length - 1) * 5

  leftY += 5
  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(...gray)
  if (inv.clientPhone) {
    doc.text(`Phone: ${sanitizePdfText(inv.clientPhone)}`, left, leftY)
  }

  leftY += 5
  doc.setFont("helvetica", "normal")
  doc.setTextColor(...gray)
  doc.text(`Member ID: ${inv.memberNumber ?? "-"}`, left, leftY)

  // Show package start & end date clearly (Task B5)
  if (inv.startDate || inv.endDate) {
    leftY += 5
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...gold)
    doc.text(`Package Duration: ${fmtDate(inv.startDate)} - ${fmtDate(inv.endDate)}`, left, leftY)
  }

  // Right side: Invoice #, Issue Date, Due Date
  let rightY = detailsStartY
  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(...gray)
  doc.text("Invoice #:", 128, rightY)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...black)
  doc.text(sanitizePdfText(resolvedInvoiceNumber), 155, rightY)

  rightY += 5
  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(...gray)
  doc.text("Issue Date:", 128, rightY)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...black)
  doc.text(fmtDate(inv.createdAt), 155, rightY)

  rightY += 5
  doc.setFont("helvetica", "normal")
  doc.setTextColor(...gray)
  doc.text("Due Date:", 128, rightY)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...black)
  doc.text(fmtDate(inv.dueDate), 155, rightY)

  y = Math.max(leftY, rightY) + 10

  // Item table header (4 columns: SL. | PACKAGE & DESCRIPTION | PACKAGE DURATION | AMOUNT)
  const col = { sl: left, item: left + 12, dates: 110, total: right }
  doc.setFillColor(...black)
  doc.rect(left, y, width, 9, "F")
  doc.setFillColor(...gold)
  doc.rect(left, y + 8.5, width, 0.7, "F") // Gold bottom rule
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.setFont("helvetica", "bold")
  doc.text("SL.", col.sl + 3, y + 6)
  doc.text("PACKAGE & DESCRIPTION", col.item, y + 6)
  doc.text("PACKAGE DURATION", col.dates, y + 6)
  doc.text("AMOUNT", col.total - 3, y + 6, { align: "right" })
  y += 10

  type LineItem = { label: string; amount: number; isMainPackage?: boolean }
  const items: LineItem[] = [
    { label: sanitizePdfText(inv.packageName) || "Personalized Fitness & Nutrition Coaching", amount: basePackageFee, isMainPackage: true },
  ]
  if (otherCharges > 0) items.push({ label: "Add-on / Other Charges", amount: otherCharges })

  const maxItemLabelWidth = col.dates - col.item - 12 // 72mm safe width before PACKAGE DURATION column
  items.forEach((item, i) => {
    doc.setFontSize(9.5)
    doc.setFont("helvetica", "normal")
    const wrappedLabel: string[] = doc.splitTextToSize(sanitizePdfText(item.label), maxItemLabelWidth)
    const rowH = Math.max(11, wrappedLabel.length * 4.5 + 5.5)
    if (i % 2 === 1) {
      doc.setFillColor(...lightGray)
      doc.rect(left, y, width, rowH, "F")
    }
    doc.setTextColor(...black)
    doc.setFontSize(9.5)
    doc.setFont("helvetica", "normal")
    doc.text(String(i + 1), col.sl + 3, y + 7)
    doc.text(wrappedLabel, col.item, y + 7)

    if (item.isMainPackage) {
      doc.setFontSize(8.5)
      doc.setTextColor(...gray)
      const durationText =
        inv.startDate || inv.endDate
          ? `${fmtDate(inv.startDate)} to ${fmtDate(inv.endDate)}`
          : "As per enrollment"
      doc.text(durationText, col.dates, y + 7)
      doc.setFontSize(9.5)
    }

    doc.setTextColor(...black)
    doc.setFont("helvetica", "bold")
    doc.text(fmtCurr(item.amount), col.total - 3, y + 7, { align: "right" })
    y += rowH
  })

  doc.setDrawColor(225, 225, 225)
  doc.setLineWidth(0.3)
  doc.line(left, y, right, y)
  y += 8

  // Totals & Status Block (right column)
  const labelX = 132
  function totalRow(label: string, value: string, bold = false, textColor = black) {
    doc.setTextColor(...(bold ? textColor : gray))
    doc.setFontSize(9.5)
    doc.setFont("helvetica", bold ? "bold" : "normal")
    doc.text(label, labelX, y)
    doc.text(value, right - 3, y, { align: "right" })
    y += 6.5
  }

  const totalsStartY = y
  totalRow("Package Fee:", fmtCurr(basePackageFee))
  if (otherCharges > 0) totalRow("Other Charges:", fmtCurr(otherCharges))
  if (discount > 0) totalRow("Discount:", `- ${fmtCurr(discount)}`, false, [200, 40, 40])
  if (rewardPointsRedeemed > 0) totalRow("Reward Points:", `- ${fmtCurr(rewardPointsRedeemed)}`)
  totalRow("Sub Total:", fmtCurr(finalAmount), true)
  totalRow("Amount Paid:", fmtCurr(effectivePaid), true)
  y += 1

  // Prominent Payment Status Pill
  const statusH = 11
  const statusBoxW = right - labelX + 6
  if (isPaid) {
    doc.setFillColor(16, 185, 129) // Emerald Green #10B981
  } else {
    doc.setFillColor(245, 158, 11) // Amber #F59E0B
  }
  doc.roundedRect(labelX - 4, y - 5, statusBoxW, statusH, 2.5, 2.5, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.text(isPaid ? "PAID IN FULL" : "BALANCE DUE:", labelX, y + 2.5)
  doc.text(fmtCurr(pendingAmount), right - 3, y + 2.5, { align: "right" })
  y += 18

  // Terms & Conditions Card (Enlarged & Visually Highlighted per Task B5)
  const tcWidth = 115
  const tcY = totalsStartY
  const tcCardHeight = 68
  
  // Highlighted Card Background + Gold Border
  doc.setFillColor(254, 252, 245) // Subtle warm ivory
  doc.setDrawColor(...gold)
  doc.setLineWidth(0.5)
  doc.roundedRect(left, tcY, tcWidth, tcCardHeight, 3, 3, "FD")

  // Header tag inside card
  doc.setFillColor(...gold)
  doc.roundedRect(left + 4, tcY + 4, 60, 5.5, 1.5, 1.5, "F")
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(7.5)
  doc.setFont("helvetica", "bold")
  doc.text("TERMS & CONDITIONS", left + 34, tcY + 8, { align: "center" })

  let currentTcY = tcY + 14
  doc.setFontSize(7.5)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(60, 40, 20)

  for (const clause of TERMS_AND_CONDITIONS) {
    const lines = doc.splitTextToSize(clause, tcWidth - 8)
    doc.text(lines, left + 4, currentTcY)
    currentTcY += lines.length * 3.2 + 1.2
  }

  // Payment Methods (UPI + Bank transfer) — placed in the left column directly
  // under the Terms card, anchored to the card's real bottom edge so it stays
  // put when the bill has more rows (never fixed y). The right column is left
  // free for the Authorised Signatory block.
  let pmY = tcY + tcCardHeight + 8
  doc.setFontSize(7.5)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...gray)
  doc.text("PAYMENT METHODS", left, pmY)
  pmY += 5
  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.text(`UPI: ${COACH_UPI_ID}`, left, pmY)
  pmY += 5
  doc.text(`(${COACH_UPI_NAME})`, left, pmY)
  pmY += 6
  doc.text("Bank Transfer:", left, pmY)
  pmY += 5
  doc.text(`A/c No. ${COACH_BANK.accountNo}`, left, pmY)
  pmY += 5
  doc.text(`IFSC ${COACH_BANK.ifsc}`, left, pmY)
  pmY += 5
  doc.text(`${COACH_BANK.bank}`, left, pmY)

  y = Math.max(y, tcY + tcCardHeight + 8)

  // Authorised Signature Block
  const signX = right - 48
  const sigBase64 = await getSignatureBase64()
  if (sigBase64) {
    // 600x328 aspect ratio (~1.83:1); render 38mm wide x 20.8mm tall directly above the signatory line
    doc.addImage(`data:image/png;base64,${sigBase64}`, "PNG", signX + 5, y - 12, 38, 20.8, undefined, "FAST")
  }
  doc.setDrawColor(...gray)
  doc.setLineWidth(0.4)
  doc.line(signX, y + 10, right, y + 10)
  doc.setTextColor(...black)
  doc.setFontSize(8.5)
  doc.setFont("helvetica", "bold")
  doc.text("Aman Khurana", signX + 24, y + 15, { align: "center" })
  doc.setFontSize(7.5)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(...gray)
  doc.text("Authorised Signatory", signX + 24, y + 19, { align: "center" })

  // Footer Rule & Brand Info
  doc.setDrawColor(...gold)
  doc.setLineWidth(1)
  doc.line(left, 280, right, 280)
  doc.setTextColor(...gray)
  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.text("+91 98156 90656   |   info@amankhuranafitness.com   |   www.amankhuranafitness.com", 105, 286, { align: "center" })

  return doc
}

/**
 * Mark Invoice / Fee as Paid & Send WhatsApp Receipt
 */
export async function markInvoicePaid(invId: string, _clientName?: string, _clientPhone?: string, fullAmount?: number): Promise<boolean> {
  // Must use the logged-in coach session: the module-level anon client has no session, so RLS
  // silently blocks the write (0 rows, no error). Check the row count instead of trusting "no error".
  const paidAt = new Date().toISOString()
  try {
    const session = createSessionClient()
    let resolvedAmount = fullAmount
    if (resolvedAmount === undefined) {
      const { data: existing } = await session.from("fees").select("amount").eq("id", invId).maybeSingle()
      if (existing && typeof existing.amount === "number") {
        resolvedAmount = Number(existing.amount)
      }
    }
    const updatePayload: Record<string, unknown> = {
      status: "paid",
      paid_date: paidAt.split("T")[0],
    }
    if (resolvedAmount !== undefined) {
      updatePayload.amount_paid = resolvedAmount
    }
    const { data, error } = await session
      .from("fees")
      .update(updatePayload)
      .eq("id", invId)
      .select("id")
    if (error || !data || data.length === 0) {
      console.error("Mark paid error:", error?.message ?? "no row updated")
      return false
    }
    // Keep the invoice row in sync if one exists (optional, ignore result).
    await session.from("invoices").update({ status: "paid", paid_at: paidAt }).eq("id", invId)
    return true
  } catch (e) {
    console.error("Mark paid error:", e)
    return false
  }
}

