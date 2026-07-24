"use client"

import { useState, useEffect } from "react"
import { motion } from "motion/react"
import { TrendingUp, TrendingDown } from "lucide-react"
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
import { useStaggerReveal } from "@/hooks/useStaggerReveal"
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
    <div className="bg-bg-elevated border border-border-subtle rounded-xl p-3 text-sm">
      <p className="text-text-muted mb-1">{label}</p>
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
    <div className="px-5 pt-2 space-y-5 bg-bg-primary min-h-full">
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
  return c.form_data?.measurements.weight ?? c.weight
}

export default function ProgressPage() {
  const supabase = createClient()

  const [checkins, setCheckins] = useState<Checkin[]>([])
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
      <div className="px-5 flex flex-col items-center justify-center min-h-[60vh] space-y-4 bg-bg-primary">
        <div className="size-16 rounded-full bg-accent-gold/10 border border-accent-gold/30 flex items-center justify-center">
          <TrendingUp className="size-8 text-accent-gold" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-text-primary font-heading font-bold text-lg">No progress data yet</p>
          <p className="text-sm text-text-muted">Submit your first check-in to see progress</p>
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

  const firstAbdomen = checkins[0].form_data?.measurements.abdomen ?? null
  const latestAbdomen = latestCheckin.form_data?.measurements.abdomen ?? null
  const abdomenChange = firstAbdomen !== null && latestAbdomen !== null ? latestAbdomen - firstAbdomen : null

  const hasWeightData = checkins.some((c) => measurementWeight(c) !== null)
  const hasAdherenceData = checkins.some((c) => c.adherence_workout !== null || c.adherence_nutrition !== null)
  const hasMeasurements = checkins.some((c) => c.form_data?.measurements)

  return (
    <div className="px-5 pt-2 flex flex-col gap-6 bg-bg-primary min-h-full pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-bold text-xl text-text-primary tracking-tight">
          Your Progress
        </h2>
        <span className="text-[10px] font-bold text-bg-primary bg-accent-gold px-3 py-1.5 rounded-full uppercase tracking-wider">
          {checkins.length} Week{checkins.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Stats row */}
      <div ref={statsRef} className="grid grid-cols-2 gap-3.5 select-none">
        <div className="reveal-item bg-bg-card/80 border border-border-subtle backdrop-blur-xl p-4.5 rounded-2xl flex flex-col justify-between h-[100px]">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Total Weight Change</span>
          <div className="flex flex-col mt-1">
            <span className="font-heading font-bold text-2xl text-text-primary leading-none">
              {totalLoss !== null ? `${totalLoss > 0 ? "-" : "+"}${Math.abs(totalLoss).toFixed(1)} kg` : "—"}
            </span>
            {totalLoss !== null && (
              <span className="text-[9px] font-bold text-accent-gold bg-accent-gold/10 border border-accent-gold/30 px-2 py-0.5 rounded-full w-max mt-1 uppercase tracking-wider">
                {totalLoss > 0 ? "On Track" : totalLoss < 0 ? "Gaining" : "Stable"}
              </span>
            )}
          </div>
        </div>
        <div className="reveal-item bg-bg-card/80 border border-border-subtle backdrop-blur-xl p-4.5 rounded-2xl flex flex-col justify-between h-[100px]">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Waist Change</span>
          <div className="flex flex-col mt-1">
            <span className="font-heading font-bold text-2xl text-text-primary leading-none">
              {abdomenChange !== null ? `${abdomenChange > 0 ? "+" : ""}${abdomenChange.toFixed(1)} cm` : "—"}
            </span>
            {abdomenChange !== null && (
              <span className="text-[9px] font-bold text-accent-gold bg-accent-gold/10 border border-accent-gold/30 px-2 py-0.5 rounded-full w-max mt-1 uppercase tracking-wider">
                {abdomenChange < 0 ? "Excellent" : "Tracking"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Weight chart */}
      {hasWeightData && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-bg-card/80 border border-border-subtle backdrop-blur-xl rounded-2xl p-5"
        >
          <p className="font-heading font-bold text-xs text-text-primary uppercase tracking-wider mb-1">Weight Trend</p>
          <p className="text-[10px] text-text-muted mb-4">kg over weeks</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <XAxis dataKey="week" tick={{ fill: "#888888", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#888888", fontSize: 11 }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="weight"
                name="Weight (kg)"
                stroke="#FFB800"
                strokeWidth={3}
                dot={{ fill: "#0A0A0A", stroke: "#FFB800", strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5, fill: "#FFB800" }}
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
          transition={{ delay: 0.05 }}
          className="bg-bg-card/80 border border-border-subtle backdrop-blur-xl rounded-2xl p-5"
        >
          <p className="font-heading font-bold text-xs text-text-primary uppercase tracking-wider mb-1">Adherence</p>
          <p className="text-[10px] text-text-muted mb-4">workout & nutrition scores per week</p>
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-accent-gold" />
              <span className="text-[10px] text-text-muted font-semibold">Workout</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-bg-elevated border border-border-subtle" />
              <span className="text-[10px] text-text-muted font-semibold">Nutrition</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }} barGap={2}>
              <XAxis dataKey="week" tick={{ fill: "#888888", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#888888", fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 10]} ticks={[0, 5, 10]} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="workout" name="Workout" fill="#FFB800" radius={[3, 3, 0, 0]} />
              <Bar dataKey="nutrition" name="Nutrition" fill="#1A1A1A" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Measurement Log table */}
      {hasMeasurements && (
        <div className="bg-bg-card/80 border border-border-subtle backdrop-blur-xl rounded-2xl p-4.5 space-y-4">
          <div className="flex items-center gap-2 border-b border-border-subtle pb-2">
            <TrendingDown className="w-4 h-4 text-accent-gold" />
            <h3 className="font-heading font-bold text-xs text-text-primary uppercase tracking-wider">
              Measurement Log
            </h3>
          </div>

          <div className="overflow-x-auto select-none">
            <table className="w-full text-left text-xs font-semibold">
              <thead>
                <tr className="text-text-muted uppercase text-[9px] tracking-wider border-b border-border-subtle">
                  <th className="py-2">Week</th>
                  <th className="py-2">Weight</th>
                  <th className="py-2">Abdomen</th>
                  <th className="py-2">Hips</th>
                  <th className="py-2 text-right">Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle text-text-primary">
                {[...checkins].reverse().map((c, idx, arr) => {
                  const m = c.form_data?.measurements
                  const prev = arr[idx + 1]
                  const prevWeight = prev ? measurementWeight(prev) : null
                  const w = measurementWeight(c)
                  const change = w !== null && prevWeight !== null ? w - prevWeight : null
                  return (
                    <tr key={c.id} className="hover:bg-bg-elevated/50 transition-colors">
                      <td className="py-3 font-bold">W{c.week_number ?? "?"}</td>
                      <td className="py-3 font-heading">{w !== null ? `${w} kg` : "—"}</td>
                      <td className="py-3 font-heading">{m?.abdomen !== null && m?.abdomen !== undefined ? `${m.abdomen} cm` : "—"}</td>
                      <td className="py-3 font-heading">{m?.hips !== null && m?.hips !== undefined ? `${m.hips} cm` : "—"}</td>
                      <td className="py-3 text-right">
                        {change !== null ? (
                          <span className="text-accent-gold font-bold font-heading bg-accent-gold/10 border border-accent-gold/30 px-2 py-0.5 rounded-full text-[10px] inline-block">
                            {change > 0 ? "↑" : change < 0 ? "↓" : "="} {Math.abs(change).toFixed(1)}kg
                          </span>
                        ) : (
                          <span className="text-text-muted font-bold">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Check-in history */}
      <div className="bg-bg-card/80 border border-border-subtle backdrop-blur-xl rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border-subtle">
          <p className="font-heading font-bold text-xs text-text-primary uppercase tracking-wider">Check-in History</p>
        </div>
        <div ref={historyRef} className="divide-y divide-border-subtle">
          {[...checkins].reverse().map((c) => (
            <div key={c.id} className="reveal-item px-4 py-3 flex items-center justify-between">
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
                    <p className="text-accent-gold bg-accent-gold/10 border border-accent-gold/30 px-2 py-0.5 rounded-full text-sm font-bold">{c.adherence_workout}/10</p>
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
