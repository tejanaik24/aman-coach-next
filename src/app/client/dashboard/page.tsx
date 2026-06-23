"use client"

import Link from "next/link"
import { motion } from "motion/react"
import { ClientLayout } from "@/components/layout/ClientLayout"
import { PlanProgressBar } from "@/components/ui/PlanProgressBar"
import { useAuth } from "@/hooks/useAuth"
import { useClientData } from "@/hooks/useClient"
import { getOnboardingForm } from "@/lib/store"
import { ClipboardList, UtensilsCrossed, Camera, MessageSquare, Apple, CheckSquare, CalendarDays, ClipboardCheck, ChevronRight } from "lucide-react"
import { format, differenceInDays } from "date-fns"
import { useEffect, useState } from "react"

const quickActions = [
  { href: "/client/workout", label: "My Workout Plan", icon: ClipboardList, color: "from-[#FFB800]/20 to-[#FFB800]/5" },
  { href: "/client/diet", label: "My Diet Plan", icon: UtensilsCrossed, color: "from-blue-500/20 to-blue-500/5" },
  { href: "/client/nutrition", label: "Log Meals", icon: Apple, color: "from-green-500/20 to-green-500/5" },
  { href: "/client/habits", label: "Daily Habits", icon: CheckSquare, color: "from-amber-500/20 to-amber-500/5" },
  { href: "/client/schedule", label: "Book Session", icon: CalendarDays, color: "from-orange-500/20 to-orange-500/5" },
  { href: "/client/checkin", label: "Weekly Check-in", icon: Camera, color: "from-[#FFB800]/20 to-[#FFB800]/5" },
  { href: "/client/messages", label: "Message Coach", icon: MessageSquare, color: "from-pink-500/20 to-pink-500/5" },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const } },
}

export default function ClientDashboardPage() {
  const { user, profile } = useAuth()
  const { client, checkins, payments } = useClientData()
  const [onboardingStatus, setOnboardingStatus] = useState<"pending" | "submitted" | null>(null)

  useEffect(() => {
    if (!user?.id) return
    getOnboardingForm(user.id).then(form => {
      if (!form) setOnboardingStatus("pending")
      else if (form.status === "pending") setOnboardingStatus("pending")
      else setOnboardingStatus("submitted")
    }).catch(() => {})
  }, [user?.id])

  const firstName = profile?.displayName?.split(" ")[0] || "there"
  const lastCheckin = checkins[0]
  const latestPayment = payments[0]

  const isValidDate = (d: unknown): d is Date => d instanceof Date && !isNaN(d.getTime())
  const planStart = client?.startDate && isValidDate(client.startDate) ? client.startDate : null
  const planEnd = client?.endDate && isValidDate(client.endDate) ? client.endDate : null
  const planDaysTotal = planStart && planEnd ? Math.max(1, differenceInDays(planEnd, planStart)) : 90
  const planDaysDone = planStart ? Math.min(planDaysTotal, Math.max(0, differenceInDays(new Date(), planStart))) : 0

  const hours = new Date().getHours()
  const greeting = hours < 12 ? "Good morning" : hours < 18 ? "Good afternoon" : "Good evening"

  return (
    <ClientLayout>
      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        <motion.div variants={itemVariants} className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-2xl text-white">
              {greeting}, {firstName} 👋
            </h1>
            <p className="text-sm text-zinc-500 mt-0.5">Here&apos;s your progress overview</p>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-900/50 p-5 mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 size-40 rounded-full bg-[#FFB800]/5 blur-3xl" />
          <div className="relative z-10">
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-1">
              Current Plan
            </p>
            <p className="font-heading text-xl text-white mb-1">
              {client?.plan ? `${client.plan.charAt(0).toUpperCase() + client.plan.slice(1)} Plan` : "No active plan"}
            </p>
            <p className="text-xs text-zinc-500 mb-4">
              Started {planStart ? format(planStart, "MMM d, yyyy") : "—"}
            </p>
            <PlanProgressBar current={planDaysDone} total={planDaysTotal} />
          </div>
        </motion.div>

        {onboardingStatus === "pending" && (
          <motion.div variants={itemVariants} className="mb-5">
            <Link href="/client/onboarding">
              <div className="rounded-2xl border border-[#FFB800]/40 bg-[#FFB800]/10 p-4 flex items-center justify-between hover:bg-[#FFB800]/15 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-[#FFB800]/20 flex items-center justify-center">
                    <ClipboardCheck className="size-5 text-[#FFB800]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Complete Your Intake Form</p>
                    <p className="text-xs text-zinc-400 mt-0.5">Aman needs this to build your plan</p>
                  </div>
                </div>
                <ChevronRight className="size-5 text-[#FFB800]" />
              </div>
            </Link>
          </motion.div>
        )}

        <motion.div variants={itemVariants} className="mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">Quick Actions</p>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <Link key={action.href} href={action.href}>
                  <motion.div
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className={`rounded-2xl border border-zinc-800 bg-gradient-to-br ${action.color} p-4 h-full transition-colors hover:border-[#FFB800]/30`}
                  >
                    <div className="size-10 rounded-xl bg-zinc-800 flex items-center justify-center mb-3">
                      <Icon className="size-5 text-[#FFD200]" />
                    </div>
                    <p className="text-sm font-medium text-white">{action.label}</p>
                  </motion.div>
                </Link>
              )
            })}
          </div>
        </motion.div>

        {lastCheckin && (
          <motion.div variants={itemVariants} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 mb-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Last Check-in</p>
              <span className="text-xs text-zinc-500">
                {isValidDate(lastCheckin.date) ? format(lastCheckin.date, "MMM d") : "—"}
              </span>
            </div>
            <div className="flex gap-6">
              {lastCheckin.weight && (
                <div>
                  <p className="text-xs text-zinc-500">Weight</p>
                  <p className="font-heading text-xl text-white">{lastCheckin.weight} kg</p>
                </div>
              )}
              {lastCheckin.energy && (
                <div>
                  <p className="text-xs text-zinc-500">Energy</p>
                  <p className="font-heading text-xl text-white">{lastCheckin.energy}/5</p>
                </div>
              )}
            </div>
            {lastCheckin.notes && (
              <p className="text-xs text-zinc-500 mt-2 line-clamp-2">{lastCheckin.notes}</p>
            )}
          </motion.div>
        )}

        {latestPayment && (
          <motion.div variants={itemVariants} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Payment Status</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Next payment</p>
                <p className="font-heading text-xl text-[#FFD200]">
                  ₹{latestPayment.amount?.toLocaleString("en-IN") || "—"}
                </p>
              </div>
              <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                latestPayment.status === "completed" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"
              }`}>
                {latestPayment.status === "completed" ? "Paid" : "Due"}
              </span>
            </div>
          </motion.div>
        )}
      </motion.div>
    </ClientLayout>
  )
}
