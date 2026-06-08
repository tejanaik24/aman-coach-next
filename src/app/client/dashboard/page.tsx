"use client"

import Link from "next/link"
import { motion } from "motion/react"
import { ClientLayout } from "@/components/layout/ClientLayout"
import { PlanProgressBar } from "@/components/ui/PlanProgressBar"
import { useAuth } from "@/hooks/useAuth"
import { useClientData } from "@/hooks/useClient"
import { ClipboardList, UtensilsCrossed, Camera, MessageSquare, Bell } from "lucide-react"
import { format } from "date-fns"

const quickActions = [
  { href: "/client/workout", label: "My Workout Plan", icon: ClipboardList, color: "from-purple/20 to-purple/5" },
  { href: "/client/diet", label: "My Diet Plan", icon: UtensilsCrossed, color: "from-blue-500/20 to-blue-500/5" },
  { href: "/client/checkin", label: "Weekly Check-in", icon: Camera, color: "from-green-500/20 to-green-500/5" },
  { href: "/client/messages", label: "Message Coach", icon: MessageSquare, color: "from-orange-500/20 to-orange-500/5" },
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
  const { user } = useAuth()
  const { client, checkins, payments } = useClientData()

  const firstName = user?.displayName?.split(" ")[0] || "there"
  const lastCheckin = checkins[0]
  const latestPayment = payments[0]

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
          <div className="absolute top-0 right-0 size-40 rounded-full bg-purple/5 blur-3xl" />
          <div className="relative z-10">
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-1">
              Current Plan
            </p>
            <p className="font-heading text-xl text-white mb-1">
              {client?.plan ? `${client.plan.charAt(0).toUpperCase() + client.plan.slice(1)} Plan` : "No active plan"}
            </p>
            <p className="text-xs text-zinc-500 mb-4">
              Started {client?.startDate ? format(new Date(client.startDate), "MMM d, yyyy") : "—"}
            </p>
            <PlanProgressBar current={15} total={90} />
          </div>
        </motion.div>

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
                    className={`rounded-2xl border border-zinc-800 bg-gradient-to-br ${action.color} p-4 h-full transition-colors hover:border-purple/30`}
                  >
                    <div className="size-10 rounded-xl bg-zinc-800 flex items-center justify-center mb-3">
                      <Icon className="size-5 text-purple-light" />
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
                {format(new Date(lastCheckin.date), "MMM d")}
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
                  <p className="font-heading text-xl text-white">{lastCheckin.energy}/10</p>
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
                <p className="font-heading text-xl text-purple-light">
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
