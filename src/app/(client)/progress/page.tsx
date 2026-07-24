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
    <div className="bg-white rounded-xl p-3 text-sm shadow-bento">
      <p className="text-charcoal-muted mb-1">{label}</p>
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
    <div className="px-5 pt-2 space-y-5 bg-cream min-h-full">
      <div className="h-7 w-40 bg-white rounded-card-mobile animate-pulse" />
      <div className="grid grid-cols-2 gap-3.5">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-[100px] bg-white rounded-2xl shadow-bento animate-pulse" />
        ))}
      </div>
      <div className="bg-white rounded-card-mobile shadow-bento h-48 animate-pulse" />
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
      <div className="px-5 flex flex-col items-center justify-center min-h-[60vh] space-y-4 bg-cream">
        <div className="size-16 rounded-full bg-lime-tint flex items-center justify-center">
          <TrendingUp className="size-8 text-charcoal-deep" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-charcoal-deep font-montserrat font-bold text-lg">No progress data yet</p>
          <p className="text-sm text-charcoal-muted">Submit your first check-in to see progress</p>
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
    <div className="px-5 pt-2 flex flex-col gap-6 bg-cream min-h-full pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-montserrat font-black text-xl text-charcoal-deep uppercase tracking-tight">
          Your Progress
        </h2>
        <span className="text-[10px] font-bold text-lime-electric bg-charcoal-deep px-3 py-1.5 rounded-full uppercase tracking-wider shadow">
          {checkins.length} Week{checkins.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3.5 select-none">
        <div className="bg-white p-4.5 rounded-2xl shadow-bento flex flex-col justify-between h-[100px]">
          <span className="text-[10px] font-bold text-charcoal-muted uppercase tracking-wider">Total Weight Change</span>
          <div className="flex flex-col mt-1">
            <span className="font-montserrat font-black text-2xl text-charcoal-deep leading-none">
              {totalLoss !== null ? `${totalLoss > 0 ? "-" : "+"}${Math.abs(totalLoss).toFixed(1)} kg` : "—"}
            </span>
            {totalLoss !== null && (
              <span className="text-[9px] font-bold text-lime-electric bg-charcoal-deep px-2 py-0.5 rounded-full w-max mt-1 uppercase tracking-wider">
                {totalLoss > 0 ? "On Track" : totalLoss < 0 ? "Gaining" : "Stable"}
              </span>
            )}
          </div>
        </div>
        <div className="bg-white p-4.5 rounded-2xl shadow-bento flex flex-col justify-between h-[100px]">
          <span className="text-[10px] font-bold text-charcoal-muted uppercase tracking-wider">Waist Change</span>
          <div className="flex flex-col mt-1">
            <span className="font-montserrat font-black text-2xl text-charcoal-deep leading-none">
              {abdomenChange !== null ? `${abdomenChange > 0 ? "+" : ""}${abdomenChange.toFixed(1)} cm` : "—"}
            </span>
            {abdomenChange !== null && (
              <span className="text-[9px] font-bold text-lime-electric bg-charcoal-deep px-2 py-0.5 rounded-full w-max mt-1 uppercase tracking-wider">
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
          className="bg-white rounded-card-mobile p-5 shadow-bento"
        >
          <p className="font-montserrat font-bold text-xs text-charcoal-deep uppercase tracking-wider mb-1">Weight Trend</p>
          <p className="text-[10px] text-charcoal-muted mb-4">kg over weeks</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <XAxis dataKey="week" tick={{ fill: "#444935", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#444935", fontSize: 11 }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="weight"
                name="Weight (kg)"
                stroke="#C4F542"
                strokeWidth={3}
                dot={{ fill: "#1A1A1A", strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5, fill: "#1A1A1A" }}
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
          className="bg-white rounded-card-mobile p-5 shadow-bento"
        >
          <p className="font-montserrat font-bold text-xs text-charcoal-deep uppercase tracking-wider mb-1">Adherence</p>
          <p className="text-[10px] text-charcoal-muted mb-4">workout & nutrition scores per week</p>
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-lime-electric" />
              <span className="text-[10px] text-charcoal-muted font-semibold">Workout</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-charcoal-deep" />
              <span className="text-[10px] text-charcoal-muted font-semibold">Nutrition</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }} barGap={2}>
              <XAxis dataKey="week" tick={{ fill: "#444935", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#444935", fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 10]} ticks={[0, 5, 10]} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="workout" name="Workout" fill="#C4F542" radius={[3, 3, 0, 0]} />
              <Bar dataKey="nutrition" name="Nutrition" fill="#1A1A1A" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Measurement Log table */}
      {hasMeasurements && (
        <div className="bg-white rounded-card-mobile p-4.5 shadow-bento space-y-4">
          <div className="flex items-center gap-2 border-b border-cream pb-2">
            <TrendingDown className="w-4 h-4 text-lime-electric fill-charcoal-deep" />
            <h3 className="font-montserrat font-bold text-xs text-charcoal-deep uppercase tracking-wider">
              Measurement Log
            </h3>
          </div>

          <div className="overflow-x-auto select-none">
            <table className="w-full text-left text-xs font-semibold">
              <thead>
                <tr className="text-charcoal-muted uppercase text-[9px] tracking-wider border-b border-cream">
                  <th className="py-2">Week</th>
                  <th className="py-2">Weight</th>
                  <th className="py-2">Abdomen</th>
                  <th className="py-2">Hips</th>
                  <th className="py-2 text-right">Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream text-charcoal-deep">
                {[...checkins].reverse().map((c, idx, arr) => {
                  const m = c.form_data?.measurements
                  const prev = arr[idx + 1]
                  const prevWeight = prev ? measurementWeight(prev) : null
                  const w = measurementWeight(c)
                  const change = w !== null && prevWeight !== null ? w - prevWeight : null
                  return (
                    <tr key={c.id} className="hover:bg-cream/25 transition-colors">
                      <td className="py-3 font-bold">W{c.week_number ?? "?"}</td>
                      <td className="py-3 font-montserrat">{w !== null ? `${w} kg` : "—"}</td>
                      <td className="py-3 font-montserrat">{m?.abdomen !== null && m?.abdomen !== undefined ? `${m.abdomen} cm` : "—"}</td>
                      <td className="py-3 font-montserrat">{m?.hips !== null && m?.hips !== undefined ? `${m.hips} cm` : "—"}</td>
                      <td className="py-3 text-right">
                        {change !== null ? (
                          <span className="text-lime-electric font-black font-montserrat bg-charcoal-deep px-2 py-0.5 rounded-full text-[10px] inline-block">
                            {change > 0 ? "↑" : change < 0 ? "↓" : "="} {Math.abs(change).toFixed(1)}kg
                          </span>
                        ) : (
                          <span className="text-charcoal-muted font-bold">—</span>
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
      <div className="bg-white rounded-card-mobile shadow-bento overflow-hidden">
        <div className="p-4 border-b border-cream">
          <p className="font-montserrat font-bold text-xs text-charcoal-deep uppercase tracking-wider">Check-in History</p>
        </div>
        <div className="divide-y divide-cream">
          {[...checkins].reverse().map((c) => (
            <div key={c.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-charcoal-deep text-sm font-bold">Week {c.week_number ?? "?"}</p>
                <p className="text-[10px] text-charcoal-muted mt-0.5">{format(new Date(c.submitted_at), "d MMM yyyy")}</p>
              </div>
              <div className="flex items-center gap-3 text-right">
                {measurementWeight(c) !== null && (
                  <div>
                    <p className="text-charcoal-deep text-sm font-bold">{measurementWeight(c)}kg</p>
                    <p className="text-charcoal-muted text-[9px]">weight</p>
                  </div>
                )}
                {c.adherence_workout !== null && (
                  <div>
                    <p className="text-lime-electric bg-charcoal-deep px-2 py-0.5 rounded-full text-sm font-bold">{c.adherence_workout}/10</p>
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
