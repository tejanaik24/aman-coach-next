"use client"

import { CoachLayout } from "@/components/layout/CoachLayout"
import { Card, CardTitle, CardContent } from "@/components/ui/card"
import { PageSkeleton } from "@/components/ui/skeleton"
import { useCoachData } from "@/hooks/useCoach"

export default function CoachAnalyticsPage() {
  const { analytics, loading } = useCoachData()

  if (loading) return <CoachLayout><PageSkeleton /></CoachLayout>

  return (
    <CoachLayout>
      <h1 className="font-heading text-3xl text-white mb-6">ANALYTICS</h1>

      <div className="grid gap-3 sm:grid-cols-2 mb-6">
        <Card>
          <CardTitle className="text-xs uppercase tracking-wider text-white/40">Total Clients</CardTitle>
          <CardContent>
            <p className="font-heading text-4xl text-gold">{analytics?.totalClients || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardTitle className="text-xs uppercase tracking-wider text-white/40">Active Clients</CardTitle>
          <CardContent>
            <p className="font-heading text-4xl text-gold">{analytics?.activeClients || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardTitle className="text-xs uppercase tracking-wider text-white/40">Total Revenue</CardTitle>
          <CardContent>
            <p className="font-heading text-4xl text-gold">
              ₹{(analytics?.totalRevenue || 0).toLocaleString("en-IN")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardTitle className="text-xs uppercase tracking-wider text-white/40">Conversion Rate</CardTitle>
          <CardContent>
            <p className="font-heading text-4xl text-gold">
              {Math.round((analytics?.conversionRate || 0) * 100)}%
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardTitle className="text-base">Insights</CardTitle>
        <CardContent>
          <div className="space-y-3 text-sm text-white/50">
            <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
              <span>Monthly Revenue</span>
              <span className="text-gold font-heading text-lg">
                ₹{(analytics?.monthlyRevenue || 0).toLocaleString("en-IN")}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
              <span>Check-in Rate (this month)</span>
              <span className="text-gold font-heading text-lg">
                {Math.round((analytics?.checkinRate || 0) * 100)}%
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
              <span>New Leads (this month)</span>
              <span className="text-gold font-heading text-lg">{analytics?.newLeads || 0}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </CoachLayout>
  )
}
