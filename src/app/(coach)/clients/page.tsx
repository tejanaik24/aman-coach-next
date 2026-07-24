"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"
import { Search, Users, ChevronRight, Plus } from "lucide-react"
import { format } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import AddClientModal from "@/components/coach/AddClientModal"
import toast from "react-hot-toast"
import type { ClientWithProfile } from "@/types"

type FilterTab = "all" | "active" | "paused" | "inactive"

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
}

function statusBadge(status: string): string {
  if (status === "active") return "bg-lime-tint text-charcoal-deep border border-lime-electric/30"
  return "bg-neutral-200 text-charcoal-deep"
}

function CardSkeleton() {
  return <div className="bg-white rounded-card-mobile shadow-bento h-24 animate-pulse" />
}

export default function ClientsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<ClientWithProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterTab, setFilterTab] = useState<FilterTab>("all")
  const [isModalOpen, setIsModalOpen] = useState(false)

  const fetchClients = useCallback(async () => {
    setIsLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setIsLoading(false); return }

    const { data } = await supabase
      .from("clients")
      .select("*, profile:profiles(*)")
      .eq("coach_id", user.id)
      .order("created_at", { ascending: false })

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
    <div className="px-5 pt-2 flex flex-col gap-5 bg-cream min-h-full pb-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <h2 className="font-montserrat font-black text-xl text-charcoal-deep uppercase tracking-tight">
          Clients Directory
        </h2>
        {!isLoading && (
          <span className="text-[10px] font-bold text-charcoal-deep bg-lime-electric px-2 py-0.5 rounded-full">
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
          className="w-full bg-cream focus:bg-white border-2 border-transparent focus:border-lime-electric rounded-full py-3 pl-11 pr-5 text-xs font-semibold shadow-inner outline-none transition-all"
        />
        <Search className="w-4 h-4 text-charcoal-muted absolute left-4 top-1/2 -translate-y-1/2 stroke-[2.5]" />
      </div>

      {/* Status filter chips */}
      <div className="flex gap-2 select-none">
        {tabs.map((t) => {
          const isSelected = filterTab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setFilterTab(t.key)}
              className={`px-4.5 py-2.5 rounded-full text-xs font-bold font-montserrat uppercase tracking-wide transition-all ${
                isSelected ? "bg-charcoal-deep text-lime-electric shadow-sm" : "bg-white text-charcoal-deep border border-charcoal-deep/5 shadow-sm"
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
        <div className="bg-white rounded-card-mobile shadow-bento py-14 flex flex-col items-center gap-4">
          <Users className="size-12 text-charcoal-muted/30" />
          <div className="text-center">
            <p className="text-charcoal-deep font-montserrat font-bold">
              {search || filterTab !== "all" ? "No clients found" : "No clients yet"}
            </p>
            <p className="text-sm text-charcoal-muted mt-1">
              {search || filterTab !== "all" ? "Try adjusting your search or filter" : "Add your first client to get started"}
            </p>
          </div>
          {!search && filterTab === "all" && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setIsModalOpen(true)}
              className="h-12 px-6 rounded-full bg-lime-electric text-charcoal-deep font-montserrat font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-bento"
            >
              <Plus className="size-4" />
              Add Client
            </motion.button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3.5 pb-20">
          {filtered.map((c) => {
            const name = c.profile?.name ?? "Unknown"
            const initials = getInitials(name)
            const avatarUrl = c.profile?.avatar_url ?? null
            return (
              <motion.div
                key={c.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push(`/clients/${c.id}`)}
                className="bg-white rounded-card-mobile p-4 shadow-bento flex items-center justify-between cursor-pointer border border-transparent hover:border-lime-electric/25 transition-all duration-300"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={name} className="w-12 h-12 rounded-full object-cover border border-lime-electric shadow-sm flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-charcoal-deep flex items-center justify-center border border-lime-electric shadow-sm flex-shrink-0">
                      <span className="text-lime-electric text-xs font-montserrat font-bold">{initials}</span>
                    </div>
                  )}
                  <div className="flex flex-col min-w-0">
                    <h4 className="font-montserrat font-bold text-xs text-charcoal-deep leading-tight truncate">{name}</h4>
                    <span className="text-[9px] text-charcoal-muted font-bold mt-0.5 truncate">
                      {c.package_name ?? "No package"} · {c.goal ?? "No goal set"}
                    </span>
                    <span className="text-[9px] text-charcoal-muted font-medium mt-1">
                      Since {format(new Date(c.start_date), "MMM yyyy")}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <span className={`text-[8px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${statusBadge(c.status)}`}>
                    {c.status}
                  </span>
                  <ChevronRight className="w-4 h-4 text-charcoal-muted" />
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
        className="fixed bottom-24 right-5 w-14 h-14 rounded-full bg-lime-electric text-charcoal-deep flex items-center justify-center shadow-lg border border-white/20 z-40"
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
  )
}
