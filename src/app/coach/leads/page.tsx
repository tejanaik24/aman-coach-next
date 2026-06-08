"use client"

import { CoachLayout } from "@/components/layout/CoachLayout"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { PageSkeleton } from "@/components/ui/skeleton"
import { useCoachData } from "@/hooks/useCoach"
import { updateLeadStatus } from "@/lib/firestore"
import { Lead } from "@/types"
import { useState } from "react"
import toast from "react-hot-toast"

export default function CoachLeadsPage() {
  const { leads, loading } = useCoachData()
  const [search, setSearch] = useState("")

  const filtered = leads.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.email.toLowerCase().includes(search.toLowerCase()) ||
      l.phone.includes(search)
  )

  const handleStatus = async (id: string, status: Lead["status"]) => {
    try {
      await updateLeadStatus(id, status)
      toast.success(`Lead marked as ${status}`)
    } catch {
      toast.error("Failed to update lead")
    }
  }

  if (loading) return <CoachLayout><PageSkeleton /></CoachLayout>

  return (
    <CoachLayout>
      <h1 className="font-heading text-3xl text-white mb-2">LEADS</h1>
      <p className="text-sm text-white/40 mb-4">{leads.length} total leads</p>

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search leads..."
        className="mb-4"
      />

      {filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((l) => (
            <Card key={l.id}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-white">{l.name}</p>
                  <p className="text-xs text-white/30">{l.email} &middot; {l.phone}</p>
                  {l.goal && <p className="text-xs text-white/30 mt-0.5">Goal: {l.goal}</p>}
                  {l.notes && <p className="text-xs text-white/20 mt-0.5">{l.notes}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      l.status === "new"
                        ? "info"
                        : l.status === "contacted"
                          ? "warning"
                          : l.status === "converted"
                            ? "success"
                            : l.status === "lost"
                              ? "danger"
                              : "outline"
                    }
                  >
                    {l.status}
                  </Badge>
                  <select
                    value={l.status}
                    onChange={(e) =>
                      handleStatus(l.id, e.target.value as Lead["status"])
                    }
                    className="rounded border border-white/10 bg-black px-2 py-1 text-xs text-white outline-none"
                  >
                    <option value="new" className="bg-black">New</option>
                    <option value="contacted" className="bg-black">Contacted</option>
                    <option value="qualified" className="bg-black">Qualified</option>
                    <option value="converted" className="bg-black">Converted</option>
                    <option value="lost" className="bg-black">Lost</option>
                  </select>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent>
            <p className="text-sm text-white/40 text-center py-8">
              {search ? "No leads match your search" : "No leads yet"}
            </p>
          </CardContent>
        </Card>
      )}
    </CoachLayout>
  )
}
