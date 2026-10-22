"use client"

import { useState } from "react"
import { Send, MessageCircle, X, ExternalLink, AlertCircle, CheckCircle2 } from "lucide-react"
import toast from "react-hot-toast"
import { openUrl } from "@/lib/utils"

interface Props {
  isOpen: boolean
  onClose: () => void
  initialPhone?: string
  initialMessage?: string
  onSent?: () => void
}

export default function MessageAnyNumberModal({
  isOpen,
  onClose,
  initialPhone = "",
  initialMessage = "",
  onSent,
}: Props) {
  const [phone, setPhone] = useState(initialPhone)
  const [message, setMessage] = useState(initialMessage)
  const [busy, setBusy] = useState(false)
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null)
  const [fallbackReason, setFallbackReason] = useState<string | null>(null)
  const [sentSuccess, setSentSuccess] = useState(false)

  if (!isOpen) return null

  function resetAndClose() {
    if (busy) return
    setPhone(initialPhone)
    setMessage(initialMessage)
    setFallbackUrl(null)
    setFallbackReason(null)
    setSentSuccess(false)
    onClose()
  }

  async function handleSend() {
    const cleanP = phone.trim().replace(/\s+/g, "")
    const cleanM = message.trim()
    if (!cleanP) {
      toast.error("Please enter a phone number")
      return
    }
    if (!cleanM) {
      toast.error("Please write a message")
      return
    }

    setBusy(true)
    setFallbackUrl(null)
    setFallbackReason(null)

    try {
      const res = await fetch("/api/coach/messages/send-any", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanP, message: cleanM }),
      })
      const data = await res.json()

      if (res.ok && data.success) {
        toast.success("Message sent successfully via business WhatsApp")
        setSentSuccess(true)
        onSent?.()
        setTimeout(() => {
          resetAndClose()
        }, 1200)
      } else {
        if (data.fallbackWaUrl) {
          setFallbackUrl(data.fallbackWaUrl)
          setFallbackReason(
            data.outside24h
              ? "Meta 24-hour window rule: recipient has not messaged the business number recently."
              : data.error || "Could not deliver via business number."
          )
        } else {
          toast.error(data.error || "Failed to send message")
        }
      }
    } catch {
      toast.error("Network error. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4"
      onClick={resetAndClose}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-bg-card border-t sm:border border-border-subtle p-5 pb-8 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-heading italic text-2xl">Message any number</h3>
            <p className="text-text-muted text-xs mt-0.5">Sends from your official business WhatsApp number</p>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            aria-label="Close"
            className="size-10 rounded-full bg-white/5 flex items-center justify-center text-text-muted hover:text-white cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {sentSuccess ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle2 className="size-12 text-[#25D366] mx-auto animate-bounce" />
            <p className="text-lg font-bold text-white">Sent!</p>
            <p className="text-sm text-text-muted">Message delivered to recipient</p>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1.5">
                Phone Number (10 digits or with country code)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9815690656 or 919815690656"
                disabled={busy}
                className="w-full h-14 rounded-2xl bg-[#1A1A1A] border border-[#333333] px-4 text-white text-base outline-none focus:border-[#C9A84C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1.5">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="Write your message here..."
                disabled={busy}
                className="w-full rounded-2xl bg-[#1A1A1A] border border-[#333333] p-4 text-white text-base outline-none focus:border-[#C9A84C] resize-none"
              />
            </div>

            {fallbackUrl && (
              <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 space-y-3">
                <div className="flex items-start gap-2 text-amber-400 text-xs">
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <p>{fallbackReason}</p>
                </div>
                <button
                  type="button"
                  onClick={() => openUrl(fallbackUrl)}
                  className="w-full h-12 rounded-xl bg-[#25D366] text-black font-bold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <MessageCircle className="size-4" /> Open in my WhatsApp
                </button>
              </div>
            )}

            <button
              type="button"
              disabled={busy}
              onClick={handleSend}
              className="w-full h-14 rounded-2xl bg-accent-orange text-black font-bold text-base flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 shadow-lg shadow-accent-orange/20"
            >
              {busy ? (
                "Sending…"
              ) : (
                <>
                  <Send className="size-4" /> Send from Business Number
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

