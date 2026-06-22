"use client"

import { useState } from "react"
import { CoachLayout } from "@/components/layout/CoachLayout"
import { Input } from "@/components/ui/input"
import { PageSkeleton } from "@/components/ui/skeleton"
import { useCoachData } from "@/hooks/useCoach"
import { updateLeadStatus } from "@/lib/store"
import { Lead } from "@/types"
import toast from "react-hot-toast"
import { motion } from "motion/react"
import { Search, Users2, Plus, Send, List, Columns3 } from "lucide-react"
import { format } from "date-fns"

const pipelineStages = [
  { key: "new", label: "New", color: "bg-blue-500/20 text-blue-400" },
  { key: "contacted", label: "Contacted", color: "bg-yellow-500/20 text-yellow-400" },
  { key: "qualified", label: "Trial", color: "bg-[#FFB800]/20 text-[#FFD200]" },
  { key: "converted", label: "Converted", color: "bg-green-500/20 text-green-400" },
  { key: "lost", label: "Lost", color: "bg-red-500/20 text-red-400" },
]

export default function CoachLeadsPage() {
  const { leads, loading } = useCoachData()
  const [search, setSearch] = useState("")
  const [view, setView] = useState<"list" | "kanban">("list")

  const filtered = leads.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.email?.toLowerCase().includes(search.toLowerCase()) ||
      l.phone.includes(search)
  )

  const handleStatus = async (id: string, status: Lead["status"]) => {
    try {
      await updateLeadStatus(id, status)
      toast.success(`Lead moved to ${status}`)
    } catch {
      toast.error("Failed to update lead")
    }
  }

  if (loading) return <CoachLayout><PageSkeleton /></CoachLayout>

  return (
    <CoachLayout>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Users2 className="size-5 text-[#FFB800]" />
            <h1 className="font-heading text-2xl text-white">Leads</h1>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">{leads.length} total leads</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-full border border-zinc-800 p-0.5">
            <button
              onClick={() => setView("list")}
              className={`p-1.5 rounded-full transition-colors ${view === "list" ? "bg-zinc-800 text-white" : "text-zinc-500"}`}
            >
              <List className="size-4" />
            </button>
            <button
              onClick={() => setView("kanban")}
              className={`p-1.5 rounded-full transition-colors ${view === "kanban" ? "bg-zinc-800 text-white" : "text-zinc-500"}`}
            >
              <Columns3 className="size-4" />
            </button>
          </div>
          <button className="rounded-full bg-[#FFB800] p-2 text-white hover:bg-[#B28000] transition-colors">
            <Plus className="size-4" />
          </button>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search leads..."
          className="pl-10"
        />
      </div>

      {view === "list" ? (
        filtered.length > 0 ? (
          <div className="space-y-2">
            {filtered.map((l, i) => (
              <motion.div
                key={l.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium">{l.name}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{l.phone} · {l.email}</p>
                    {l.source && <p className="text-xs text-zinc-600 mt-0.5">Source: {l.source}</p>}
                    <p className="text-xs text-zinc-600 mt-0.5">
                      {format(new Date(l.createdAt), "MMM d, yyyy")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="rounded-full bg-green-600/20 p-2 text-green-400 hover:bg-green-600/30 transition-colors">
                      <Send className="size-3.5" />
                    </button>
                    <select
                      value={l.status}
                      onChange={(e) => handleStatus(l.id, e.target.value as Lead["status"])}
                      className="rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-white outline-none"
                    >
                      {pipelineStages.map((s) => (
                        <option key={s.key} value={s.key} className="bg-zinc-900">{s.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
            <Users2 className="size-10 text-zinc-600 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">
              {search ? "No leads match your search" : "No leads yet"}
            </p>
          </div>
        )
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-none">
          {pipelineStages.map((stage) => {
            const stageLeads = filtered.filter((l) => l.status === stage.key)
            return (
              <div key={stage.key} className="min-w-[260px] snap-start">
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full ${stage.color}`}>
                    {stage.label}
                  </span>
                  <span className="text-xs text-zinc-500">{stageLeads.length}</span>
                </div>
                <div className="space-y-2">
                  {stageLeads.length > 0 ? (
                    stageLeads.map((l) => (
                      <div key={l.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
                        <p className="text-sm text-white font-medium">{l.name}</p>
                        <p className="text-xs text-zinc-500">{l.phone}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => {
                              const stages = pipelineStages.map(s => s.key)
                              const idx = stages.indexOf(l.status)
                              if (idx < stages.length - 1) handleStatus(l.id, stages[idx + 1] as Lead["status"])
                            }}
                            className="rounded-full bg-[#FFB800]/20 px-2 py-0.5 text-[10px] text-[#FFD200] font-medium"
                          >
                            Move → {pipelineStages[Math.min(pipelineStages.indexOf(pipelineStages.find(s => s.key === l.status)!) + 1, pipelineStages.length - 1)].label}
                          </button>
                          <button className="rounded-full bg-green-600/20 p-1.5 text-green-400">
                            <Send className="size-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-zinc-800 p-4 text-center">
                      <p className="text-xs text-zinc-600">No leads</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </CoachLayout>
  )
}
