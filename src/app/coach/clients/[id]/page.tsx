"use client"

import { use } from "react"
import { CoachLayout } from "@/components/layout/CoachLayout"
import { Card, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PageSkeleton } from "@/components/ui/skeleton"
import { useClientData } from "@/hooks/useClient"

export default function CoachClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { client, checkins, payments, loading } =
    useClientData(id)

  if (loading) return <CoachLayout><PageSkeleton /></CoachLayout>
  if (!client)
    return (
      <CoachLayout>
        <p className="text-sm text-white/40 text-center py-12">Client not found</p>
      </CoachLayout>
    )

  return (
    <CoachLayout>
      <div className="mb-6">
        <h1 className="font-heading text-3xl text-white">{client.displayName}</h1>
        <div className="flex items-center gap-2 mt-1">
          <Badge
            variant={
              client.status === "active"
                ? "success"
                : client.status === "paused"
                  ? "warning"
                  : "outline"
            }
          >
            {client.status}
          </Badge>
          <span className="text-xs text-white/30">{client.email}</span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 mb-6">
        <Card>
          <CardTitle className="text-xs uppercase tracking-wider text-white/40">Goal</CardTitle>
          <CardContent>
            <p className="text-sm text-white capitalize">{client.goal?.replace("-", " ") || "Not set"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardTitle className="text-xs uppercase tracking-wider text-white/40">Plan</CardTitle>
          <CardContent>
            <p className="text-sm text-white capitalize">{client.plan || "Not set"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardTitle className="text-xs uppercase tracking-wider text-white/40">Weight</CardTitle>
          <CardContent>
            <p className="text-sm text-white">{client.weight ? `${client.weight} kg` : "Not set"}</p>
          </CardContent>
        </Card>
      </div>

      {checkins.length > 0 && (
        <Card className="mb-4">
          <CardTitle className="text-base">Recent Check-ins</CardTitle>
          <CardContent>
            <div className="space-y-2">
              {checkins.slice(0, 5).map((c) => (
                <div key={c.id} className="rounded-lg bg-white/5 px-3 py-2">
                  <div className="flex items-center justify-between text-xs text-white/40 mb-1">
                    <span>{new Date(c.date).toLocaleDateString("en-IN")}</span>
                    <span>E:{c.energy}/10 S:{c.sleep}/10 M:{c.mood}/10</span>
                  </div>
                  {c.weight && <p className="text-xs text-white/60">Weight: {c.weight}kg</p>}
                  {c.notes && <p className="text-xs text-white/30 mt-1">{c.notes}</p>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {payments.length > 0 && (
        <Card className="mb-4">
          <CardTitle className="text-base">Payments</CardTitle>
          <CardContent>
            <div className="space-y-2">
              {payments.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                  <div>
                    <p className="text-sm text-white/70">{p.plan}</p>
                    <p className="text-xs text-white/30">{new Date(p.date).toLocaleDateString("en-IN")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gold">₹{p.amount.toLocaleString("en-IN")}</p>
                    <Badge variant={p.status === "completed" ? "success" : "warning"}>
                      {p.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </CoachLayout>
  )
}
