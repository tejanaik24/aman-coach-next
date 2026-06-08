"use client"

import { useState } from "react"
import { CoachLayout } from "@/components/layout/CoachLayout"
import { PaymentRow } from "@/components/ui/PaymentRow"
import { PageSkeleton } from "@/components/ui/skeleton"
import { useCoachData } from "@/hooks/useCoach"
import { IndianRupee, ChevronLeft, ChevronRight } from "lucide-react"
import { format } from "date-fns"

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

export default function CoachPaymentsPage() {
  const { payments, clients, loading } = useCoachData()
  const now = new Date()
  const [monthIdx, setMonthIdx] = useState(now.getMonth())

  if (loading) return <CoachLayout><PageSkeleton /></CoachLayout>

  const clientMap = new Map(clients.map((c) => [c.uid, c]))

  const filtered = payments.filter((p) => {
    const d = new Date(p.date)
    return d.getMonth() === monthIdx && d.getFullYear() === now.getFullYear()
  })

  const totalCollected = filtered
    .filter((p) => p.status === "completed")
    .reduce((s, p) => s + p.amount, 0)

  const totalPending = filtered
    .filter((p) => p.status === "pending")
    .reduce((s, p) => s + p.amount, 0)

  return (
    <CoachLayout>
      <div className="flex items-center gap-2 mb-4">
        <IndianRupee className="size-5 text-purple" />
        <h1 className="font-heading text-2xl text-white">Payments</h1>
      </div>

      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setMonthIdx(monthIdx - 1)}
          className="rounded-full border border-zinc-800 p-2 text-zinc-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="size-4" />
        </button>
        <p className="text-sm font-medium text-white">{months[monthIdx]} {now.getFullYear()}</p>
        <button
          onClick={() => setMonthIdx(Math.min(monthIdx + 1, now.getMonth()))}
          disabled={monthIdx >= now.getMonth()}
          className="rounded-full border border-zinc-800 p-2 text-zinc-400 hover:text-white transition-colors disabled:opacity-30"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Collected</p>
          <p className="font-heading text-2xl text-green-400 mt-1">
            ₹{totalCollected.toLocaleString("en-IN")}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Pending</p>
          <p className="font-heading text-2xl text-yellow-400 mt-1">
            ₹{totalPending.toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((p) => (
            <PaymentRow
              key={p.id}
              clientName={clientMap.get(p.clientId)?.displayName}
              amount={p.amount}
              date={p.date}
              status={p.status}
              plan={p.plan}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <IndianRupee className="size-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">No payments for {months[monthIdx]}</p>
        </div>
      )}
    </CoachLayout>
  )
}
