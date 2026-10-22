"use client"

// Payment page for someone who is NOT a client yet (Aman sends it before adding them).
// Everything comes from the link: ?a=amount&n=name&p=package. No login, no database.
import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Check, Copy, CreditCard, MessageCircle, ShieldCheck } from "lucide-react"
import { COACH_UPI_ID, COACH_UPI_NAME, COACH_BANK, generateUpiLink } from "@/lib/upi"

const AMAN_WA = "919815690656"

function PayInner() {
  const q = useSearchParams()
  const amount = Math.max(0, Math.round(Number(q.get("a")) || 0))
  const name = (q.get("n") ?? "").trim().slice(0, 60)
  const pkg = (q.get("p") ?? "").trim().slice(0, 80)
  const [copied, setCopied] = useState<"upi" | "bank" | null>(null)

  const copy = async (text: string, k: "upi" | "bank") => {
    try { await navigator.clipboard.writeText(text) } catch { /* old browsers: user can long-press */ }
    setCopied(k)
    setTimeout(() => setCopied(null), 2000)
  }
  const upi = generateUpiLink(amount, `AKF ${name || "New client"}`.slice(0, 40))
  const waText = `Hi Coach Aman, I have paid ₹${amount.toLocaleString("en-IN")}${pkg ? ` for ${pkg}` : ""}. Name: ${name || "-"}. Please verify.`
  const showRazorpay = process.env.NEXT_PUBLIC_RAZORPAY_PAYMENT_LINK?.startsWith("https://")

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white overflow-x-hidden">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-96 bg-gradient-to-b from-[#FF6A1A]/10 to-transparent pointer-events-none" />
      <main className="relative w-full max-w-md mx-auto px-4 pt-8 pb-16 space-y-5">
        <div className="text-center space-y-2">
          <div className="size-16 rounded-2xl bg-[#141414] border border-[#262626] mx-auto p-2.5">
            <img src="/images/aman/logo.jpg" alt="Aman Khurana Fitness" className="w-full h-full object-contain rounded-lg" />
          </div>
          <h1 className="font-heading italic text-2xl font-bold">Aman Khurana Fitness</h1>
          <p className="text-xs uppercase font-bold tracking-wider text-accent-orange">Welcome to the team</p>
        </div>

        <div className="rounded-3xl p-5 bg-[#141414] border border-[#262626]">
          {name && <p className="text-lg font-bold break-words">Hi {name},</p>}
          {pkg && <p className="text-sm text-text-muted mt-0.5 break-words">{pkg}</p>}
          <div className="mt-5 pt-4 border-t border-white/10">
            <p className="text-xs text-text-muted font-medium">Amount to pay</p>
            <p className="font-heading text-4xl font-bold mt-1">{amount ? `₹${amount.toLocaleString("en-IN")}` : "As discussed"}</p>
          </div>
        </div>

        <div className="space-y-3">
          {amount > 0 && (
            <a href={upi} className="w-full min-h-[52px] py-3 px-3 rounded-2xl bg-[#FF6A1A] text-black font-bold text-base flex items-center justify-center gap-2 text-center">
              <CreditCard className="size-5 shrink-0" /> Pay with UPI (GPay / PhonePe / Paytm)
            </a>
          )}
          <button type="button" onClick={() => copy(COACH_UPI_ID, "upi")} className="w-full min-h-[48px] py-2 px-3 rounded-2xl bg-white/5 border border-white/10 text-sm flex items-center justify-between gap-2 cursor-pointer">
            <span className="text-text-muted truncate text-left">UPI ID: <strong className="text-white font-mono">{COACH_UPI_ID}</strong></span>
            <span className="shrink-0 flex items-center gap-1 text-accent-orange font-bold text-xs">{copied === "upi" ? <><Check className="size-3.5" /> Copied</> : <><Copy className="size-3.5" /> Copy</>}</span>
          </button>

          {showRazorpay && (
            <a href={process.env.NEXT_PUBLIC_RAZORPAY_PAYMENT_LINK} target="_blank" rel="noopener noreferrer" className="w-full min-h-[48px] rounded-2xl bg-white/10 border border-white/20 font-bold text-sm flex items-center justify-center gap-2">
              Pay by card / netbanking (Razorpay)
            </a>
          )}

          <div className="rounded-2xl bg-[#141414] border border-[#262626] p-4 text-sm space-y-2">
            <p className="font-semibold text-text-muted">Bank transfer (NEFT / IMPS)</p>
            <div className="flex justify-between gap-3"><span className="text-text-muted">Bank</span><span>{COACH_BANK.bank}</span></div>
            <div className="flex justify-between gap-3"><span className="text-text-muted">Account No</span><span className="font-mono">{COACH_BANK.accountNo}</span></div>
            <div className="flex justify-between gap-3"><span className="text-text-muted">IFSC</span><span className="font-mono">{COACH_BANK.ifsc}</span></div>
            <div className="flex justify-between gap-3"><span className="text-text-muted">Name</span><span className="font-semibold text-right">{COACH_UPI_NAME}</span></div>
            <button type="button" onClick={() => copy(`Bank: ${COACH_BANK.bank}\nAccount No: ${COACH_BANK.accountNo}\nIFSC: ${COACH_BANK.ifsc}\nName: ${COACH_UPI_NAME}`, "bank")} className="w-full mt-1 h-11 rounded-xl bg-white/5 text-accent-orange font-bold flex items-center justify-center gap-1.5 cursor-pointer">
              {copied === "bank" ? <Check className="size-4" /> : <Copy className="size-4" />} {copied === "bank" ? "Copied" : "Copy bank details"}
            </button>
          </div>

          <a href={`https://wa.me/${AMAN_WA}?text=${encodeURIComponent(waText)}`} target="_blank" rel="noopener noreferrer" className="w-full h-12 rounded-2xl bg-[#25D366]/15 border border-[#25D366]/40 text-[#25D366] font-bold text-sm flex items-center justify-center gap-2">
            <MessageCircle className="size-4" /> I have paid – tell Aman on WhatsApp
          </a>
        </div>

        <p className="text-center text-[11px] text-text-muted flex items-center justify-center gap-1 pt-2">
          <ShieldCheck className="size-3.5 text-accent-orange" /> Payment goes directly to Aman Khurana Fitness
        </p>
      </main>
    </div>
  )
}

export default function PayPage() {
  return <Suspense><PayInner /></Suspense>
}
