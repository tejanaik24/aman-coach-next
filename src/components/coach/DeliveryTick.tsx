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
    return (
      <span
        className={`inline-flex items-center gap-1 text-red-400 font-semibold text-xs ${className}`}
        title={error || "Delivery failed"}
      >
        <span>✕</span>
        <span>Failed{error ? `: ${error}` : ""}</span>
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
