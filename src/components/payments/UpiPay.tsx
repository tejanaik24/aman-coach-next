"use client"

import { useState } from "react"
import { Check, Copy, CreditCard } from "lucide-react"
import { COACH_UPI_PHONE, UPI_LINK_LIMIT, generateUpiLink } from "@/lib/upi"

/**
 * UPI pay button. Up to ₹2,000 it opens the UPI app with the amount filled in. Above that, UPI apps
 * block links to a personal UPI ID, so it shows "pay to mobile number" steps with a copy button.
 */
export default function UpiPay({ amount, note, label, className }: { amount: number; note: string; label?: string; className: string }) {
  const [copied, setCopied] = useState(false)
  if (amount <= UPI_LINK_LIMIT) {
    return (
      <a href={generateUpiLink(amount, note)} className={className}>
        <CreditCard className="size-5 shrink-0" />
        <span className="break-words">{label ?? "Pay with UPI (GPay / PhonePe / Paytm)"}</span>
      </a>
    )
  }
  const copy = async () => {
    try { await navigator.clipboard.writeText(COACH_UPI_PHONE) } catch { /* old browsers: long-press the number */ }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="w-full rounded-2xl bg-[#FF6A1A]/10 border border-[#FF6A1A]/40 p-4 space-y-3 text-left">
      <p className="font-bold text-white text-sm">Pay ₹{amount.toLocaleString("en-IN")} by UPI to this mobile number</p>
      <button
        type="button"
        onClick={copy}
        className="w-full h-12 rounded-xl bg-[#FF6A1A] text-black font-bold text-base flex items-center justify-center gap-2 cursor-pointer"
      >
        {copied ? <Check className="size-5" /> : <Copy className="size-5" />}
        {copied ? "Number copied" : `98156 90656 · Copy`}
      </button>
      <ol className="text-xs text-text-muted space-y-1 list-decimal pl-4">
        <li>Open GPay, PhonePe or Paytm</li>
        <li>Choose &quot;Pay phone number&quot; and paste the number</li>
        <li>Check the name shows <strong className="text-white">AMAN KHURANA</strong>, enter ₹{amount.toLocaleString("en-IN")} and pay</li>
      </ol>
    </div>
  )
}
