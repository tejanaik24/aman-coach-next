"use client"

import { CoachLayout } from "@/components/layout/CoachLayout"
import { Card, CardTitle, CardContent } from "@/components/ui/card"
import { useCoachData } from "@/hooks/useCoach"
import { PageSkeleton } from "@/components/ui/skeleton"

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
      <h1 className="font-heading text-3xl text-white mb-6">PLANS</h1>

      <div className="grid gap-3 sm:grid-cols-3 mb-6">
        {Object.entries(planCounts).map(([plan, count]) => (
          <Card key={plan}>
            <CardTitle className="text-xs uppercase tracking-wider text-white/40 capitalize">
              {plan}
            </CardTitle>
            <CardContent>
              <p className="font-heading text-4xl text-gold">{count}</p>
              <p className="text-xs text-white/30">clients</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardTitle className="text-base">Client Plans</CardTitle>
        <CardContent>
          {clients.length > 0 ? (
            <div className="space-y-2">
              {clients.map((c) => (
                <div
                  key={c.uid}
                  className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2"
                >
                  <span className="text-sm text-white/70">{c.displayName}</span>
                  <span className="text-xs text-gold capitalize">
                    {c.plan || "Not assigned"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/40 text-center py-8">No clients yet</p>
          )}
        </CardContent>
      </Card>
    </CoachLayout>
  )
}
