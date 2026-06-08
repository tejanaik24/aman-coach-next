"use client"

import { useState } from "react"
import { ClientLayout } from "@/components/layout/ClientLayout"
import { EmptyState } from "@/components/ui/EmptyState"
import { PageSkeleton } from "@/components/ui/skeleton"
import { useClientData } from "@/hooks/useClient"
import { Checkin } from "@/types"
import { BarChart3, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { format } from "date-fns"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"
import { motion } from "motion/react"

export default function ProgressPage() {
  const { checkins, loading } = useClientData()
  const [tab, setTab] = useState<"weight" | "photos">("weight")

  if (loading) return <ClientLayout><PageSkeleton /></ClientLayout>

  const weightData = checkins
    .filter((c: Checkin) => c.weight)
    .slice()
    .reverse()
    .map((c: Checkin) => ({
      date: format(new Date(c.date), "MMM d"),
      weight: c.weight,
      fullDate: format(new Date(c.date), "MMM d, yyyy"),
    }))

  const chartData = weightData.slice(-12)

  const hasPhotos = checkins.some((c: Checkin) => c.photos && c.photos.length > 0)

  if (checkins.length < 2) {
    return (
      <ClientLayout>
        <EmptyState
          icon="📊"
          title="Not Enough Data"
          description="Keep checking in to see your progress graph. You need at least 2 check-ins!"
        />
      </ClientLayout>
    )
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 shadow-lg">
          <p className="text-xs text-zinc-500">{payload[0].payload.fullDate}</p>
          <p className="font-heading text-lg text-white">{payload[0].value} kg</p>
        </div>
      )
    }
    return null
  }

  const getChangeIcon = (current: number, previous?: number) => {
    if (!previous) return <Minus className="size-3 text-zinc-500" />
    if (current < previous) return <TrendingDown className="size-3 text-green-400" />
    if (current > previous) return <TrendingUp className="size-3 text-red-400" />
    return <Minus className="size-3 text-zinc-500" />
  }

  return (
    <ClientLayout>
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 className="size-6 text-purple" />
        <h1 className="font-heading text-2xl text-white">Progress</h1>
      </div>

      <div className="flex gap-2 mb-6">
        {(["weight", "photos"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${
              tab === t
                ? "bg-purple text-white"
                : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-600"
            }`}
          >
            {t === "weight" ? "Weight" : "Photos"}
          </button>
        ))}
      </div>

      {tab === "weight" && (
        <>
          {chartData.length > 1 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 mb-6"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">Weight Trend</p>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tick={{ fill: "#888", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#888", fontSize: 11 }} axisLine={false} tickLine={false} domain={["dataMin - 2", "dataMax + 2"]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="#7C3AED"
                      strokeWidth={2.5}
                      dot={{ fill: "#7C3AED", r: 4 }}
                      activeDot={{ fill: "#7C3AED", r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">Check-in History</p>
            <div className="space-y-2">
              {checkins.slice(0, 8).map((c: Checkin, i: number) => {
                const prevWeight = i < checkins.length - 1 ? checkins[i + 1].weight : undefined
                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900 p-4"
                  >
                    <div>
                      <p className="text-sm text-white font-medium">
                        {format(new Date(c.date), "EEE, MMM d")}
                      </p>
                      <div className="flex gap-3 text-xs text-zinc-500 mt-1">
                        {c.weight && <span>W: {c.weight}kg</span>}
                        {c.energy && <span>E: {c.energy}/5</span>}
                        {c.sleep && <span>S: {c.sleep}/5</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {c.weight && prevWeight && (
                        <div className="flex items-center gap-1">
                          {getChangeIcon(c.weight, prevWeight)}
                          <span className="text-xs text-zinc-500">
                            {c.weight > prevWeight ? "+" : ""}{(c.weight - prevWeight).toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        </>
      )}

      {tab === "photos" && (
        <div>
          {hasPhotos ? (
            <p className="text-sm text-zinc-500 text-center py-8">
              Photos coming soon with real upload data.
            </p>
          ) : (
            <EmptyState
              icon="📸"
              title="No Photos Yet"
              description="Start uploading progress photos in your weekly check-in to see them here."
            />
          )}
        </div>
      )}
    </ClientLayout>
  )
}
