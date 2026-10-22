"use client"

import { useState } from "react"
import { Copy, MessageCircle, X } from "lucide-react"
import toast from "react-hot-toast"
import { waLink } from "@/lib/quick-manage"
import { openUrl } from "@/lib/utils"

const PRESETS = [5000, 8000, 11000, 15000, 21000]
const input = "w-full h-12 rounded-xl bg-[#1A1A1A] border border-[#333333] px-3.5 text-white text-base outline-none focus:border-accent-orange"

/** Payment link for someone who is not a client yet: UPI + bank (+ Razorpay when set up). */
export default function PaymentLinkModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [amount, setAmount] = useState("")
  const [pkg, setPkg] = useState("")
  if (!isOpen) return null

  const qs = new URLSearchParams({ ...(amount && { a: amount }), ...(name.trim() && { n: name.trim() }), ...(pkg.trim() && { p: pkg.trim() }) })
  const link = `${window.location.origin}/pay${qs.toString() ? `?${qs}` : ""}`
  const first = name.trim().split(/\s+/)[0]
  const msg = `Hi${first ? ` ${first}` : ""}, welcome to Aman Khurana Fitness 💪${pkg.trim() ? `\nPackage: ${pkg.trim()}` : ""}${amount ? `\nAmount: ₹${Number(amount).toLocaleString("en-IN")}` : ""}\n\nPay here (UPI / bank transfer):\n${link}\n\nOnce paid, reply here and we will get you started.`
  const wa = waLink(phone, msg) ?? `https://wa.me/?text=${encodeURIComponent(msg)}`

  return (
    <div className="fixed inset-0 z-[70] flex items-end bg-black/70" onClick={onClose}>
      <div className="w-full max-w-[430px] mx-auto rounded-t-3xl bg-bg-card border-t border-border-subtle max-h-[92vh] overflow-y-auto p-5 pb-8 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-heading italic text-2xl">Payment link</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="size-11 grid place-items-center rounded-full bg-white/5 cursor-pointer"><X className="size-5" /></button>
        </div>
        <p className="text-sm text-text-muted">For a new person, before you add them as a client.</p>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className={input} />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="WhatsApp number (optional)" inputMode="tel" className={input} />
        <input value={pkg} onChange={(e) => setPkg(e.target.value)} placeholder="Package (optional), e.g. Fat Loss 12 Weeks" className={input} />
        <div>
          <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} placeholder="Amount ₹" inputMode="numeric" className={input} />
          <div className="flex flex-wrap gap-2 mt-2">
            {PRESETS.map((p) => (
              <button key={p} type="button" onClick={() => setAmount(String(p))} className={`h-11 px-3.5 rounded-full text-sm font-semibold cursor-pointer ${amount === String(p) ? "bg-accent-orange text-black" : "bg-white/10"}`}>₹{p.toLocaleString("en-IN")}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button type="button" onClick={() => { navigator.clipboard.writeText(link).then(() => toast.success("Link copied"), () => toast.error("Could not copy")) }} className="h-14 rounded-2xl bg-white/10 font-bold flex items-center justify-center gap-2 cursor-pointer"><Copy className="size-5" /> Copy link</button>
          <button type="button" onClick={() => openUrl(wa)} className="h-14 rounded-2xl bg-[#25D366] text-black font-bold flex items-center justify-center gap-2 cursor-pointer"><MessageCircle className="size-5" /> WhatsApp</button>
        </div>
        <a href={link} target="_blank" rel="noopener noreferrer" className="block text-center text-sm text-accent-orange font-semibold">See what they will see</a>
      </div>
    </div>
  )
}
