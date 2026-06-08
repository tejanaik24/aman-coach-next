"use client"

import { useRouter } from "next/navigation"
import { CoachLayout } from "@/components/layout/CoachLayout"
import { Card, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { PageSkeleton } from "@/components/ui/skeleton"
import { useCoachData } from "@/hooks/useCoach"
import { useState } from "react"

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
      <h1 className="font-heading text-3xl text-white mb-2">CLIENTS</h1>
      <p className="text-sm text-white/40 mb-4">{clients.length} total clients</p>

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search clients..."
        className="mb-4"
      />

      {filtered.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <button
              key={c.uid}
              onClick={() => router.push(`/coach/clients/${c.uid}`)}
              className="text-left"
            >
              <Card className="transition-colors hover:border-gold/30 cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-base">{c.displayName}</CardTitle>
                  <Badge
                    variant={
                      c.status === "active"
                        ? "success"
                        : c.status === "paused"
                          ? "warning"
                          : "outline"
                    }
                  >
                    {c.status}
                  </Badge>
                </div>
                <CardContent className="p-0">
                  <p className="text-xs text-white/40 truncate">{c.email}</p>
                  <div className="flex gap-3 mt-2 text-xs text-white/30">
                    {c.goal && <span>Goal: {c.goal}</span>}
                    {c.plan && <span>Plan: {c.plan}</span>}
                  </div>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent>
            <p className="text-sm text-white/40 text-center py-8">
              {search ? "No clients match your search" : "No clients yet"}
            </p>
          </CardContent>
        </Card>
      )}
    </CoachLayout>
  )
}
