"use client"

import { useState, useEffect, useCallback } from "react"
import { IndianRupee } from "lucide-react"
import { format } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import { useStaggerReveal } from "@/hooks/useStaggerReveal"
import { useCountUp } from "@/hooks/useCountUp"
import type { Client, Fee } from "@/types"

function statusBadge(status: string): string {
  if (status === "paid") return "bg-accent-gold/15 border border-accent-gold/30 text-accent-gold"
  if (status === "overdue") return "bg-danger/10 border border-danger/30 text-danger"
  return "bg-bg-elevated text-text-muted"
}

function FeeSkeleton() {
  return <div className="bg-bg-card rounded-2xl h-20 skeleton-pulse" />
}

function PaidStat({ value }: { value: number }) {
  const count = useCountUp(value)
  return (
    <div className="reveal-item bg-accent-gold/10 border border-accent-gold/40 shadow-[0_0_24px_rgba(255,184,0,0.15)] backdrop-blur-xl p-4.5 rounded-2xl flex flex-col justify-between h-[100px]">
      <span className="text-[10px] font-bold text-accent-gold/80 uppercase tracking-wider">Total Paid</span>
      <span className="font-heading font-bold text-2xl text-accent-gold">₹{count.toLocaleString("en-IN")}</span>
    </div>
  )
}

export default function ClientPaymentsPage() {
  const supabase = createClient()
  const [fees, setFees] = useState<Fee[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const listRef = useStaggerReveal<HTMLDivElement>([isLoading])

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .eq("user_id", user.id)
        .single()
      if (clientError || !clientData) return
      const client = clientData as Client

      const { data: feeRows } = await supabase
        .from("fees")
        .select("*")
        .eq("client_id", client.id)
        .order("due_date", { ascending: false })

      setFees((feeRows as Fee[] | null) ?? [])
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const totalPaid = fees.filter((f) => f.status === "paid").reduce((s, f) => s + Number(f.amount), 0)

  return (
    <div className="px-5 pt-2 flex flex-col gap-6 bg-bg-primary min-h-full pb-4">
      {/* Header */}
      <div className="flex flex-col">
        <span className="text-[11px] font-bold text-text-muted uppercase tracking-widest">
          Billing
        </span>
        <h2 className="font-heading font-bold text-xl text-text-primary leading-tight mt-0.5">
          Payments
        </h2>
      </div>

      {isLoading ? (
        <FeeSkeleton />
      ) : (
        <div className="grid grid-cols-1">
          <PaidStat value={totalPaid} />
        </div>
      )}

      <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider -mb-2">History</p>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <FeeSkeleton key={i} />)}
        </div>
      ) : fees.length === 0 ? (
        <div className="bg-bg-card/80 border border-border-subtle backdrop-blur-xl rounded-2xl py-16 flex flex-col items-center gap-4">
          <IndianRupee className="size-12 text-text-muted/40" />
          <div className="text-center">
            <p className="text-text-primary font-heading font-bold">No payments yet</p>
            <p className="text-sm text-text-muted mt-1">Fee records will appear here</p>
          </div>
        </div>
      ) : (
        <div ref={listRef} className="space-y-3">
          {fees.map((f) => (
            <div key={f.id} className="reveal-item bg-bg-card/80 border border-border-subtle backdrop-blur-xl rounded-2xl p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-text-primary font-heading font-bold text-sm">₹{Number(f.amount).toLocaleString("en-IN")}</p>
                  <p className="text-text-muted text-[10px] mt-0.5">
                    Due {format(new Date(f.due_date), "d MMM yyyy")}
                    {f.paid_date && ` · Paid ${format(new Date(f.paid_date), "d MMM yyyy")}`}
                  </p>
                </div>
                <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex-shrink-0 ${statusBadge(f.status)}`}>
                  {f.status}
                </span>
              </div>
              {f.notes && <p className="text-text-muted text-xs mt-2">{f.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
