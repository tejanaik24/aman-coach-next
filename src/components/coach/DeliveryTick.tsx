"use client"

interface Props {
  status?: string | null
  error?: string | null
  showLabel?: boolean
  className?: string
}

export default function DeliveryTick({ status, error, showLabel = true, className = "" }: Props) {
  if (!status) return null

  const s = status.toLowerCase()

  if (s === "read") {
    return (
      <span
        className={`inline-flex items-center gap-1 text-[#53bdeb] font-bold text-xs ${className}`}
        title="Read by client"
      >
        <span className="tracking-tighter">✓✓</span>
        {showLabel && <span>Read</span>}
      </span>
    )
  }

  if (s === "delivered") {
    return (
      <span
        className={`inline-flex items-center gap-1 text-zinc-300 font-semibold text-xs ${className}`}
        title="Delivered to client"
      >
        <span className="tracking-tighter">✓✓</span>
        {showLabel && <span>Delivered</span>}
      </span>
    )
  }

  if (s === "failed") {
    const why = plainReason(error)
    return (
      <span
        className={`inline-flex items-center gap-1 text-red-400 font-semibold text-xs ${className}`}
        title={error || "Delivery failed"}
      >
        <span>✕</span>
        <span>Failed{why ? `: ${why}` : ""}</span>
      </span>
    )
  }

  // "sent" or pending
  return (
    <span
      className={`inline-flex items-center gap-1 text-zinc-400 font-medium text-xs ${className}`}
      title="Sent to WhatsApp"
    >
      <span>✓</span>
      {showLabel && <span>Sent</span>}
    </span>
  )
}


/** Meta's error text in words Aman understands. */
function plainReason(e?: string | null): string {
  if (!e) return ""
  if (/healthy ecosystem|131049/i.test(e)) return "WhatsApp limits promo-type messages to this person; try later or use Open in WhatsApp"
  if (/24 hours|re-engagement|131047/i.test(e)) return "they have not messaged in 24 hours"
  if (/not a valid whatsapp|131026|undeliverable/i.test(e)) return "number not on WhatsApp"
  return e
}
