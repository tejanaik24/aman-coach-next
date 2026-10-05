"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Search, Users, Plus, Link as LinkIcon, Send, MessageCircle, CalendarPlus } from "lucide-react"
import { format, differenceInCalendarDays } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import AddClientModal from "@/components/coach/AddClientModal"
import AddFollowupSheet from "@/components/coach/AddFollowupSheet"
import toast from "react-hot-toast"
import { waLink } from "@/lib/quick-manage"
import type { ClientWithProfile } from "@/types"

type FilterTab = "active" | "ending" | "late" | "all"

const ENDING_SOON_DAYS = 14

function CardSkeleton() {
  return <div className="rounded-2xl h-32 animate-pulse bg-white/10" />
}

export default function ClientsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<ClientWithProfile[]>([])
  const [lateIds, setLateIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterTab, setFilterTab] = useState<FilterTab>("active")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [followupFor, setFollowupFor] = useState<{ id: string; name: string } | null>(null)

  const fetchClients = useCallback(async () => {
    setIsLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setIsLoading(false); return }

    const today = format(new Date(), "yyyy-MM-dd")
    const [clientsRes, feesRes] = await Promise.all([
      supabase
        .from("clients")
        .select("id, status, package_name, start_date, end_date, profile:profiles!user_id(name, phone, avatar_url)")
        .eq("coach_id", user.id)
        .order("created_at", { ascending: false }),
      supabase.from("fees").select("client_id").in("status", ["pending", "overdue"]).lt("due_date", today),
    ])

    if (clientsRes.error) console.error("fetchClients failed:", clientsRes.error.message)
    setClients((clientsRes.data ?? []) as unknown as ClientWithProfile[])
    setLateIds(new Set((feesRes.data ?? []).map((f: { client_id: string }) => f.client_id)))
    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const endsInDays = (c: ClientWithProfile) =>
    c.end_date ? differenceInCalendarDays(new Date(c.end_date + "T00:00:00"), new Date()) : null

  const filtered = useMemo(
    () =>
      clients.filter((c) => {
        const q = search.trim().toLowerCase()
        const matchesSearch =
          !q || (c.profile?.name ?? "").toLowerCase().includes(q) || (c.package_name ?? "").toLowerCase().includes(q)
        const d = endsInDays(c)
        const matchesFilter =
          filterTab === "all" ||
          (filterTab === "active" && c.status === "active") ||
          (filterTab === "ending" && c.status === "active" && d !== null && d <= ENDING_SOON_DAYS) ||
          (filterTab === "late" && lateIds.has(c.id))
        return matchesSearch && matchesFilter
      }),
    [clients, search, filterTab, lateIds]
  )

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "active", label: "Active" },
    { key: "ending", label: "Ending soon" },
    { key: "late", label: "Payment late" },
    { key: "all", label: "All" },
  ]

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="px-5 pt-8 pb-32 max-w-lg mx-auto flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <h1 className="font-heading italic text-4xl">Clients</h1>
          {!isLoading && (
            <span className="text-sm font-bold text-black bg-accent-orange px-2.5 py-0.5 rounded-full">{clients.length}</span>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or plan"
            className="w-full h-14 bg-bg-elevated border border-border-subtle focus:border-accent-orange rounded-full pl-12 pr-5 text-base text-white placeholder:text-text-muted outline-none transition-colors"
          />
          <Search className="w-5 h-5 text-text-muted absolute left-4 top-1/2 -translate-y-1/2" />
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-1 px-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilterTab(t.key)}
              className={`h-11 px-4 rounded-full text-base font-semibold whitespace-nowrap cursor-pointer ${
                filterTab === t.key ? "bg-accent-orange text-black" : "bg-white/10 text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Client list */}
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl bg-white/5 py-14 flex flex-col items-center gap-3 text-center px-4">
            <Users className="size-12 text-white/25" />
            <p className="text-lg font-semibold">{search || filterTab !== "all" ? "No clients here" : "No clients yet"}</p>
            <p className="text-text-muted text-base">
              {search || filterTab !== "all" ? "Try another filter" : "Tap Add client to start"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((c) => {
              const name = c.profile?.name ?? "Unknown"
              const d = endsInDays(c)
              const wa = waLink(c.profile?.phone ?? null, `Hi ${name.split(" ")[0]}, this is Aman. `)
              const late = lateIds.has(c.id)
              return (
                <div key={c.id} className="rounded-2xl bg-bg-card border border-border-subtle p-4">
                  <button
                    type="button"
                    onClick={() => router.push(`/clients/${c.id}`)}
                    className="text-left w-full cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-lg font-semibold leading-tight">{name}</p>
                      {late && (
                        <span className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full bg-red-500/20 text-red-300">Payment late</span>
                      )}
                    </div>
                    <p className="text-text-muted text-base mt-1">{c.package_name ?? "No package"}</p>
                    {c.end_date && (
                      <p className={`text-base mt-1 ${d !== null && d <= ENDING_SOON_DAYS ? "text-accent-orange font-semibold" : "text-text-muted"}`}>
                        Ends {format(new Date(c.end_date + "T00:00:00"), "d MMM yyyy")}
                        {d !== null && d <= ENDING_SOON_DAYS ? (d < 0 ? ` (ended ${-d} days ago)` : d === 0 ? " (today)" : ` (in ${d} days)`) : ""}
                      </p>
                    )}
                  </button>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    {wa ? (
                      <a
                        href={wa}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-12 rounded-xl bg-[#25D366] text-black font-bold text-base flex items-center justify-center gap-2"
                      >
                        <MessageCircle className="w-5 h-5" /> WhatsApp
                      </a>
                    ) : (
                      <span className="h-12 rounded-xl bg-white/5 text-text-muted text-sm flex items-center justify-center">No number</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setFollowupFor({ id: c.id, name })}
                      className="h-12 rounded-xl bg-white/10 text-white font-bold text-base flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <CalendarPlus className="w-5 h-5" /> Follow-up
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Lead questionnaire link — kept, moved to the bottom */}
        <div className="rounded-2xl p-4 flex items-center justify-between gap-3 bg-[#F3EDE2] text-[#181310]">
          <div className="min-w-0">
            <p className="text-sm font-bold">Questionnaire for new leads</p>
            <p className="text-sm text-[#8A7F70] mt-0.5">Send before payment, before they are a client</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => {
                navigator.clipboard.writeText("https://amankhuranafitness.com/questionnaire")
                toast.success("Link copied")
              }}
              className="size-12 rounded-full bg-[#181310]/10 flex items-center justify-center cursor-pointer"
              aria-label="Copy link"
            >
              <LinkIcon className="size-5" />
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent("Please fill this quick lifestyle & health questionnaire before we begin: https://amankhuranafitness.com/questionnaire")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="size-12 rounded-full bg-accent-orange flex items-center justify-center text-black"
              aria-label="Share on WhatsApp"
            >
              <Send className="size-5" />
            </a>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          aria-label="Add client"
          className="fixed right-5 bottom-28 z-40 h-14 px-5 rounded-full bg-accent-orange text-black font-bold text-base flex items-center gap-2 shadow-[0_8px_30px_rgba(255,106,26,0.35)] cursor-pointer"
        >
          <Plus className="w-5 h-5" /> Add client
        </button>
      </div>

      <AddClientModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={fetchClients} />
      {followupFor && (
        <AddFollowupSheet
          isOpen
          onClose={() => setFollowupFor(null)}
          clientId={followupFor.id}
          clientName={followupFor.name}
        />
      )}
    </div>
  )
}
