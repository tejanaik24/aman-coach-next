"use client"

import { CoachLayout } from "@/components/layout/CoachLayout"
import { PageSkeleton } from "@/components/ui/skeleton"
import { useCoachData } from "@/hooks/useCoach"
import { BarChart3, TrendingUp, Users, IndianRupee } from "lucide-react"

export default function CoachAnalyticsPage() {
  const { analytics, loading } = useCoachData()

  if (loading) return <CoachLayout><PageSkeleton /></CoachLayout>

  const cards = [
    { icon: Users, label: "Total Clients", value: `${analytics?.totalClients || 0}`, sub: "all time" },
    { icon: TrendingUp, label: "Active Clients", value: `${analytics?.activeClients || 0}`, sub: "currently" },
    { icon: IndianRupee, label: "Total Revenue", value: `₹${(analytics?.totalRevenue || 0).toLocaleString("en-IN")}`, sub: "all time" },
    { icon: BarChart3, label: "Conversion Rate", value: `${Math.round((analytics?.conversionRate || 0) * 100)}%`, sub: "lead to client" },
  ]

  return (
    <CoachLayout>
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="size-5 text-[#FFB800]" />
        <h1 className="font-heading text-2xl text-white">Analytics</h1>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 mb-6">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.label} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="size-4 text-[#FFD200]" />
                <p className="text-xs text-zinc-500 uppercase tracking-wider">{card.label}</p>
              </div>
              <p className="font-heading text-3xl text-white">{card.value}</p>
              <p className="text-xs text-zinc-600 mt-0.5">{card.sub}</p>
            </div>
          )
        })}
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <p className="text-sm font-medium text-white mb-3">Monthly Insights</p>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl bg-zinc-800/50 px-3 py-2.5">
            <span className="text-sm text-zinc-400">Monthly Revenue</span>
            <span className="font-heading text-lg text-[#FFD200]">
              ₹{(analytics?.monthlyRevenue || 0).toLocaleString("en-IN")}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-zinc-800/50 px-3 py-2.5">
            <span className="text-sm text-zinc-400">Check-in Rate</span>
            <span className="font-heading text-lg text-[#FFD200]">
              {Math.round((analytics?.checkinRate || 0) * 100)}%
            </span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-zinc-800/50 px-3 py-2.5">
            <span className="text-sm text-zinc-400">New Leads</span>
            <span className="font-heading text-lg text-[#FFD200]">{analytics?.newLeads || 0}</span>
          </div>
        </div>
      </div>
    </CoachLayout>
  )
}
