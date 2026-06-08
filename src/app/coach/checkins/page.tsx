"use client"

import { CoachLayout } from "@/components/layout/CoachLayout"
import { Card, CardTitle, CardContent } from "@/components/ui/card"
import { PageSkeleton } from "@/components/ui/skeleton"
import { useCoachData } from "@/hooks/useCoach"

export default function CoachCheckinsPage() {
  const { checkins, clients, loading } = useCoachData()

  if (loading) return <CoachLayout><PageSkeleton /></CoachLayout>

  const clientMap = new Map(clients.map((c) => [c.uid, c]))

  return (
    <CoachLayout>
      <h1 className="font-heading text-3xl text-white mb-6">CHECK-INS</h1>

      {checkins.length > 0 ? (
        <div className="space-y-3">
          {checkins.slice(0, 20).map((c) => {
            const client = clientMap.get(c.clientId)
            return (
              <Card key={c.id}>
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-sm">
                    {client?.displayName || c.clientId.slice(0, 8)}
                  </CardTitle>
                  <span className="text-xs text-white/40">
                    {new Date(c.date).toLocaleDateString("en-IN")}
                  </span>
                </div>
                <CardContent className="p-0">
                  <div className="flex flex-wrap gap-3 text-xs text-white/50">
                    {c.weight && <span>Weight: {c.weight}kg</span>}
                    {c.energy && <span>Energy: {c.energy}/10</span>}
                    {c.sleep && <span>Sleep: {c.sleep}/10</span>}
                    {c.mood && <span>Mood: {c.mood}/10</span>}
                    {c.adherence && <span>Adherence: {c.adherence}%</span>}
                  </div>
                  {c.notes && (
                    <p className="text-xs text-white/30 mt-2">{c.notes}</p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent>
            <p className="text-sm text-white/40 text-center py-8">No check-ins yet</p>
          </CardContent>
        </Card>
      )}
    </CoachLayout>
  )
}
