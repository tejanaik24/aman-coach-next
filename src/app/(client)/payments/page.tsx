"use client"

import { useState, useEffect } from "react"
import { motion } from "motion/react"
import { format } from "date-fns"
import { IndianRupee, QrCode, Download, CheckCircle2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { generateUpiPaymentUrl, generateGstInvoicePdf, DEFAULT_UPI_ID, type Invoice } from "@/lib/payments"
import toast from "react-hot-toast"

export default function ClientPaymentsPage() {
  const supabase = createClient()

  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [clientName, setClientName] = useState("")

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase.from("profiles").select("name").eq("id", user.id).single()
      if (profile?.name) setClientName(profile.name)

      const { data: client } = await supabase.from("clients").select("id").eq("user_id", user.id).single()
      if (!client) { setLoading(false); return }

      const { data: invRows } = await supabase
        .from("invoices")
        .select("*")
        .eq("client_id", client.id)
        .order("due_date", { ascending: false })

      if (invRows) {
        setInvoices(invRows.map((inv: any) => ({
          id: inv.id,
          clientId: inv.client_id,
          invoiceNumber: inv.invoice_number,
          amount: Number(inv.amount),
          gstRate: Number(inv.gst_rate || 18),
          gstAmount: Number(inv.gst_amount || 0),
          totalAmount: Number(inv.total_amount),
          upiId: inv.upi_id || DEFAULT_UPI_ID,
          status: inv.status,
          dueDate: inv.due_date,
          paidAt: inv.paid_at,
          clientName: profile?.name || "Client",
          createdAt: inv.created_at
        })))
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  function handleDownloadInvoice(inv: Invoice) {
    const doc = generateGstInvoicePdf(inv)
    doc.save(`GST_Tax_Invoice_${inv.invoiceNumber}.pdf`)
    toast.success("GST Tax Invoice downloaded!")
  }

  const activeInvoice = invoices.find(i => i.status === "pending" || i.status === "overdue")

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary p-4 md:p-6 pb-28 max-w-3xl mx-auto space-y-6">

      {/* Top Header */}
      <div className="border-b border-border-subtle pb-4">
        <span className="text-[10px] font-bold text-accent-gold uppercase tracking-widest">Client Portal</span>
        <h1 className="font-heading text-2xl text-text-primary tracking-wide mt-0.5">PAYMENTS &amp; SUBSCRIPTION</h1>
        <p className="text-xs text-text-muted mt-1">
          View coaching fees, pay via UPI, and download GST tax receipts.
        </p>
      </div>

      {/* Active Due Fee Banner */}
      {activeInvoice ? (
        <div className={`rounded-2xl border p-6 space-y-4 shadow-xl ${
          activeInvoice.status === "overdue"
            ? "border-red-500/50 bg-red-950/20"
            : "border-accent-gold/50 bg-gradient-to-br from-accent-gold/10 to-bg-card"
        }`}>
          <div className="flex items-center justify-between">
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              activeInvoice.status === "overdue"
                ? "bg-red-500/20 text-red-400 border border-red-500/40"
                : "bg-accent-gold/20 text-accent-gold border border-accent-gold/40"
            }`}>
              {activeInvoice.status === "overdue" ? "Overdue Fee" : "Payment Due"}
            </span>
            <span className="text-xs text-text-muted font-mono">{activeInvoice.invoiceNumber}</span>
          </div>

          <div>
            <span className="text-xs text-text-muted font-medium block">Amount Due</span>
            <span className="font-heading text-3xl text-text-primary font-bold">₹{activeInvoice.totalAmount.toLocaleString("en-IN")}</span>
            <span className="text-xs text-text-muted block mt-1">Due Date: {format(new Date(activeInvoice.dueDate), "dd MMMM yyyy")}</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <a
              href={generateUpiPaymentUrl(activeInvoice.totalAmount, clientName, activeInvoice.invoiceNumber)}
              className="flex-1 py-3 px-4 rounded-full bg-accent-gold text-bg-primary font-heading font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-accent-gold/20 hover:bg-accent-gold/90 transition-all"
            >
              <QrCode className="size-4" /> Pay via UPI Link
            </a>
            <button
              onClick={() => handleDownloadInvoice(activeInvoice)}
              className="py-3 px-5 rounded-full bg-bg-elevated border border-border-subtle text-text-muted text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:text-text-primary transition-colors"
            >
              <Download className="size-4 text-accent-gold" /> GST Receipt
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/10 p-6 flex items-center gap-4 text-emerald-400">
          <CheckCircle2 className="size-8 flex-shrink-0" />
          <div>
            <h3 className="font-bold text-base text-text-primary">Subscription Active &amp; Up to Date!</h3>
            <p className="text-xs text-text-muted mt-0.5">You have no pending or overdue coaching fees.</p>
          </div>
        </div>
      )}

      {/* Payment History */}
      <div className="rounded-2xl border border-border-subtle bg-bg-card p-5 space-y-4">
        <h3 className="font-heading text-sm text-text-primary uppercase tracking-wider">Payment History</h3>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="size-6 border-2 border-accent-gold border-t-transparent rounded-full animate-spin" />
          </div>
        ) : invoices.length === 0 ? (
          <p className="text-xs text-text-muted text-center py-6">No past payment records</p>
        ) : (
          <div className="divide-y divide-border-subtle">
            {invoices.map(inv => (
              <div key={inv.id} className="py-3.5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-text-primary">{inv.invoiceNumber}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                      inv.status === "paid"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-amber-500/15 text-amber-400"
                    }`}>
                      {inv.status}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">Due: {format(new Date(inv.dueDate), "d MMM yyyy")}</p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-heading font-bold text-sm text-accent-gold">₹{inv.totalAmount.toLocaleString("en-IN")}</span>
                  <button
                    onClick={() => handleDownloadInvoice(inv)}
                    className="p-2 rounded-lg bg-bg-elevated border border-border-subtle text-text-muted hover:text-text-primary transition-colors"
                  >
                    <Download className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
