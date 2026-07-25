"use client"

import { useState, useEffect } from "react"
import { motion } from "motion/react"
import { TrendingUp, TrendingDown, Award } from "lucide-react"
import { format } from "date-fns"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts"
import { createClient } from "@/lib/supabase/client"
import { useStaggerReveal } from "@/hooks/useStaggerReveal"
import BadgesGrid from "@/components/client/BadgesGrid"
import { getClientBadges, type ClientBadge } from "@/lib/badges"
import type { Client, Checkin } from "@/types"

interface ChartEntry {
  week: string
  weight: number | null
  workout: number | null
  nutrition: number | null
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#121215] border border-[#FFB800]/40 rounded-xl p-3 text-xs shadow-xl">
      <p className="text-zinc-400 font-bold mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-bold">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  )
}

function ProgressSkeleton() {
  return (
    <div className="px-5 pt-3 space-y-5 bg-bg-primary min-h-screen">
      <div className="h-7 w-40 bg-bg-card rounded-2xl skeleton-pulse" />
      <div className="grid grid-cols-2 gap-3.5">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-[100px] bg-bg-card rounded-2xl skeleton-pulse" />
        ))}
      </div>
      <div className="bg-bg-card rounded-2xl h-48 skeleton-pulse" />
    </div>
  )
}

function measurementWeight(c: Checkin): number | null {
  return c.form_data?.measurements?.weight ?? c.weight
}

export default function ProgressPage() {
  const supabase = createClient()

  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [clientBadges, setClientBadges] = useState<ClientBadge[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const statsRef = useStaggerReveal<HTMLDivElement>([isLoading])
  const historyRef = useStaggerReveal<HTMLDivElement>([isLoading])

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: clientData, error: clientError } = await supabase
          .from("clients")
          .select("*")
          .eq("user_id", user.id)
          .single()
        if (clientError || !clientData) return
        const client = clientData as Client

        const [checkinRes, badges] = await Promise.all([
          supabase.from("checkins").select("*").eq("client_id", client.id).order("submitted_at", { ascending: true }),
          getClientBadges(client.id)
        ])

        if (checkinRes.data) setCheckins(checkinRes.data as Checkin[])
        setClientBadges(badges)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  if (isLoading) return <ProgressSkeleton />

  if (checkins.length === 0) {
    return (
      <div className="px-5 flex flex-col items-center justify-center min-h-[60vh] space-y-4 bg-bg-primary">
        <div className="size-16 rounded-full bg-accent-gold/10 border border-accent-gold/30 flex items-center justify-center">
          <TrendingUp className="size-8 text-accent-gold" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-text-primary font-heading font-bold text-lg">No progress data yet</p>
          <p className="text-sm text-text-muted">Submit your first check-in to start tracking!</p>
        </div>
      </div>
    )
  }

  const chartData: ChartEntry[] = checkins.map((c) => ({
    week: `W${c.week_number ?? "?"}`,
    weight: measurementWeight(c),
    workout: c.adherence_workout,
    nutrition: c.adherence_nutrition,
  }))

  const firstWeight = measurementWeight(checkins[0])
  const latestCheckin = checkins[checkins.length - 1]
  const latestWeight = measurementWeight(latestCheckin)
  const totalLoss = firstWeight !== null && latestWeight !== null ? firstWeight - latestWeight : null

  const firstAbdomen = checkins[0].form_data?.measurements?.abdomen ?? null
  const latestAbdomen = latestCheckin.form_data?.measurements?.abdomen ?? null
  const abdomenChange = firstAbdomen !== null && latestAbdomen !== null ? latestAbdomen - firstAbdomen : null

  const hasWeightData = checkins.some((c) => measurementWeight(c) !== null)
  const hasAdherenceData = checkins.some((c) => c.adherence_workout !== null || c.adherence_nutrition !== null)
  const hasMeasurements = checkins.some((c) => c.form_data?.measurements)

  return (
    <div className="px-5 pt-3 flex flex-col gap-6 bg-bg-primary min-h-screen pb-28 relative">
      {/* Ambient Glow */}
      <div className="radial-gold-ambient top-20 right-0 opacity-40" />

      {/* Header */}
      <div className="flex items-center justify-between z-10">
        <div>
          <span className="text-[10px] font-bold text-accent-gold uppercase tracking-widest block">Analytics</span>
          <h2 className="font-heading font-bold text-2xl text-text-primary tracking-tight mt-0.5">
            Your Progress
          </h2>
        </div>
        <span className="text-[10px] font-bold text-bg-primary bg-accent-gold px-3.5 py-1 rounded-full uppercase tracking-wider shadow-md">
          {checkins.length} Week{checkins.length === 1 ? "" : "s"} Total
        </span>
      </div>

      {/* Badges & Milestones Case */}
      <div className="glass-card p-5 rounded-3xl z-10 shadow-2xl">
        <BadgesGrid unlockedBadges={clientBadges} title="Unlocked Achievements" showAll={true} />
      </div>

      {/* Stats row */}
      <div ref={statsRef} className="grid grid-cols-2 gap-3.5 select-none z-10">
        <div className="reveal-item glass-card p-4.5 rounded-3xl flex flex-col justify-between h-[105px]">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Total Weight Loss</span>
          <div className="flex flex-col mt-1">
            <span className="font-heading font-bold text-2xl text-text-primary leading-none">
              {totalLoss !== null ? `${totalLoss > 0 ? "-" : "+"}${Math.abs(totalLoss).toFixed(1)} kg` : "—"}
            </span>
            {totalLoss !== null && (
              <span className="text-[9px] font-bold text-accent-gold bg-accent-gold/15 border border-accent-gold/30 px-2 py-0.5 rounded-full w-max mt-1 uppercase tracking-wider">
                {totalLoss > 0 ? "On Track" : totalLoss < 0 ? "Gaining" : "Stable"}
              </span>
            )}
          </div>
        </div>

        <div className="reveal-item glass-card p-4.5 rounded-3xl flex flex-col justify-between h-[100px]">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Waist Change</span>
          <div className="flex flex-col mt-1">
            <span className="font-heading font-bold text-2xl text-text-primary leading-none">
              {abdomenChange !== null ? `${abdomenChange > 0 ? "+" : ""}${abdomenChange.toFixed(1)} cm` : "—"}
            </span>
            {abdomenChange !== null && (
              <span className="text-[9px] font-bold text-accent-gold bg-accent-gold/15 border border-accent-gold/30 px-2 py-0.5 rounded-full w-max mt-1 uppercase tracking-wider">
                {abdomenChange < 0 ? "Excellent" : "Tracking"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Weight Chart (Gradient Area) */}
      {hasWeightData && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-3xl p-5 z-10 shadow-2xl"
        >
          <p className="font-heading font-bold text-xs text-text-primary uppercase tracking-widest mb-1">Weight Progression</p>
          <p className="text-[10px] text-text-muted mb-4">Body weight (kg) over check-in weeks</p>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="weightGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FFB800" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#FFB800" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="week" tick={{ fill: "#888888", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#888888", fontSize: 11 }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="weight"
                name="Weight (kg)"
                stroke="#FFB800"
                strokeWidth={3}
                fill="url(#weightGlow)"
                dot={{ fill: "#0A0A0A", stroke: "#FFB800", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: "#FFB800" }}
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Adherence Chart */}
      {hasAdherenceData && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-card rounded-3xl p-5 z-10 shadow-2xl"
        >
          <p className="font-heading font-bold text-xs text-text-primary uppercase tracking-widest mb-1">Adherence History</p>
          <p className="text-[10px] text-text-muted mb-3">Workout & nutrition adherence scores (out of 10)</p>
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center gap-1.5">
              <div className="size-3 rounded-sm bg-accent-gold" />
              <span className="text-[10px] text-text-muted font-semibold">Workout</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-3 rounded-sm bg-bg-elevated border border-border-subtle" />
              <span className="text-[10px] text-text-muted font-semibold">Nutrition</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }} barGap={3}>
              <XAxis dataKey="week" tick={{ fill: "#888888", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#888888", fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 10]} ticks={[0, 5, 10]} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="workout" name="Workout" fill="#FFB800" radius={[4, 4, 0, 0]} />
              <Bar dataKey="nutrition" name="Nutrition" fill="#27272A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Check-in History List */}
      <div className="glass-card rounded-3xl overflow-hidden z-10 shadow-xl">
        <div className="p-4 border-b border-white/5">
          <p className="font-heading font-bold text-xs text-text-primary uppercase tracking-widest">Check-in Logs</p>
        </div>
        <div ref={historyRef} className="divide-y divide-border-subtle">
          {[...checkins].reverse().map((c) => (
            <div key={c.id} className="reveal-item px-4 py-3.5 flex items-center justify-between">
              <div>
                <p className="text-text-primary text-sm font-bold">Week {c.week_number ?? "?"}</p>
                <p className="text-[10px] text-text-muted mt-0.5">{format(new Date(c.submitted_at), "d MMM yyyy")}</p>
              </div>
              <div className="flex items-center gap-3 text-right">
                {measurementWeight(c) !== null && (
                  <div>
                    <p className="text-text-primary text-sm font-bold">{measurementWeight(c)}kg</p>
                    <p className="text-text-muted text-[9px]">weight</p>
                  </div>
                )}
                {c.adherence_workout !== null && (
                  <div>
                    <p className="text-accent-gold bg-accent-gold/15 border border-accent-gold/30 px-2.5 py-0.5 rounded-full text-xs font-bold">{c.adherence_workout}/10</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
