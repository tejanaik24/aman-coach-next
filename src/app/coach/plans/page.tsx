"use client"

import { CoachLayout } from "@/components/layout/CoachLayout"
import { PageSkeleton } from "@/components/ui/skeleton"
import { useCoachData } from "@/hooks/useCoach"
import { ClipboardList } from "lucide-react"

export default function CoachPlansPage() {
  const { clients, loading } = useCoachData()

  if (loading) return <CoachLayout><PageSkeleton /></CoachLayout>

  const planCounts: Record<string, number> = {}
  clients.forEach((c) => {
    const p = c.plan || "unassigned"
    planCounts[p] = (planCounts[p] || 0) + 1
  })

  return (
    <CoachLayout>
      <div className="flex items-center gap-2 mb-6">
        <ClipboardList className="size-5 text-purple" />
        <h1 className="font-heading text-2xl text-white">Plans</h1>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 mb-6">
        {Object.entries(planCounts).map(([plan, count]) => (
          <div key={plan} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider capitalize">{plan}</p>
            <p className="font-heading text-4xl text-purple-light mt-1">{count}</p>
            <p className="text-xs text-zinc-600">clients</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <p className="text-sm font-medium text-white mb-3">Client Plans</p>
        {clients.length > 0 ? (
          <div className="space-y-2">
            {clients.map((c) => (
              <div
                key={c.uid}
                className="flex items-center justify-between rounded-xl bg-zinc-800/50 px-3 py-2"
              >
                <span className="text-sm text-zinc-300">{c.displayName}</span>
                <span className="text-xs text-purple-light capitalize">
                  {c.plan || "Not assigned"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500 text-center py-6">No clients yet</p>
        )}
      </div>
    </CoachLayout>
  )
}
