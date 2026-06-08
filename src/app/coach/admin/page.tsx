"use client"

import Link from "next/link"
import { CoachLayout } from "@/components/layout/CoachLayout"
import { Card, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PageSkeleton } from "@/components/ui/skeleton"
import { useCoachData } from "@/hooks/useCoach"

export default function CoachAdminPage() {
  const { clients, leads, analytics, loading } = useCoachData()

  if (loading) return <CoachLayout><PageSkeleton /></CoachLayout>

  const thisMonth = new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })

  return (
    <CoachLayout>
      <div className="mb-6">
        <h1 className="font-heading text-3xl text-white">COACH DASHBOARD</h1>
        <p className="text-sm text-white/40">{thisMonth}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardTitle className="text-xs uppercase tracking-wider text-white/40">Active Clients</CardTitle>
          <CardContent>
            <p className="font-heading text-3xl text-gold">{analytics?.activeClients || 0}</p>
            <p className="text-xs text-white/30">of {analytics?.totalClients || 0} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardTitle className="text-xs uppercase tracking-wider text-white/40">Monthly Revenue</CardTitle>
          <CardContent>
            <p className="font-heading text-3xl text-gold">
              ₹{(analytics?.monthlyRevenue || 0).toLocaleString("en-IN")}
            </p>
            <p className="text-xs text-white/30">this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardTitle className="text-xs uppercase tracking-wider text-white/40">New Leads</CardTitle>
          <CardContent>
            <p className="font-heading text-3xl text-gold">{analytics?.newLeads || 0}</p>
            <p className="text-xs text-white/30">awaiting contact</p>
          </CardContent>
        </Card>
        <Card>
          <CardTitle className="text-xs uppercase tracking-wider text-white/40">Check-in Rate</CardTitle>
          <CardContent>
            <p className="font-heading text-3xl text-gold">
              {Math.round((analytics?.checkinRate || 0) * 100)}%
            </p>
            <p className="text-xs text-white/30">this month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <CardTitle className="text-base">Recent Clients</CardTitle>
            <Link href="/coach/clients" className="text-xs text-gold hover:underline">View all</Link>
          </div>
          <CardContent>
            {clients.length > 0 ? (
              <div className="space-y-2">
                {clients.slice(0, 5).map((c) => (
                  <Link
                    key={c.uid}
                    href={`/coach/clients/${c.uid}`}
                    className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 transition-colors hover:bg-white/10"
                  >
                    <div>
                      <p className="text-sm text-white">{c.displayName}</p>
                      <p className="text-xs text-white/30">{c.goal || "No goal set"}</p>
                    </div>
                    <Badge
                      variant={
                        c.status === "active"
                          ? "success"
                          : c.status === "paused"
                            ? "warning"
                            : "outline"
                      }
                    >
                      {c.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-white/40 text-center py-6">No clients yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-3">
            <CardTitle className="text-base">Recent Leads</CardTitle>
            <Link href="/coach/leads" className="text-xs text-gold hover:underline">View all</Link>
          </div>
          <CardContent>
            {leads.length > 0 ? (
              <div className="space-y-2">
                {leads.slice(0, 5).map((l) => (
                  <div
                    key={l.id}
                    className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm text-white">{l.name}</p>
                      <p className="text-xs text-white/30">{l.phone}</p>
                    </div>
                    <Badge
                      variant={
                        l.status === "new"
                          ? "info"
                          : l.status === "contacted"
                            ? "warning"
                            : l.status === "converted"
                              ? "success"
                              : "outline"
                      }
                    >
                      {l.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-white/40 text-center py-6">No leads yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </CoachLayout>
  )
}
