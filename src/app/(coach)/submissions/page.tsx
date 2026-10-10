"use client"

import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/hooks/useAuth"
import { getAllSubmissions } from "@/lib/store"
import { createClient } from "@/lib/supabase/client"
import { motion, AnimatePresence } from "motion/react"
import {
  FileText, Search, Clock, ChevronRight, X, CheckCircle2, Trash2
} from "lucide-react"
import toast from "react-hot-toast"
import { SignedImage } from "@/components/shared/SignedImage"
import { isPhotoPathValue } from "@/components/forms/ConversationalFormComponents"
import { openUrl } from "@/lib/utils"
import Link from "next/link"

type Submission = {
  id: string
  clientId: string
  clientName: string
  formType: "standard_joining" | "antenatal_joining" | "checkin" | "enquiry"
  status: string
  submittedAt: string
  formData: Record<string, unknown>
}

// "q6_dob" / "t3_workout_deviation" -> "dob" / "workout deviation" (labels are uppercased by CSS)
function fieldLabel(key: string): string {
  return key.replace(/^[a-z]\d+_/, "").replace(/_/g, " ")
}

export default function CoachSubmissionsPage() {
  const { user } = useAuth()
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedFormType, setSelectedFormType] = useState<string>("all")
  const [activeSubmission, setActiveSubmission] = useState<Submission | null>(null)
  // "Attach to a client": a joining form someone filled from the public link has no client yet.
  const [clientOptions, setClientOptions] = useState<{ id: string; user_id: string; name: string }[]>([])
  const [attachTo, setAttachTo] = useState("")
  const [attaching, setAttaching] = useState(false)

  useEffect(() => {
    if (!user?.id) return
    setLoading(true)
    getAllSubmissions(user.id).then(res => {
      setSubmissions(res)
      setLoading(false)
      // /submissions?open=<id> (from a client profile) opens that form straight away
      const openId = new URLSearchParams(window.location.search).get("open")
      const hit = openId ? res.find((s) => s.id === openId) : null
      if (hit) setActiveSubmission(hit)
    }).catch(() => setLoading(false))
  }, [user?.id])

  const filteredSubmissions = useMemo(() => {
    return submissions.filter(sub => {
      const matchesSearch = sub.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            sub.formType.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesType = selectedFormType === "all" || sub.formType === selectedFormType
      return matchesSearch && matchesType
    })
  }, [submissions, searchTerm, selectedFormType])

  const isJoining = (t: string) => t === "standard_joining" || t === "antenatal_joining"

  useEffect(() => { setAttachTo("") }, [activeSubmission?.id])

  useEffect(() => {
    if (!activeSubmission || clientOptions.length) return
    if (!isJoining(activeSubmission.formType) || activeSubmission.clientId) return
    const supabase = createClient()
    ;(async () => {
      const { data: cs } = await supabase.from("clients").select("id, user_id").order("created_at", { ascending: false })
      const rows = (cs ?? []) as { id: string; user_id: string }[]
      const { data: ps } = await supabase.from("profiles").select("id, name").in("id", rows.map((c) => c.user_id))
      const names = new Map(((ps ?? []) as { id: string; name: string }[]).map((p) => [p.id, p.name]))
      setClientOptions(rows.map((c) => ({ id: c.id, user_id: c.user_id, name: names.get(c.user_id) || "Client" })))
    })()
  }, [activeSubmission, clientOptions.length])

  async function handleAttach(sub: Submission) {
    const c = clientOptions.find((x) => x.id === attachTo)
    if (!c || attaching) return
    setAttaching(true)
    const supabase = createClient()
    const { error } = await supabase.from("form_submissions").update({ client_id: c.id, user_id: c.user_id }).eq("id", sub.id)
    setAttaching(false)
    if (error) { toast.error("Could not attach. Try again."); return }
    const next = { ...sub, clientId: c.id, clientName: c.name }
    setSubmissions((prev) => prev.map((s) => (s.id === sub.id ? next : s)))
    setActiveSubmission(next)
    toast.success(`Attached to ${c.name}`)
  }

  async function handleMarkContacted(sub: Submission) {
    const supabase = createClient()
    const { error } = await supabase.from("form_submissions").update({ status: "contacted" }).eq("id", sub.id)
    if (error) {
      toast.error("Failed to update lead")
      return
    }
    setSubmissions(prev => prev.map(s => s.id === sub.id ? { ...s, status: "contacted" } : s))
    setActiveSubmission(prev => prev && prev.id === sub.id ? { ...prev, status: "contacted" } : prev)
    toast.success("Marked as contacted")
  }

  async function handleDeleteSubmission(sub: Submission) {
    if (!window.confirm(`Are you sure you want to delete this submission for ${sub.clientName}? Any uploaded photos and private medical files will be permanently removed.`)) {
      return
    }
    try {
      const res = await fetch(`/api/coach/submissions/${sub.id}`, { method: "DELETE" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || "Could not delete submission")
        return
      }
      toast.success("Submission deleted")
      setSubmissions((prev) => prev.filter((s) => s.id !== sub.id))
      if (activeSubmission?.id === sub.id) {
        setActiveSubmission(null)
      }
    } catch {
      toast.error("Could not delete submission")
    }
  }

  const getFormLabel = (type: string) => {
    switch (type) {
      case "standard_joining": return "Standard Joining Questionnaire"
      case "antenatal_joining": return "AN-PN Questionnaire"
      case "checkin": return "Check-in Form"
      case "enquiry": return "New Enquiry"
      default: return type
    }
  }

  const getFormBadge = (type: string) => {
    switch (type) {
      case "standard_joining": return "bg-accent-orange/15 text-accent-orange border-accent-orange/30"
      case "antenatal_joining": return "bg-pink-500/15 text-pink-400 border-pink-500/30"
      case "checkin": return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
      case "enquiry": return "bg-violet-500/15 text-violet-400 border-violet-500/30"
      default: return "bg-bg-elevated text-text-muted"
    }
  }

  const filterTabs = [
    { key: "all", label: "All Types" },
    { key: "enquiry", label: "Leads" },
    { key: "standard_joining", label: "Standard" },
    { key: "antenatal_joining", label: "AN-PN" },
    { key: "checkin", label: "Check-in" },
  ]

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary p-4 md:p-6 pb-28">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-subtle pb-5">
          <div>
            <p className="text-accent-orange text-xs font-bold uppercase tracking-widest">Coach Dashboard</p>
            <h1 className="font-heading text-3xl text-text-primary tracking-wide">CLIENT SUBMISSIONS</h1>
            <p className="text-xs text-text-muted mt-1">
              View and review new leads, onboarding questionnaires, and check-in forms.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1.5 rounded-full bg-bg-elevated border border-border-subtle text-xs text-text-muted font-medium">
              Total: <strong className="text-accent-orange">{submissions.length}</strong>
            </span>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 size-4 text-text-muted" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by client name..."
              className="w-full rounded-xl bg-bg-card border border-border-subtle pl-10 pr-4 py-2.5 text-xs text-text-primary placeholder-text-muted outline-none focus:border-accent-orange transition-colors"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {filterTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setSelectedFormType(tab.key)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedFormType === tab.key
                    ? "bg-accent-orange text-bg-primary"
                    : "bg-bg-card border border-border-subtle text-text-muted hover:text-text-primary"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Submissions List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="size-8 rounded-full border-2 border-accent-orange border-t-transparent animate-spin" />
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="rounded-2xl border border-[#181310]/[0.08] bg-[#F3EDE2] p-12 text-center text-[#8A7F70] space-y-3">
            <FileText className="size-10 mx-auto text-[#8A7F70]/40" />
            <p className="text-sm font-semibold text-[#181310]">No submissions found</p>
            <p className="text-xs text-[#8A7F70]">Submissions will appear here once clients complete their forms.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSubmissions.map(sub => (
              <motion.div
                key={sub.id}
                whileHover={{ y: -2 }}
                onClick={() => setActiveSubmission(sub)}
                className="rounded-2xl border border-[#181310]/[0.08] bg-[#F3EDE2] p-5 space-y-4 cursor-pointer hover:border-accent-orange/50 transition-all shadow-lg"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="size-9 rounded-full bg-accent-orange/10 border border-accent-orange/30 flex items-center justify-center font-heading font-bold text-sm text-accent-orange">
                      {sub.clientName.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[#181310]">{sub.clientName}</h3>
                      <p className="text-[11px] text-[#8A7F70] flex items-center gap-1 mt-0.5">
                        <Clock className="size-3" />
                        {new Date(sub.submittedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteSubmission(sub)
                    }}
                    className="p-1.5 rounded-lg text-[#8A7F70] hover:text-red-500 hover:bg-red-500/10 transition-colors"
                    title="Delete submission"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#181310]/[0.08]">
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${getFormBadge(sub.formType)}`}>
                      {getFormLabel(sub.formType)}
                    </span>
                    {sub.formType === "enquiry" && (
                      sub.status === "contacted" ? (
                        <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-0.5"><CheckCircle2 className="size-3" /> Contacted</span>
                      ) : (
                        <span className="text-[10px] font-bold text-violet-400">New</span>
                      )
                    )}
                  </div>
                  <span className="text-xs font-bold text-accent-orange flex items-center gap-1">
                    View <ChevronRight className="size-4" />
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Submission Detail Modal */}
        <AnimatePresence>
          {activeSubmission && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="w-full max-w-3xl max-h-[90vh] rounded-2xl border border-[#181310]/[0.08] bg-[#F3EDE2] flex flex-col overflow-hidden shadow-2xl"
              >
                {/* Modal Header */}
                <div className="p-5 border-b border-[#181310]/[0.08] flex items-center justify-between bg-[#181310]/5">
                  <div>
                    <span className={`px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${getFormBadge(activeSubmission.formType)}`}>
                      {getFormLabel(activeSubmission.formType)}
                    </span>
                    <h2 className="font-heading text-xl text-[#181310] mt-1.5">{activeSubmission.clientName}</h2>
                    <p className="text-xs text-[#8A7F70]">
                      Submitted on {new Date(activeSubmission.submittedAt).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveSubmission(null)}
                    className="size-9 rounded-full bg-[#F3EDE2] border border-[#181310]/[0.08] flex items-center justify-center text-[#8A7F70] hover:text-[#181310] transition-colors"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                {/* Modal Content */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
                  {Object.entries(activeSubmission.formData).map(([key, value]) => {
                    if (!value || (Array.isArray(value) && value.length === 0)) return null

                    if (typeof value === "string" && value.startsWith("data:image")) {
                      return (
                        <div key={key} className="space-y-2">
                          <p className="text-xs font-bold text-accent-orange uppercase tracking-wider">{fieldLabel(key)}</p>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={value} alt={key} className="max-h-60 rounded-xl border border-[#181310]/[0.08] object-contain bg-[#181310]/5" />
                        </div>
                      )
                    }

                    if (typeof value === "string" && isPhotoPathValue(value)) {
                      return (
                        <div key={key} className="space-y-2">
                          <p className="text-xs font-bold text-accent-orange uppercase tracking-wider">{fieldLabel(key)}</p>
                          <SignedImage path={value} alt={key} className="max-h-60 rounded-xl border border-[#181310]/[0.08] object-contain bg-[#181310]/5" />
                        </div>
                      )
                    }

                    if (Array.isArray(value) && value.some(v => typeof v === "string" && (v.startsWith("data:") || isPhotoPathValue(v) || /^[^/]+\/[^/]+\.pdf$/i.test(v)))) {
                      return (
                        <div key={key} className="space-y-2">
                          <p className="text-xs font-bold text-accent-orange uppercase tracking-wider">{fieldLabel(key)} ({value.length} files)</p>
                          <div className="flex flex-wrap gap-2">
                            {value.map((f, i) => (
                              f.startsWith("data:image") ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img key={i} src={f} alt={`File ${i}`} className="size-24 rounded-lg object-cover border border-[#181310]/[0.08]" />
                              ) : isPhotoPathValue(f) ? (
                                <SignedImage key={i} path={f} alt={`File ${i}`} className="size-24 rounded-lg object-cover border border-[#181310]/[0.08]" />
                              ) : (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={async () => {
                                    const res = await fetch(`/api/checkin/photo-url?path=${encodeURIComponent(f)}`)
                                    const d = await res.json().catch(() => ({}))
                                    if (d.url) openUrl(d.url)
                                  }}
                                  className="p-3 rounded-lg border border-[#181310]/[0.08] bg-[#181310]/5 text-xs text-accent-orange flex items-center gap-2 cursor-pointer"
                                >
                                  <FileText className="size-4" /> Open document #{i + 1}
                                </button>
                              )
                            ))}
                          </div>
                        </div>
                      )
                    }

                    if (typeof value === "object" && !Array.isArray(value)) {
                      return (
                        <div key={key} className="p-4 rounded-xl border border-[#181310]/[0.08] bg-[#181310]/5 space-y-3">
                          <h4 className="font-bold text-xs uppercase tracking-wider text-accent-orange">{fieldLabel(key)}</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            {Object.entries(value as Record<string, unknown>).map(([subK, subV]) => (
                              subV ? (
                                <div key={subK} className="space-y-1">
                                  <span className="text-[#8A7F70] uppercase text-[10px] font-semibold block">{fieldLabel(subK)}</span>
                                  <span className="text-[#181310] font-medium block">{String(subV)}</span>
                                </div>
                              ) : null
                            ))}
                          </div>
                        </div>
                      )
                    }

                    return (
                      <div key={key} className="border-b border-[#181310]/[0.08] pb-2">
                        <span className="text-[11px] font-bold text-accent-orange uppercase tracking-wider block">{fieldLabel(key)}</span>
                        <p className="text-xs text-[#181310] mt-1 whitespace-pre-wrap">{String(value)}</p>
                      </div>
                    )
                  })}
                </div>

                {isJoining(activeSubmission.formType) && (
                  <div className="px-4 py-3 border-t border-[#181310]/[0.08] bg-[#F3EDE2]">
                    {activeSubmission.clientId ? (
                      <p className="text-sm text-[#181310]">
                        Saved on client profile:{" "}
                        <Link href={`/clients/${activeSubmission.clientId}`} className="font-bold text-accent-orange underline">{activeSubmission.clientName}</Link>
                      </p>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-[#8A7F70]">Not on any client yet</p>
                        <div className="flex gap-2">
                          <select
                            value={attachTo}
                            onChange={(e) => setAttachTo(e.target.value)}
                            className="flex-1 min-w-0 h-11 rounded-xl bg-white border border-[#181310]/15 px-3 text-sm text-[#181310]"
                          >
                            <option value="">Attach to a client…</option>
                            {clientOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                          <button
                            onClick={() => handleAttach(activeSubmission)}
                            disabled={!attachTo || attaching}
                            className="px-5 h-11 rounded-xl bg-accent-orange text-sm font-bold text-bg-primary disabled:opacity-50"
                          >
                            {attaching ? "Attaching…" : "Attach"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Modal Footer */}
                <div className="p-4 border-t border-[#181310]/[0.08] bg-[#181310]/5 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => handleDeleteSubmission(activeSubmission)}
                    className="px-4 py-2.5 rounded-full bg-red-600/15 text-xs font-bold uppercase tracking-wider text-red-600 hover:bg-red-600/25 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="size-4" /> Delete Submission
                  </button>
                  <div className="flex items-center gap-2">
                    {activeSubmission.formType === "enquiry" && activeSubmission.status !== "contacted" && (
                      <button
                        onClick={() => handleMarkContacted(activeSubmission)}
                        className="px-6 py-2.5 rounded-full bg-emerald-500 text-xs font-bold uppercase tracking-wider text-white hover:bg-emerald-600 transition-all flex items-center gap-2"
                      >
                        <CheckCircle2 className="size-4" /> Mark Contacted
                      </button>
                    )}
                    <button
                      onClick={() => setActiveSubmission(null)}
                      className="px-6 py-2.5 rounded-full bg-accent-orange text-xs font-bold uppercase tracking-wider text-bg-primary hover:bg-accent-orange/90 transition-all cursor-pointer"
                    >
                      Close Review
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
