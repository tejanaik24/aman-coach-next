"use client"

import { ClientLayout } from "@/components/layout/ClientLayout"
import { Card, CardTitle, CardContent } from "@/components/ui/card"
import { PageSkeleton } from "@/components/ui/skeleton"
import { useClientData } from "@/hooks/useClient"
import { Checkin } from "@/types"

export default function ProgressPage() {
  const { checkins, loading } = useClientData()

  if (loading) return <ClientLayout><PageSkeleton /></ClientLayout>

  const weightData = checkins
    .filter((c: Checkin) => c.weight)
    .slice(0, 10)
    .reverse()

  return (
    <ClientLayout>
      <h1 className="font-heading text-3xl text-white mb-6">PROGRESS</h1>

      {weightData.length > 0 && (
        <Card className="mb-4">
          <CardTitle className="text-base">Weight Trend</CardTitle>
          <CardContent>
            <div className="flex items-end gap-2 h-32">
              {weightData.map((c: Checkin, i: number) => {
                const maxW = Math.max(...weightData.map((w: Checkin) => w.weight || 0))
                const h = ((c.weight || 0) / (maxW || 1)) * 100
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-white/30">{c.weight}kg</span>
                    <div
                      className="w-full rounded-t bg-gold/60 transition-all"
                      style={{ height: `${h}%` }}
                    />
                    <span className="text-[8px] text-white/20">
                      {new Date(c.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <h2 className="font-heading text-xl text-white mb-3">Check-in History</h2>
      {checkins.length > 0 ? (
        <div className="space-y-2">
          {checkins.slice(0, 10).map((c: Checkin) => (
            <Card key={c.id}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-white/70">
                  {new Date(c.date).toLocaleDateString("en-IN", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </span>
                {c.adherence && (
                  <span className="text-xs text-gold">{c.adherence}%</span>
                )}
              </div>
              <div className="flex gap-3 text-xs text-white/40">
                {c.weight && <span>W: {c.weight}kg</span>}
                {c.energy && <span>E: {c.energy}/10</span>}
                {c.sleep && <span>S: {c.sleep}/10</span>}
                {c.mood && <span>M: {c.mood}/10</span>}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent>
            <p className="text-sm text-white/40 text-center py-8">
              No check-ins yet. Start tracking your progress!
            </p>
          </CardContent>
        </Card>
      )}
    </ClientLayout>
  )
}
