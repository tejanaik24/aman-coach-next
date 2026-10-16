"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { QrCode, Download, CheckCircle2, Copy, MessageCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { generatePaymentReceiptPdf, type Invoice } from "@/lib/payments"
import { COACH_UPI_ID, COACH_BANK, generateUpiLink } from "@/lib/upi"
import { finalAmount, paidSoFar, amountDue } from "@/lib/fee-math"
import toast from "react-hot-toast"
import { COACH_WHATSAPP } from "@/lib/coach-contact"
import type { Fee } from "@/types"

export default function ClientPaymentsPage() {
  const supabase = createClient()

  const [bills, setBills] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [clientName, setClientName] = useState("")

  const fetchPayments = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [profileRes, clientRes] = await Promise.all([
      supabase.from("profiles").select("name, phone").eq("id", user.id).single(),
      supabase.from("clients").select("id, member_number, package_name, start_date, end_date").eq("user_id", user.id).maybeSingle(),
    ])
    const profile = profileRes.data
    const client = clientRes.data
    if (profile?.name) setClientName(profile.name)
    if (!client) {
      setLoading(false)
      return
    }

    const { data: feeRows } = await supabase
      .from("fees")
      .select("*")
      .eq("client_id", client.id)
      .order("due_date", { ascending: false })

    if (feeRows && feeRows.length > 0) {
      const typedRows = feeRows as Fee[]
      const mapped: Invoice[] = typedRows.map((f) => {
        const amount = finalAmount(f)
        const discount = Number(f.discount || 0)
        const otherCharges = Number(f.other_charges || 0)
        const rewardPts = Number(f.reward_points_redeemed || 0)
        const packageFee =
          f.package_fee !== null && f.package_fee !== undefined && Number(f.package_fee) > 0
            ? Number(f.package_fee)
            : amount + discount - otherCharges + rewardPts
        const amountPaid = paidSoFar(f)
        const invNum =
          f.invoice_number ||
          (client.member_number ? String(client.member_number).padStart(5, "0") : `INV-${f.id.slice(0, 6).toUpperCase()}`)
        return {
          id: f.id,
          clientId: client.id,
          feeId: f.id,
          invoiceNumber: invNum,
          packageFee,
          amount,
          gstRate: 0,
          gstAmount: 0,
          totalAmount: amount,
          upiId: COACH_UPI_ID,
          status: f.status,
          dueDate: f.due_date,
          paidAt: f.paid_date || undefined,
          notes: f.notes || undefined,
          clientName: profile?.name || "Client",
          clientPhone: profile?.phone || "",
          createdAt: f.created_at || new Date().toISOString(),
          memberNumber: client.member_number ?? undefined,
          packageName: f.package_name || client.package_name || "Personalized Fitness & Nutrition Coaching",
          startDate: client.start_date || undefined,
          endDate: client.end_date || undefined,
          otherCharges,
          discount,
          rewardPointsRedeemed: rewardPts,
          amountPaid,
          currency: f.currency || "INR",
        }
      })
      setBills(mapped)
    } else {
      setBills([])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchPayments()
  }, [])

  async function handleDownloadInvoice(inv: Invoice) {
    const doc = await generatePaymentReceiptPdf(inv)
    doc.save(`Invoice_${inv.invoiceNumber}.pdf`)
    toast.success("Bill / receipt downloaded!")
  }

  function handleCopyUpi() {
    navigator.clipboard.writeText(COACH_UPI_ID)
    toast.success(`UPI ID ${COACH_UPI_ID} copied!`)
  }

  function handleCopy(label: string, value: string) {
    navigator.clipboard.writeText(value)
    toast.success(`${label} copied!`)
  }

  // All pending/overdue bills sorted by earliest due date so total due matches Home "Fee due"
  const activeBills = bills
    .filter((b) => b.status === "pending" || b.status === "overdue")
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
  const activeBill = activeBills[0] ?? null

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary p-4 md:p-6 pb-28 max-w-3xl mx-auto space-y-6">

      {/* Top Header */}
      <div className="border-b border-border-subtle pb-4">
        <span className="text-[10px] font-bold text-accent-orange uppercase tracking-widest">Client Portal</span>
        <h1 className="font-heading text-2xl text-text-primary tracking-wide mt-0.5">PAYMENTS &amp; SUBSCRIPTION</h1>
        <p className="text-xs text-text-muted mt-1">
          View your coaching fee details, pay via UPI, and download your invoice or receipt.
        </p>
      </div>

      {/* Active Due Fee Banner */}
      {activeBill ? (() => {
        const pkgFee = activeBills.reduce((s, b) => s + Number(b.packageFee ?? b.amount), 0)
        const disc = activeBills.reduce((s, b) => s + Number(b.discount ?? 0), 0)
        const paidAmt = activeBills.reduce((s, b) => s + paidSoFar(b), 0)
        const dueAmt = activeBills.reduce(
          (s, b) => s + amountDue(b),
          0
        )
        const hasOverdue = activeBills.some((b) => b.status === "overdue")
        const invLabel =
          activeBills.length > 1
            ? `Invoices ${activeBills.map((b) => `#${b.invoiceNumber}`).join(", ")}`
            : `Invoice #${activeBill.invoiceNumber}`
        const upiHref = generateUpiLink(dueAmt, `Coaching Fee ${clientName || "Client"}`)
        return (
          <div className={`rounded-2xl border p-6 space-y-4 shadow-xl ${
            hasOverdue
              ? "border-red-500/50 bg-red-950/20"
              : "border-accent-orange/50 bg-gradient-to-br from-accent-orange/10 to-bg-card"
          }`}>
            <div className="flex items-center justify-between gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                hasOverdue
                  ? "bg-red-500/20 text-red-400 border border-red-500/40"
                  : "bg-accent-orange/20 text-accent-orange border border-accent-orange/40"
              }`}>
                {hasOverdue ? "Overdue Fee" : "Payment Due"}
                {activeBills.length > 1 ? ` (${activeBills.length} Bills)` : ""}
              </span>
              <span className="text-xs text-text-muted font-mono">{invLabel}</span>
            </div>

            {activeBill.packageName && (
              <p className="text-sm font-semibold text-text-primary">{activeBill.packageName}</p>
            )}

            {/* Fee Breakdown */}
            <div className="rounded-xl bg-bg-primary/60 border border-border-subtle p-4 space-y-2 text-sm">
              <div className="flex items-center justify-between text-text-muted">
                <span>Coaching Fee</span>
                <span className="text-text-primary font-semibold">₹{pkgFee.toLocaleString("en-IN")}</span>
              </div>
              {disc > 0 && (
                <div className="flex items-center justify-between text-emerald-400">
                  <span>Discount</span>
                  <span className="font-semibold">− ₹{disc.toLocaleString("en-IN")}</span>
                </div>
              )}
              {paidAmt > 0 && (
                <div className="flex items-center justify-between text-text-muted">
                  <span>Already Paid</span>
                  <span className="text-text-primary font-semibold">₹{paidAmt.toLocaleString("en-IN")}</span>
                </div>
              )}
              <div className="border-t border-border-subtle pt-2 flex items-center justify-between">
                <span className="font-bold text-text-primary">Amount Due</span>
                <span className="font-heading text-2xl text-accent-orange font-bold">₹{dueAmt.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-text-muted pt-1">
                <span>Due Date</span>
                <span className="text-text-primary font-semibold">
                  {format(new Date(activeBill.dueDate + "T00:00:00"), "dd MMMM yyyy")}
                </span>
              </div>
            </div>

            {/* UPI ID + Copy */}
            <div className="rounded-xl bg-bg-elevated border border-border-subtle px-4 py-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[11px] text-text-muted block">Pay by UPI to Aman Khurana Fitness</span>
                <span className="text-sm font-mono font-bold text-text-primary">{COACH_UPI_ID}</span>
              </div>
              <button
                type="button"
                onClick={handleCopyUpi}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold text-text-primary flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Copy className="size-3.5 text-accent-orange" /> Copy UPI ID
              </button>
            </div>

            {/* Bank transfer */}
            <div className="rounded-xl bg-bg-elevated border border-border-subtle px-4 py-3 space-y-2">
              <span className="text-[11px] text-text-muted block">Or pay by bank transfer ({COACH_BANK.bank})</span>
              {[
                { label: "Account number", value: COACH_BANK.accountNo },
                { label: "IFSC", value: COACH_BANK.ifsc },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[11px] text-text-muted block">{row.label}</span>
                    <span className="text-sm font-mono font-bold text-text-primary break-all">{row.value}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(row.label, row.value)}
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold text-text-primary flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Copy className="size-3.5 text-accent-orange" /> Copy
                  </button>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2.5 pt-1">
              <a
                href={upiHref}
                className="flex-1 min-w-0 py-3.5 px-5 rounded-full bg-accent-orange text-black font-heading font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:brightness-110 transition-all"
              >
                <QrCode className="size-4" /> Pay by UPI (₹{dueAmt.toLocaleString("en-IN")})
              </a>
              <button
                type="button"
                onClick={() => handleDownloadInvoice(activeBill)}
                className="py-3.5 px-4 rounded-full bg-bg-elevated border border-border-subtle text-text-primary text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:border-accent-orange transition-colors cursor-pointer"
              >
                <Download className="size-4 text-accent-orange" /> Bill / Receipt
              </button>
              <a
                href={`https://wa.me/${COACH_WHATSAPP}?text=${encodeURIComponent(`Hi Aman, I have paid my coaching fee of Rs ${dueAmt} via UPI (${COACH_UPI_ID}).`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3.5 px-4 rounded-full bg-[#25D366] text-black text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <MessageCircle className="size-4" /> I have paid
              </a>
            </div>
          </div>
        )
      })() : (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/10 p-6 flex items-center gap-4 text-emerald-400">
          <CheckCircle2 className="size-8 flex-shrink-0" />
          <div>
            <h3 className="font-bold text-base text-text-primary">Subscription Active &amp; Up to Date!</h3>
            <p className="text-xs text-text-muted mt-0.5">You have no pending or overdue coaching fees.</p>
          </div>
        </div>
      )}

      {/* Payment & Bill History */}
      <div className="rounded-2xl border border-border-subtle bg-bg-card p-5 space-y-4">
        <h3 className="font-heading text-sm text-text-primary uppercase tracking-wider">Bills &amp; Payment History</h3>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="size-6 border-2 border-accent-orange border-t-transparent rounded-full animate-spin" />
          </div>
        ) : bills.length === 0 ? (
          <p className="text-xs text-text-muted text-center py-6">No billing records yet</p>
        ) : (
          <div className="divide-y divide-border-subtle">
            {bills.map((inv) => {
              const pkgFee = Number(inv.packageFee ?? inv.amount)
              const disc = Number(inv.discount ?? 0)
              const paidAmt = paidSoFar(inv)
              const rowDue = amountDue(inv)
              return (
                <div key={inv.id} className="py-3.5 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-text-primary">Invoice #{inv.invoiceNumber}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                        inv.status === "paid"
                          ? "bg-emerald-500/15 text-emerald-400"
                          : inv.status === "overdue"
                          ? "bg-red-500/15 text-red-400"
                          : "bg-amber-500/15 text-amber-400"
                      }`}>
                        {inv.status}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">
                      {inv.packageName ? `${inv.packageName} · ` : ""}Due: {format(new Date(inv.dueDate + "T00:00:00"), "d MMM yyyy")}
                    </p>
                    {disc > 0 && (
                      <p className="text-[11px] text-emerald-400 mt-0.5">
                        Coaching Fee ₹{pkgFee.toLocaleString("en-IN")} − Discount ₹{disc.toLocaleString("en-IN")}
                      </p>
                    )}
                    {paidAmt > 0 && inv.status !== "paid" && (
                      <p className="text-[11px] text-text-muted mt-0.5">
                        Paid ₹{paidAmt.toLocaleString("en-IN")} · Balance Due ₹{rowDue.toLocaleString("en-IN")}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-heading font-bold text-sm text-accent-orange">
                      ₹{(inv.status === "paid" ? inv.amount : rowDue).toLocaleString("en-IN")}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDownloadInvoice(inv)}
                      className="p-2 rounded-lg bg-bg-elevated border border-border-subtle text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                      title="Download Bill / Receipt PDF"
                    >
                      <Download className="size-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
