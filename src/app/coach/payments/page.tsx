"use client"

import { CoachLayout } from "@/components/layout/CoachLayout"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PageSkeleton } from "@/components/ui/skeleton"
import { useCoachData } from "@/hooks/useCoach"

export default function CoachPaymentsPage() {
  const { payments, clients, loading } = useCoachData()

  if (loading) return <CoachLayout><PageSkeleton /></CoachLayout>

  const clientMap = new Map(clients.map((c) => [c.uid, c]))
  const total = payments.reduce((s, p) => s + p.amount, 0)
  const pending = payments
    .filter((p) => p.status === "pending")
    .reduce((s, p) => s + p.amount, 0)

  return (
    <CoachLayout>
      <div className="mb-6">
        <h1 className="font-heading text-3xl text-white">PAYMENTS</h1>
        <div className="flex gap-4 mt-2">
          <p className="text-sm text-white/40">
            Total: <span className="text-gold font-heading">₹{total.toLocaleString("en-IN")}</span>
          </p>
          {pending > 0 && (
            <p className="text-sm text-white/40">
              Pending: <span className="text-orange font-heading">₹{pending.toLocaleString("en-IN")}</span>
            </p>
          )}
        </div>
      </div>

      {payments.length > 0 ? (
        <div className="space-y-2">
          {payments.slice(0, 20).map((p) => {
            const client = clientMap.get(p.clientId)
            return (
              <Card key={p.id}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/70">
                      {client?.displayName || p.clientId.slice(0, 8)}
                    </p>
                    <p className="text-xs text-white/30">
                      {p.plan} &middot; {new Date(p.date).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-heading text-lg text-gold">
                      ₹{p.amount.toLocaleString("en-IN")}
                    </p>
                    <Badge
                      variant={
                        p.status === "completed"
                          ? "success"
                          : p.status === "failed"
                            ? "danger"
                            : "warning"
                      }
                    >
                      {p.status}
                    </Badge>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent>
            <p className="text-sm text-white/40 text-center py-8">No payments yet</p>
          </CardContent>
        </Card>
      )}
    </CoachLayout>
  )
}
