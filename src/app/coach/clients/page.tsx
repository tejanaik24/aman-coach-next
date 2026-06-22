"use client"

import { useRouter } from "next/navigation"
import { CoachLayout } from "@/components/layout/CoachLayout"
import { Input } from "@/components/ui/input"
import { ClientCard } from "@/components/ui/ClientCard"
import { PageSkeleton } from "@/components/ui/skeleton"
import { useCoachData } from "@/hooks/useCoach"
import { useState } from "react"
import { Plus, Search, Users } from "lucide-react"
import Link from "next/link"

export default function CoachClientsPage() {
  const { clients, loading } = useCoachData()
  const [search, setSearch] = useState("")
  const router = useRouter()

  const filtered = clients.filter(
    (c) =>
      c.displayName.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <CoachLayout><PageSkeleton /></CoachLayout>

  return (
    <CoachLayout>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="size-5 text-[#FFB800]" />
            <h1 className="font-heading text-2xl text-white">Clients</h1>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">{clients.length} total clients</p>
        </div>
        <Link
          href="/coach/clients/new"
          className="rounded-full bg-[#FFB800] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#B28000] transition-colors flex items-center gap-1.5"
        >
          <Plus className="size-3.5" />
          Add
        </Link>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search clients..."
          className="pl-10"
        />
      </div>

      {filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((c) => (
            <ClientCard
              key={c.uid}
              name={c.displayName}
              email={c.email}
              plan={c.plan}
              status={c.status}
              onClick={() => router.push(`/coach/clients/${c.uid}`)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <Users className="size-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">
            {search ? "No clients match your search" : "No clients yet"}
          </p>
        </div>
      )}
    </CoachLayout>
  )
}
