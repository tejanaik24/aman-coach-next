"use client"

import { cn } from "@/lib/utils"
import { Badge } from "./badge"
import { format } from "date-fns"
import { Download } from "lucide-react"

interface PaymentRowProps {
  clientName?: string
  clientEmail?: string
  amount: number
  date: Date
  status: "pending" | "completed" | "failed" | "refunded"
  plan?: string
  month?: string
  onMarkPaid?: () => void
  onDownload?: () => void
}

const statusConfig = {
  completed: { variant: "success" as const, label: "Paid" },
  pending: { variant: "warning" as const, label: "Pending" },
  failed: { variant: "danger" as const, label: "Failed" },
  refunded: { variant: "outline" as const, label: "Refunded" },
}

export function PaymentRow({ clientName, clientEmail, amount, date, status, plan, month, onMarkPaid, onDownload }: PaymentRowProps) {
  const config = statusConfig[status]

  return (
    <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex-1 min-w-0">
        {clientName && (
          <p className="text-sm text-white font-medium truncate">{clientName}</p>
        )}
        <div className="flex items-center gap-2 mt-0.5">
          <span className="font-heading text-lg text-white">₹{amount.toLocaleString("en-IN")}</span>
          {plan && <span className="text-xs text-zinc-500">{plan}</span>}
        </div>
        <p className="text-xs text-zinc-500 mt-0.5">
          {format(new Date(date), "MMM d, yyyy")}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={config.variant}>{config.label}</Badge>
        {status === "completed" && (
          <button onClick={onDownload} className="text-zinc-400 hover:text-white transition-colors">
            <Download className="size-4" />
          </button>
        )}
        {status === "pending" && onMarkPaid && (
          <button
            onClick={onMarkPaid}
            className="rounded-full bg-purple px-3 py-1 text-xs font-bold uppercase tracking-wider text-white hover:bg-purple-dark transition-colors"
          >
            Mark Paid
          </button>
        )}
      </div>
    </div>
  )
}
