"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"
import { Search, Users, ChevronRight, Plus } from "lucide-react"
import { format } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import AddClientModal from "@/components/coach/AddClientModal"
import toast from "react-hot-toast"
import { cn } from "@/lib/utils"
import type { Client, ClientWithProfile, Profile } from "@/types"

type FilterTab = "all" | "active" | "paused" | "inactive"

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function statusBadge(status: string): string {
  if (status === "active") return "bg-green-500/15 text-green-400"
  if (status === "paused") return "bg-yellow-500/15 text-yellow-400"
  return "bg-[#222222] text-[#555555]"
}

function CardSkeleton() {
  return (
    <div className="bg-[#161616] border border-[#222222] rounded-2xl p-4 flex items-center gap-3 animate-pulse">
      <div className="w-11 h-11 rounded-full bg-[#222222] flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="w-36 h-4 rounded bg-[#222222]" />
        <div className="w-24 h-3 rounded bg-[#222222]" />
        <div className="w-44 h-3 rounded bg-[#222222]" />
      </div>
    </div>
  )
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
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data: rawRows } = await supabase
      .from("clients")
      .select("*")
      .eq("coach_id", user.id)
      .order("created_at", { ascending: false })

    const clientRows = (rawRows ?? []) as Client[]

    if (!clientRows.length) {
      setClients([])
      setIsLoading(false)
      return
    }

    const userIds = clientRows.map((c) => c.user_id).filter(Boolean) as string[]
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, phone, avatar_url, role, created_at, updated_at")
      .in("id", userIds)

    const typedProfiles = (profiles ?? []) as Profile[]
    const profileMap = new Map(typedProfiles.map((p) => [p.id, p]))

    const enriched: ClientWithProfile[] = clientRows
      .map((c) => ({
        ...c,
        profile: c.user_id ? (profileMap.get(c.user_id) ?? null) : null,
      }))
      .sort((a, b) => {
        const order = { active: 0, paused: 1, inactive: 2 }
        return (order[a.status] ?? 3) - (order[b.status] ?? 3)
      })

    setClients(enriched)
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
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "paused", label: "Paused" },
    { key: "inactive", label: "Inactive" },
  ]

  return (
    <div className="p-4 space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <h1
            className="text-xl font-bold text-white"
            style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
          >
            My Clients
          </h1>
          {!isLoading && (
            <span className="text-xs font-semibold text-black bg-[#C9A84C] px-2 py-0.5 rounded-full">
              {clients.length}
            </span>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 bg-[#1A1A1A] border border-[#333333] rounded-2xl h-12 px-4 focus-within:border-[#C9A84C] transition-colors">
        <Search className="size-4 text-[#555555] flex-shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or goal..."
          className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-[#555555]"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilterTab(t.key)}
            className={cn(
              "flex-shrink-0 px-4 h-8 rounded-xl text-sm font-medium transition-colors",
              filterTab === t.key
                ? "bg-[#C9A84C]/15 text-[#C9A84C]"
                : "text-[#555555] hover:text-white"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Client list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#161616] border border-[#222222] rounded-2xl py-14 flex flex-col items-center gap-4">
          <Users className="size-12 text-[#222222]" />
          <div className="text-center">
            <p className="text-white font-semibold">
              {search || filterTab !== "all" ? "No clients found" : "No clients yet"}
            </p>
            <p className="text-sm text-[#A0A0A0] mt-1">
              {search || filterTab !== "all"
                ? "Try adjusting your search or filter"
                : "Add your first client to get started"}
            </p>
          </div>
          {!search && filterTab === "all" && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setIsModalOpen(true)}
              className="h-12 px-6 rounded-2xl bg-[#C9A84C] text-black font-semibold text-sm flex items-center gap-2"
            >
              <Plus className="size-4" />
              Add Client
            </motion.button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c, i) => {
            const name = c.profile?.name ?? "Unknown"
            const initials = getInitials(name)
            return (
              <motion.button
                key={c.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push(`/coach/clients/${c.id}`)}
                className="w-full bg-[#161616] border border-[#222222] rounded-2xl p-4 flex items-center gap-3 text-left hover:bg-[#1A1A1A] transition-colors"
              >
                <div className="w-11 h-11 rounded-full bg-[#C9A84C] flex items-center justify-center flex-shrink-0">
                  <span className="text-black text-sm font-bold">{initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{name}</p>
                  <p className="text-[#A0A0A0] text-xs mt-0.5 truncate">
                    {c.goal ?? "No goal set"}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[#555555] text-xs">
                      Since {format(new Date(c.start_date), "MMM yyyy")}
                    </span>
                    {c.package_name && (
                      <>
                        <span className="text-[#333333]">·</span>
                        <span className="text-[#555555] text-xs truncate max-w-[100px]">
                          {c.package_name}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <span
                    className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded-full capitalize",
                      statusBadge(c.status)
                    )}
                  >
                    {c.status}
                  </span>
                  <ChevronRight className="size-4 text-[#555555]" />
                </div>
              </motion.button>
            )
          })}
        </div>
      )}

      {/* FAB */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-[#C9A84C] text-black flex items-center justify-center shadow-lg z-40"
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
