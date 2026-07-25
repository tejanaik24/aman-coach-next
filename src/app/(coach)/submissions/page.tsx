"use client"

import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/hooks/useAuth"
import { getAllSubmissions } from "@/lib/store"
import { motion, AnimatePresence } from "motion/react"
import {
  FileText, Search, Clock, ChevronRight, X
} from "lucide-react"

type Submission = {
  id: string
  clientId: string
  clientName: string
  formType: "standard_joining" | "antenatal_joining" | "checkin"
  status: string
  submittedAt: string
  formData: Record<string, unknown>
}

export default function CoachSubmissionsPage() {
  const { user } = useAuth()
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedFormType, setSelectedFormType] = useState<string>("all")
  const [activeSubmission, setActiveSubmission] = useState<Submission | null>(null)

  useEffect(() => {
    if (!user?.id) return
    setLoading(true)
    getAllSubmissions(user.id).then(res => {
      setSubmissions(res)
      setLoading(false)
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

  const getFormLabel = (type: string) => {
    switch (type) {
      case "standard_joining": return "Standard Joining Questionnaire"
      case "antenatal_joining": return "AN-PN Questionnaire"
      case "checkin": return "Weekly Check-in Form"
      default: return type
    }
  }

  const getFormBadge = (type: string) => {
    switch (type) {
      case "standard_joining": return "bg-accent-gold/15 text-accent-gold border-accent-gold/30"
      case "antenatal_joining": return "bg-pink-500/15 text-pink-400 border-pink-500/30"
      case "checkin": return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
      default: return "bg-bg-elevated text-text-muted"
    }
  }

  const filterTabs = [
    { key: "all", label: "All Types" },
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
            <p className="text-accent-gold text-xs font-bold uppercase tracking-widest">Coach Dashboard</p>
            <h1 className="font-heading text-3xl text-text-primary tracking-wide">CLIENT SUBMISSIONS</h1>
            <p className="text-xs text-text-muted mt-1">
              View and review all onboarding questionnaires and weekly check-in forms.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1.5 rounded-full bg-bg-elevated border border-border-subtle text-xs text-text-muted font-medium">
              Total: <strong className="text-accent-gold">{submissions.length}</strong>
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
              className="w-full rounded-xl bg-bg-card border border-border-subtle pl-10 pr-4 py-2.5 text-xs text-text-primary placeholder-text-muted outline-none focus:border-accent-gold transition-colors"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {filterTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setSelectedFormType(tab.key)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedFormType === tab.key
                    ? "bg-accent-gold text-bg-primary"
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
            <div className="size-8 rounded-full border-2 border-accent-gold border-t-transparent animate-spin" />
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="rounded-2xl border border-border-subtle bg-bg-card p-12 text-center text-text-muted space-y-3">
            <FileText className="size-10 mx-auto text-text-muted/40" />
            <p className="text-sm font-semibold text-text-primary">No submissions found</p>
            <p className="text-xs text-text-muted">Submissions will appear here once clients complete their forms.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSubmissions.map(sub => (
              <motion.div
                key={sub.id}
                whileHover={{ y: -2 }}
                onClick={() => setActiveSubmission(sub)}
                className="rounded-2xl border border-border-subtle bg-bg-card p-5 space-y-4 cursor-pointer hover:border-accent-gold/50 transition-all shadow-lg"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="size-9 rounded-full bg-accent-gold/10 border border-accent-gold/30 flex items-center justify-center font-heading font-bold text-sm text-accent-gold">
                      {sub.clientName.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-text-primary">{sub.clientName}</h3>
                      <p className="text-[11px] text-text-muted flex items-center gap-1 mt-0.5">
                        <Clock className="size-3" />
                        {new Date(sub.submittedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
                  <span className={`px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${getFormBadge(sub.formType)}`}>
                    {getFormLabel(sub.formType)}
                  </span>
                  <span className="text-xs font-bold text-accent-gold flex items-center gap-1">
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
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="w-full max-w-3xl max-h-[90vh] rounded-2xl border border-border-subtle bg-bg-card flex flex-col overflow-hidden shadow-2xl"
              >
                {/* Modal Header */}
                <div className="p-5 border-b border-border-subtle flex items-center justify-between bg-bg-elevated">
                  <div>
                    <span className={`px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${getFormBadge(activeSubmission.formType)}`}>
                      {getFormLabel(activeSubmission.formType)}
                    </span>
                    <h2 className="font-heading text-xl text-text-primary mt-1.5">{activeSubmission.clientName}</h2>
                    <p className="text-xs text-text-muted">
                      Submitted on {new Date(activeSubmission.submittedAt).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveSubmission(null)}
                    className="size-9 rounded-full bg-bg-card border border-border-subtle flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
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
                          <p className="text-xs font-bold text-accent-gold uppercase tracking-wider">{key.replace(/_/g, " ")}</p>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={value} alt={key} className="max-h-60 rounded-xl border border-border-subtle object-contain bg-bg-elevated" />
                        </div>
                      )
                    }

                    if (Array.isArray(value) && value.some(v => typeof v === "string" && v.startsWith("data:"))) {
                      return (
                        <div key={key} className="space-y-2">
                          <p className="text-xs font-bold text-accent-gold uppercase tracking-wider">{key.replace(/_/g, " ")} ({value.length} files)</p>
                          <div className="flex flex-wrap gap-2">
                            {value.map((f, i) => (
                              f.startsWith("data:image") ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img key={i} src={f} alt={`File ${i}`} className="size-24 rounded-lg object-cover border border-border-subtle" />
                              ) : (
                                <div key={i} className="p-3 rounded-lg border border-border-subtle bg-bg-elevated text-xs text-accent-gold flex items-center gap-2">
                                  <FileText className="size-4" /> Document #{i + 1}
                                </div>
                              )
                            ))}
                          </div>
                        </div>
                      )
                    }

                    if (typeof value === "object" && !Array.isArray(value)) {
                      return (
                        <div key={key} className="p-4 rounded-xl border border-border-subtle bg-bg-elevated space-y-3">
                          <h4 className="font-bold text-xs uppercase tracking-wider text-accent-gold">{key.toUpperCase()}</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            {Object.entries(value as Record<string, unknown>).map(([subK, subV]) => (
                              subV ? (
                                <div key={subK} className="space-y-1">
                                  <span className="text-text-muted uppercase text-[10px] font-semibold block">{subK.replace(/_/g, " ")}</span>
                                  <span className="text-text-primary font-medium block">{String(subV)}</span>
                                </div>
                              ) : null
                            ))}
                          </div>
                        </div>
                      )
                    }

                    return (
                      <div key={key} className="border-b border-border-subtle pb-2">
                        <span className="text-[11px] font-bold text-accent-gold uppercase tracking-wider block">{key.replace(/_/g, " ")}</span>
                        <p className="text-xs text-text-primary mt-1 whitespace-pre-wrap">{String(value)}</p>
                      </div>
                    )
                  })}
                </div>

                {/* Modal Footer */}
                <div className="p-4 border-t border-border-subtle bg-bg-elevated flex justify-end">
                  <button
                    onClick={() => setActiveSubmission(null)}
                    className="px-6 py-2.5 rounded-full bg-accent-gold text-xs font-bold uppercase tracking-wider text-bg-primary hover:bg-accent-gold/90 transition-all"
                  >
                    Close Review
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
