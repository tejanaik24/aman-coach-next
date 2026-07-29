"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"
import { Search, Users, ChevronRight, Plus } from "lucide-react"
import { format } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import AddClientModal from "@/components/coach/AddClientModal"
import toast from "react-hot-toast"
import { useStaggerReveal } from "@/hooks/useStaggerReveal"
import type { ClientWithProfile } from "@/types"

type FilterTab = "all" | "active" | "paused" | "inactive"

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
}

function statusBadge(status: string): string {
  if (status === "active") return "bg-accent-orange/15 text-accent-orange border border-accent-orange/30"
  return "bg-[#181310]/5 text-[#8A7F70] border border-[#181310]/10"
}

function CardSkeleton() {
  return <div className="bg-bg-card rounded-2xl h-24 skeleton-pulse" />
}

export default function ClientsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<ClientWithProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterTab, setFilterTab] = useState<FilterTab>("all")
  const [isModalOpen, setIsModalOpen] = useState(false)

  const listRef = useStaggerReveal<HTMLDivElement>([isLoading, search, filterTab])

  const fetchClients = useCallback(async () => {
    setIsLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setIsLoading(false); return }

    const { data, error } = await supabase
      .from("clients")
      .select("*, profile:profiles!user_id(*)")
      .eq("coach_id", user.id)
      .order("created_at", { ascending: false })

    if (error) console.error("fetchClients failed:", error.message)
    setClients((data ?? []) as ClientWithProfile[])
    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const filtered = clients.filter((c) => {
    const name = c.profile?.name ?? ""
    const goal = c.goal ?? ""
    const matchesSearch =
      !search ||
      name.toLowerCase().includes(search.toLowerCase()) ||
      goal.toLowerCase().includes(search.toLowerCase())
    const matchesFilter = filterTab === "all" || c.status === filterTab
    return matchesSearch && matchesFilter
  })

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "active", label: "Active" },
    { key: "paused", label: "Paused" },
    { key: "all", label: "All" },
  ]

  return (
    <div className="relative min-h-full bg-bg-primary">
      <div className="ghost-bg" style={{ backgroundImage: "url(/images/backgrounds/ghost-clients.jpg)" }} />
      <div className="grain-overlay" />
      <div className="relative z-10 px-5 pt-2 flex flex-col gap-5 pb-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <h2 className="font-heading font-bold text-xl text-text-primary tracking-tight">
          Clients Directory
        </h2>
        {!isLoading && (
          <span className="text-[10px] font-bold text-bg-primary bg-accent-orange px-2 py-0.5 rounded-full">
            {clients.length}
          </span>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search clients..."
          className="w-full bg-bg-elevated border border-border-subtle focus:border-accent-orange rounded-full py-3 pl-11 pr-5 text-xs font-semibold text-text-primary placeholder:text-text-muted outline-none transition-colors"
        />
        <Search className="w-4 h-4 text-text-muted absolute left-4 top-1/2 -translate-y-1/2 stroke-[2.5]" />
      </div>

      {/* Status filter chips */}
      <div className="flex gap-2 select-none">
        {tabs.map((t) => {
          const isSelected = filterTab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setFilterTab(t.key)}
              className={`px-4.5 py-2.5 rounded-full text-xs font-bold font-heading uppercase tracking-wide transition-colors cursor-pointer ${
                isSelected ? "bg-accent-orange text-bg-primary" : "bg-bg-elevated text-text-muted border border-border-subtle"
              }`}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Client list */}
      {isLoading ? (
        <div className="flex flex-col gap-3.5">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="rounded-2xl py-14 flex flex-col items-center gap-4"
          style={{ background: "#F3EDE2", boxShadow: "0 24px 50px -20px rgba(0,0,0,0.5)" }}
        >
          <Users className="size-12 text-[#181310]/25" />
          <div className="text-center">
            <p className="text-[#181310] font-heading font-bold">
              {search || filterTab !== "all" ? "No clients found" : "No clients yet"}
            </p>
            <p className="text-sm text-[#8A7F70] mt-1">
              {search || filterTab !== "all" ? "Try adjusting your search or filter" : "Add your first client to get started"}
            </p>
          </div>
          {!search && filterTab === "all" && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setIsModalOpen(true)}
              className="h-12 px-6 rounded-full bg-accent-orange text-bg-primary font-heading font-bold text-xs uppercase tracking-widest flex items-center gap-2 cursor-pointer"
            >
              <Plus className="size-4" />
              Add Client
            </motion.button>
          )}
        </div>
      ) : (
        <div
          ref={listRef}
          className="rounded-2xl overflow-hidden divide-y divide-[#181310]/[0.08] mb-20"
          style={{ background: "#F3EDE2", boxShadow: "0 24px 50px -20px rgba(0,0,0,0.5)" }}
        >
          {filtered.map((c) => {
            const name = c.profile?.name ?? "Unknown"
            const initials = getInitials(name)
            const avatarUrl = c.profile?.avatar_url ?? null
            return (
              <motion.div
                key={c.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push(`/clients/${c.id}`)}
                className="reveal-item p-4 flex items-center justify-between cursor-pointer hover:bg-black/[0.02] transition-colors duration-300"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={name} className="w-12 h-12 rounded-full object-cover border border-accent-orange flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[#181310]/5 flex items-center justify-center border border-accent-orange flex-shrink-0">
                      <span className="text-accent-orange text-xs font-heading font-bold">{initials}</span>
                    </div>
                  )}
                  <div className="flex flex-col min-w-0">
                    <h4 className="font-heading font-bold text-xs text-[#181310] leading-tight truncate">{name}</h4>
                    <span className="text-[9px] text-[#8A7F70] font-bold mt-0.5 truncate">
                      {c.package_name ?? "No package"} · {c.goal ?? "No goal set"}
                    </span>
                    <span className="text-[9px] text-[#8A7F70] font-medium mt-1">
                      Since {format(new Date(c.start_date), "MMM yyyy")}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <span className={`text-[8px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${statusBadge(c.status)}`}>
                    {c.status}
                  </span>
                  <ChevronRight className="w-4 h-4 text-[#8A7F70]" />
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* FAB */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-24 right-5 w-14 h-14 rounded-full bg-accent-orange text-bg-primary flex items-center justify-center shadow-[0_0_24px_rgba(255, 106, 26,0.35)] cursor-pointer z-40"
        aria-label="Add client"
      >
        <Plus className="size-6" />
      </motion.button>

      <AddClientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          toast.success("Client added successfully!")
          setIsModalOpen(false)
          fetchClients()
        }}
      />
      </div>
    </div>
  )
}
