"use client"

import { useState, useEffect } from "react"
import { motion } from "motion/react"
import { TrendingUp } from "lucide-react"
import { format } from "date-fns"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts"
import { createClient } from "@/lib/supabase/client"
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
    <div className="bg-[#161616] border border-[#222222] rounded-xl p-3 text-sm">
      <p className="text-[#A0A0A0] mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  )
}

function ProgressSkeleton() {
  return (
    <div className="p-4 space-y-5 animate-pulse">
      <div className="h-7 w-40 bg-[#222222] rounded-xl" />
      <div className="flex gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex-1 h-20 bg-[#161616] border border-[#222222] rounded-2xl" />
        ))}
      </div>
      <div className="bg-[#161616] border border-[#222222] rounded-2xl h-48" />
      <div className="bg-[#161616] border border-[#222222] rounded-2xl h-48" />
    </div>
  )
}

export default function ProgressPage() {
  const supabase = createClient()

  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [isLoading, setIsLoading] = useState(true)

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

        const { data: checkinData } = await supabase
          .from("checkins")
          .select("*")
          .eq("client_id", client.id)
          .order("submitted_at", { ascending: true })

        if (checkinData) setCheckins(checkinData as Checkin[])
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  if (isLoading) return <ProgressSkeleton />

  if (checkins.length === 0) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="size-16 rounded-full bg-[#C9A84C]/10 flex items-center justify-center">
          <TrendingUp className="size-8 text-[#C9A84C]" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-white font-semibold text-lg">No progress data yet</p>
          <p className="text-sm text-[#C9A84C]">Submit your first check-in to see progress</p>
        </div>
      </div>
    )
  }

  const chartData: ChartEntry[] = checkins.map((c) => ({
    week: `W${c.week_number ?? "?"}`,
    weight: c.weight,
    workout: c.adherence_workout,
    nutrition: c.adherence_nutrition,
  }))

  const latestCheckin = checkins[checkins.length - 1]
  const avgEnergy =
    checkins.filter((c) => c.energy_level !== null).length > 0
      ? (
          checkins
            .filter((c) => c.energy_level !== null)
            .reduce((sum, c) => sum + (c.energy_level ?? 0), 0) /
          checkins.filter((c) => c.energy_level !== null).length
        ).toFixed(1)
      : "—"

  const hasWeightData = checkins.some((c) => c.weight !== null)
  const hasAdherenceData = checkins.some(
    (c) => c.adherence_workout !== null || c.adherence_nutrition !== null
  )

  return (
    <div className="p-4 space-y-5">
      {/* Header */}
      <div className="pt-2 flex items-center gap-2">
        <TrendingUp className="size-5 text-[#C9A84C]" />
        <h1
          className="text-xl font-bold text-white"
          style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
        >
          Progress
        </h1>
      </div>

      {/* Stats row */}
      <div className="flex gap-3">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 bg-[#161616] border border-[#222222] rounded-2xl p-4 text-center"
        >
          <p className="text-xl font-bold text-white">
            {latestCheckin.weight !== null ? `${latestCheckin.weight}` : "—"}
          </p>
          <p className="text-xs text-[#555555] mt-1">Current kg</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex-1 bg-[#161616] border border-[#222222] rounded-2xl p-4 text-center"
        >
          <p className="text-xl font-bold text-white">{checkins.length}</p>
          <p className="text-xs text-[#555555] mt-1">Total weeks</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex-1 bg-[#161616] border border-[#222222] rounded-2xl p-4 text-center"
        >
          <p className="text-xl font-bold text-[#C9A84C]">{avgEnergy}</p>
          <p className="text-xs text-[#555555] mt-1">Avg energy</p>
        </motion.div>
      </div>

      {/* Weight chart */}
      {hasWeightData && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#161616] border border-[#222222] rounded-2xl p-5"
        >
          <p className="text-white font-semibold mb-1">Weight Trend</p>
          <p className="text-xs text-[#555555] mb-4">kg over weeks</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="week"
                tick={{ fill: "#555555", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#555555", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                domain={["auto", "auto"]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="weight"
                name="Weight (kg)"
                stroke="#C9A84C"
                strokeWidth={2}
                dot={{ fill: "#C9A84C", strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5, fill: "#C9A84C" }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Adherence chart */}
      {hasAdherenceData && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-[#161616] border border-[#222222] rounded-2xl p-5"
        >
          <p className="text-white font-semibold mb-1">Adherence</p>
          <p className="text-xs text-[#555555] mb-4">workout & nutrition scores per week</p>
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-[#C9A84C]" />
              <span className="text-xs text-[#A0A0A0]">Workout</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-[#555555]" />
              <span className="text-xs text-[#A0A0A0]">Nutrition</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }} barGap={2}>
              <XAxis
                dataKey="week"
                tick={{ fill: "#555555", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#555555", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                domain={[0, 10]}
                ticks={[0, 5, 10]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="workout" name="Workout" fill="#C9A84C" radius={[3, 3, 0, 0]} />
              <Bar dataKey="nutrition" name="Nutrition" fill="#555555" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Check-in history */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-[#161616] border border-[#222222] rounded-2xl overflow-hidden"
      >
        <div className="p-4 border-b border-[#222222]">
          <p className="text-white font-semibold">Check-in History</p>
        </div>
        <div className="divide-y divide-[#1E1E1E]">
          {[...checkins].reverse().map((c) => (
            <div key={c.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium">Week {c.week_number ?? "?"}</p>
                <p className="text-xs text-[#555555] mt-0.5">
                  {format(new Date(c.submitted_at), "d MMM yyyy")}
                </p>
              </div>
              <div className="flex items-center gap-3 text-right">
                {c.weight !== null && (
                  <div>
                    <p className="text-white text-sm font-semibold">{c.weight}kg</p>
                    <p className="text-[#555555] text-xs">weight</p>
                  </div>
                )}
                {c.adherence_workout !== null && (
                  <div>
                    <p className="text-[#C9A84C] text-sm font-semibold">{c.adherence_workout}/10</p>
                    <p className="text-[#555555] text-xs">workout</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
