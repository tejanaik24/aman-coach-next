"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { CoachLayout } from "@/components/layout/CoachLayout"
import { StatCard } from "@/components/ui/StatCard"
import { ClientCard } from "@/components/ui/ClientCard"
import { Button } from "@/components/ui/button"
import { PageSkeleton } from "@/components/ui/skeleton"
import { useCoachData } from "@/hooks/useCoach"
import { useRouter } from "next/navigation"
import { Plus, RefreshCw, Calendar, AlertTriangle, Bell } from "lucide-react"
import toast from "react-hot-toast"

export default function CoachAdminPage() {
  const { clients, leads, analytics, loading, checkins } = useCoachData()
  const router = useRouter()
  const [lastReminder, setLastReminder] = useState<string | null>(null)
  const [expiringCount, setExpiringCount] = useState(0)

  useEffect(() => {
    fetch("/api/automation/dashboard-stats")
      .then((r) => r.json())
      .then((data) => {
        if (data.expiringCount !== undefined) setExpiringCount(data.expiringCount)
        if (data.today) setLastReminder(data.today)
      })
      .catch(() => {})
  }, [])

  if (loading) return <CoachLayout><PageSkeleton /></CoachLayout>

  const thisMonth = new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })

  const sendManualReminder = async () => {
    try {
      const r = await fetch("/api/automation/send-manual-reminder", { method: "POST", headers: { "x-automation-secret": "akfitness_automation_secret_2026" } })
      const data = await r.json()
      if (data.success) {
        toast.success("Reminder sent!")
        setLastReminder(new Date().toLocaleDateString("en-IN"))
      }
    } catch {
      toast.error("Failed to send reminders")
    }
  }

  return (
    <CoachLayout>
      <div className="mb-6">
        <h1 className="font-heading text-3xl text-white">Coach Dashboard</h1>
        <p className="text-sm text-zinc-500">{thisMonth}</p>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4 mb-6 snap-x snap-mandatory scrollbar-none">
        <StatCard icon="💰" value={`₹${(analytics?.monthlyRevenue || 0).toLocaleString("en-IN")}`} label="Revenue this month" />
        <StatCard icon="👥" value={`${analytics?.activeClients || 0}`} label="Active clients" />
        <StatCard icon="⏰" value={`${expiringCount}`} label="Expiring this week" />
        <StatCard icon="📊" value={`${checkins.length || 0}`} label="Check-ins received" />
      </div>

      <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
            <Bell className="size-3.5" /> Automations
          </h2>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="rounded-xl bg-zinc-800/50 p-3 text-center">
            <Calendar className="size-4 text-[#FFD200] mx-auto mb-1" />
            <p className="text-[10px] text-zinc-500">Last Check-in</p>
            <p className="text-xs text-white font-medium">{lastReminder || "—"}</p>
          </div>
          <div className="rounded-xl bg-zinc-800/50 p-3 text-center">
            <AlertTriangle className="size-4 text-yellow-400 mx-auto mb-1" />
            <p className="text-[10px] text-zinc-500">Pending Reminders</p>
            <p className="text-xs text-white font-medium">{/* counted live from API */}—</p>
          </div>
          <Link href="/coach/clients" className="rounded-xl bg-zinc-800/50 p-3 text-center block hover:bg-zinc-800 transition-colors">
            <AlertTriangle className="size-4 text-orange-400 mx-auto mb-1" />
            <p className="text-[10px] text-zinc-500">Expiring</p>
            <p className="text-xs text-white font-medium">{expiringCount}</p>
          </Link>
        </div>
        <Button
          onClick={sendManualReminder}
          className="w-full text-xs flex items-center justify-center gap-1.5"
          variant="outline"
          size="sm"
        >
          <RefreshCw className="size-3" />
          Send Manual Check-in Reminder
        </Button>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Clients</p>
          <Link href="/coach/clients" className="text-xs text-[#FFD200] hover:text-[#FFB800] transition-colors">
            View all
          </Link>
        </div>
        <div className="space-y-2">
          {clients.length > 0 ? (
            clients.slice(0, 5).map((c) => (
              <ClientCard
                key={c.uid}
                name={c.displayName}
                email={c.email}
                plan={c.plan}
                status={c.status}
                onClick={() => router.push(`/coach/clients/${c.uid}`)}
              />
            ))
          ) : (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-center">
              <p className="text-sm text-zinc-500">No clients yet</p>
              <Link
                href="/coach/clients/new"
                className="inline-flex items-center gap-1 mt-3 text-xs font-bold uppercase tracking-wider text-[#FFD200] hover:text-[#FFB800] transition-colors"
              >
                <Plus className="size-3" />
                Add your first client
              </Link>
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Recent Leads</p>
          <Link href="/coach/leads" className="text-xs text-[#FFD200] hover:text-[#FFB800] transition-colors">
            View all
          </Link>
        </div>
        {leads.length > 0 ? (
          <div className="space-y-2">
            {leads.slice(0, 3).map((l) => (
              <div key={l.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white font-medium">{l.name}</p>
                    <p className="text-xs text-zinc-500">{l.phone}</p>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${
                    l.status === "new" ? "bg-blue-500/20 text-blue-400" :
                    l.status === "contacted" ? "bg-yellow-500/20 text-yellow-400" :
                    l.status === "converted" ? "bg-green-500/20 text-green-400" :
                    "bg-zinc-800 text-zinc-500"
                  }`}>
                    {l.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-center">
            <p className="text-sm text-zinc-500">No leads yet</p>
          </div>
        )}
      </div>
    </CoachLayout>
  )
}
