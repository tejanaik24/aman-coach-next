"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { CheckCircle2, Download, Copy, Check, MessageCircle, ArrowRight, ShieldCheck, CreditCard } from "lucide-react"
import { format } from "date-fns"
import toast from "react-hot-toast"
import { COACH_UPI_ID, COACH_UPI_NAME, COACH_BANK, generateUpiLink } from "@/lib/upi"
import { generatePaymentReceiptPdf, DEFAULT_UPI_ID, type Invoice } from "@/lib/payments"

interface BillData {
  id: string
  invoiceNumber: string
  clientName: string
  clientPhone: string | null
  packageName: string
  startDate: string | null
  endDate: string | null
  packageFee: number
  discount: number
  otherCharges: number
  totalAmount: number
  amountPaid: number
  balanceDue: number
  dueDate: string
  paidDate: string | null
  status: "pending" | "paid" | "overdue"
  emiNo: number | null
  emiTotal: number | null
  notes: string | null
  createdAt: string
}

export default function PublicBillPage() {
  const params = useParams()
  const token = params.token as string

  const [bill, setBill] = useState<BillData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedUpi, setCopiedUpi] = useState(false)
  const [copiedBank, setCopiedBank] = useState(false)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/bill/${token}`)
        const data = await res.json()
        if (!res.ok || !data.bill) {
          setError(data.error || "Bill not found")
        } else {
          setBill(data.bill)
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Could not load bill")
      } finally {
        setLoading(false)
      }
    }
    if (token) load()
  }, [token])

  function copyText(txt: string, isUpi: boolean) {
    navigator.clipboard.writeText(txt)
    if (isUpi) {
      setCopiedUpi(true)
      setTimeout(() => setCopiedUpi(false), 2000)
    } else {
      setCopiedBank(true)
      setTimeout(() => setCopiedBank(false), 2000)
    }
    toast.success("Copied to clipboard")
  }

  async function handleDownloadPdf() {
    if (!bill) return
    setDownloading(true)
    try {
      const invObj: Invoice = {
        id: bill.id,
        clientId: "",
        invoiceNumber: bill.invoiceNumber,
        packageFee: bill.packageFee,
        amount: bill.totalAmount,
        gstRate: 0,
        gstAmount: 0,
        totalAmount: bill.totalAmount,
        upiId: DEFAULT_UPI_ID,
        status: bill.status,
        dueDate: bill.dueDate,
        clientName: bill.clientName,
        clientPhone: bill.clientPhone ?? "",
        createdAt: bill.createdAt,
        packageName: bill.packageName,
        startDate: bill.startDate ?? undefined,
        endDate: bill.endDate ?? undefined,
        otherCharges: bill.otherCharges,
        discount: bill.discount,
        amountPaid: bill.amountPaid,
      }
      const doc = await generatePaymentReceiptPdf(invObj)
      doc.save(`Invoice_${bill.invoiceNumber}_${bill.clientName.replace(/\s+/g, "_")}.pdf`)
      toast.success("PDF Downloaded")
    } catch (err) {
      toast.error("Could not generate PDF")
    } finally {
      setDownloading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="size-10 border-2 border-accent-orange border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-text-muted text-sm font-medium">Loading your bill…</p>
        </div>
      </div>
    )
  }

  if (error || !bill) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-5">
        <div className="max-w-md w-full rounded-3xl bg-[#141414] border border-[#222] p-6 text-center space-y-4">
          <p className="text-red-400 font-bold text-lg">Bill Not Available</p>
          <p className="text-text-muted text-sm">{error || "This invoice link is invalid or has expired."}</p>
        </div>
      </div>
    )
  }

  const isPaid = bill.status === "paid" || bill.balanceDue <= 0
  const payable = isPaid ? 0 : bill.balanceDue || bill.totalAmount
  const upiDeepLink = generateUpiLink(payable, `AKF ${bill.clientName} ${bill.invoiceNumber}`)
  const dueFormatted = format(new Date(bill.dueDate + "T00:00:00"), "dd MMM yyyy")

  const amanWaNumber = "919815690656"
  const waConfirmText = `Hi Coach Aman, I have made the payment of ₹${payable.toLocaleString("en-IN")} for Invoice #${bill.invoiceNumber}. Please verify.`
  const waConfirmUrl = `https://wa.me/${amanWaNumber}?text=${encodeURIComponent(waConfirmText)}`

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Background glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-96 bg-gradient-to-b from-[#FF6A1A]/10 to-transparent pointer-events-none" />

      <main className="relative max-w-md mx-auto px-5 pt-8 pb-16 space-y-6">
        {/* Header / Brand */}
        <div className="text-center space-y-2">
          <div className="size-16 rounded-2xl bg-[#141414] border border-[#262626] mx-auto p-2.5 flex items-center justify-center shadow-lg">
            <img src="/images/aman/logo.jpg" alt="Aman Khurana Fitness" className="w-full h-full object-contain rounded-lg" />
          </div>
          <h1 className="font-heading italic text-2xl font-bold tracking-tight">Aman Khurana Fitness</h1>
          <p className="text-xs uppercase font-bold tracking-widest text-accent-orange">Elite Coaching & Nutrition</p>
        </div>

        {/* Bill Status Card */}
        <div className={`rounded-3xl p-6 border ${isPaid ? "bg-emerald-950/20 border-emerald-500/30" : "bg-[#141414] border-[#262626]"}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-text-muted text-xs uppercase font-bold tracking-wider">Invoice #{bill.invoiceNumber}</p>
              <h2 className="text-xl font-bold mt-1 text-white">{bill.clientName}</h2>
              <p className="text-sm text-text-muted mt-0.5">{bill.packageName}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              isPaid
                ? "bg-emerald-500 text-black"
                : "bg-accent-orange/15 text-accent-orange border border-accent-orange/30"
            }`}>
              {isPaid ? "Paid" : "Payment Due"}
            </span>
          </div>

          <div className="mt-6 pt-5 border-t border-white/10 flex items-baseline justify-between">
            <div>
              <p className="text-xs text-text-muted font-medium">{isPaid ? "Total Paid" : "Amount Due"}</p>
              <p className={`font-heading text-4xl font-bold mt-1 ${isPaid ? "text-emerald-400" : "text-white"}`}>
                ₹{(isPaid ? (bill.amountPaid || bill.totalAmount) : payable).toLocaleString("en-IN")}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-text-muted font-medium">{isPaid ? "Paid On" : "Due Date"}</p>
              <p className="text-sm font-bold text-white mt-1">
                {isPaid && bill.paidDate ? format(new Date(bill.paidDate + "T00:00:00"), "dd MMM yyyy") : dueFormatted}
              </p>
            </div>
          </div>
        </div>

        {/* Breakdown Card */}
        <div className="rounded-3xl bg-[#141414] border border-[#262626] p-5 space-y-3 text-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Bill Breakdown</p>
          <div className="flex justify-between text-text-muted">
            <span>Package Fee</span>
            <span className="text-white font-medium">₹{bill.packageFee.toLocaleString("en-IN")}</span>
          </div>
          {bill.discount > 0 && (
            <div className="flex justify-between text-emerald-400">
              <span>Discount</span>
              <span className="font-medium">−₹{bill.discount.toLocaleString("en-IN")}</span>
            </div>
          )}
          {bill.otherCharges > 0 && (
            <div className="flex justify-between text-text-muted">
              <span>Other Charges</span>
              <span className="text-white font-medium">+₹{bill.otherCharges.toLocaleString("en-IN")}</span>
            </div>
          )}
          <div className="pt-2 border-t border-white/10 flex justify-between font-bold text-base">
            <span>Total Final Amount</span>
            <span className="text-accent-orange">₹{bill.totalAmount.toLocaleString("en-IN")}</span>
          </div>
          {bill.amountPaid > 0 && !isPaid && (
            <div className="flex justify-between text-emerald-400 text-xs">
              <span>Paid So Far</span>
              <span>₹{bill.amountPaid.toLocaleString("en-IN")}</span>
            </div>
          )}
          {bill.startDate && bill.endDate && (
            <div className="pt-2 border-t border-white/5 text-xs text-text-muted flex justify-between">
              <span>Coaching Package Period</span>
              <span>{bill.startDate} to {bill.endDate}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {!isPaid ? (
          <div className="space-y-3">
            {/* Big UPI Deep Link Button */}
            <a
              href={upiDeepLink}
              className="w-full h-14 rounded-2xl bg-[#FF6A1A] text-black font-bold text-lg flex items-center justify-center gap-2 shadow-[0_8px_30px_rgba(255,106,26,0.35)] cursor-pointer hover:bg-[#ff7b33] active:scale-[0.99] transition-all"
            >
              <CreditCard className="size-5" /> Pay with UPI (GPay / PhonePe / Paytm)
            </a>

            {/* Copy UPI ID */}
            <button
              type="button"
              onClick={() => copyText(COACH_UPI_ID, true)}
              className="w-full h-12 rounded-2xl bg-white/5 border border-white/10 text-white font-semibold text-sm flex items-center justify-between px-4 cursor-pointer hover:bg-white/10 transition-colors"
            >
              <span className="text-text-muted">UPI ID: <strong className="text-white font-mono">{COACH_UPI_ID}</strong></span>
              <span className="flex items-center gap-1.5 text-accent-orange font-bold text-xs">
                {copiedUpi ? <><Check className="size-4" /> Copied</> : <><Copy className="size-4" /> Copy UPI ID</>}
              </span>
            </button>

            {/* Bank Transfer Details Accordion */}
            <details className="rounded-2xl bg-[#141414] border border-[#262626] p-4 text-xs space-y-2 group">
              <summary className="font-semibold text-sm cursor-pointer list-none flex items-center justify-between text-text-muted hover:text-white">
                <span>Direct Bank Transfer Details</span>
                <span className="text-accent-orange group-open:rotate-90 transition-transform">▸</span>
              </summary>
              <div className="pt-3 border-t border-white/10 space-y-2 font-mono">
                <div className="flex justify-between">
                  <span className="text-text-muted font-sans">Bank:</span>
                  <span>{COACH_BANK.bank}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted font-sans">Account No:</span>
                  <span>{COACH_BANK.accountNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted font-sans">IFSC Code:</span>
                  <span>{COACH_BANK.ifsc}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted font-sans">Beneficiary:</span>
                  <span className="font-sans font-semibold">{COACH_UPI_NAME}</span>
                </div>
                <button
                  type="button"
                  onClick={() => copyText(`Bank: ${COACH_BANK.bank}\nAccount No: ${COACH_BANK.accountNo}\nIFSC: ${COACH_BANK.ifsc}\nName: ${COACH_UPI_NAME}`, false)}
                  className="w-full mt-2 h-9 rounded-xl bg-white/5 text-accent-orange font-sans font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copiedBank ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {copiedBank ? "Details Copied" : "Copy All Bank Details"}
                </button>
              </div>
            </details>

            {/* Tell Aman on WhatsApp */}
            <a
              href={waConfirmUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-12 rounded-2xl bg-[#25D366]/15 border border-[#25D366]/40 text-[#25D366] font-bold text-sm flex items-center justify-center gap-2 cursor-pointer hover:bg-[#25D366]/25 transition-colors"
            >
              <MessageCircle className="size-4" /> I have paid – tell Aman on WhatsApp
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-center">
              <p className="text-emerald-400 font-bold text-base flex items-center justify-center gap-2">
                <CheckCircle2 className="size-5" /> Payment Completed
              </p>
              <p className="text-text-muted text-xs mt-1">Thank you for training with Aman Khurana Fitness!</p>
            </div>

            <a
              href={`https://wa.me/${amanWaNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-12 rounded-2xl bg-[#25D366]/15 border border-[#25D366]/40 text-[#25D366] font-bold text-sm flex items-center justify-center gap-2 cursor-pointer hover:bg-[#25D366]/25 transition-colors"
            >
              <MessageCircle className="size-4" /> Chat with Coach Aman on WhatsApp
            </a>
          </div>
        )}

        {/* Download PDF Button (always available) */}
        <button
          type="button"
          disabled={downloading}
          onClick={handleDownloadPdf}
          className="w-full h-12 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-colors"
        >
          <Download className="size-4" /> {downloading ? "Preparing PDF…" : "Download Official Invoice PDF"}
        </button>

        {/* Terms footer note */}
        <div className="text-center pt-4 border-t border-white/5 space-y-1">
          <p className="text-[11px] text-text-muted flex items-center justify-center gap-1">
            <ShieldCheck className="size-3.5 text-accent-orange" /> Verified official invoice from Aman Khurana Fitness
          </p>
          <p className="text-[10px] text-text-muted/60">Payments are secure and direct via UPI or NEFT/IMPS.</p>
        </div>
      </main>
    </div>
  )
}