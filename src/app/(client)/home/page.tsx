"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Dumbbell, Utensils, ClipboardCheck, MessageCircle, ChevronRight, IndianRupee, Bell } from "lucide-react"
import { format } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import { COACH_WHATSAPP } from "@/lib/coach-contact"
import { useLang, type TKey } from "@/lib/i18n"
import ProfileMenu from "@/components/shared/ProfileMenu"
import { amountDue } from "@/lib/fee-math"

// The whole client app in three buttons. Everything extra lives behind "More".
interface PendingFeeSummary {
  amount: number
  amount_paid?: number
  status?: string
  package_fee?: number
  discount?: number
  due_date: string
}

interface HomeData {
  name: string
  email: string | null
  avatarUrl: string | null
  workoutTitle: string | null
  dietTitle: string | null
  pendingFees: PendingFeeSummary[]
  feedback: string | null
}

function greetingKey(): TKey {
  const h = new Date().getHours()
  if (h < 12) return "greetingMorning"
  if (h < 17) return "greetingAfternoon"
  return "greetingEvening"
}

export default function ClientHomePage() {
  const router = useRouter()
  const { t, toggle } = useLang()
  const [data, setData] = useState<HomeData | null>(null)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  // Set after mount: the page is pre-built, so a build-time greeting would be wrong.
  const [greeting, setGreeting] = useState<TKey | null>(null)
  useEffect(() => setGreeting(greetingKey()), [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const [profileRes, clientRes] = await Promise.all([
          supabase.from("profiles").select("name, avatar_url").eq("id", user.id).single(),
          supabase.from("clients").select("id").eq("user_id", user.id).maybeSingle(),
        ])
        const clientId = clientRes.data?.id as string | undefined
        const [docsRes, feeRes, checkinRes] = clientId
          ? await Promise.all([
              supabase.from("client_documents").select("kind, title").eq("client_id", clientId).order("created_at", { ascending: false }).limit(10),
              supabase.from("fees").select("amount, amount_paid, status, package_fee, discount, due_date").eq("client_id", clientId).in("status", ["pending", "overdue"]).order("due_date", { ascending: true }),
              supabase.from("checkins").select("coach_feedback, reviewed_at").eq("client_id", clientId).not("coach_feedback", "is", null).order("reviewed_at", { ascending: false }).limit(1),
            ])
          : [null, null, null]
        const docs = (docsRes?.data ?? []) as { kind: string; title: string }[]
        const fb = checkinRes?.data?.[0] as { coach_feedback: string; reviewed_at: string } | undefined
        const recentFeedback = fb && Date.now() - new Date(fb.reviewed_at).getTime() < 7 * 86400000 ? fb.coach_feedback : null
        if (!cancelled) {
          setData({
            name: (profileRes.data?.name as string | undefined) ?? "",
            email: user.email ?? null,
            avatarUrl: (profileRes.data?.avatar_url as string | null | undefined) ?? null,
            workoutTitle: docs.find((d) => d.kind === "workout")?.title ?? null,
            dietTitle: docs.find((d) => d.kind === "diet")?.title ?? null,
            pendingFees: (feeRes?.data ?? []) as PendingFeeSummary[],
            feedback: recentFeedback,
          })
        }
      } catch {
        // the three buttons still work without any data
      }
    })()
    return () => { cancelled = true }
  }, [])

  const first = data?.name.trim().split(/\s+/)[0] ?? ""
  const big = "w-full rounded-3xl p-5 flex items-center gap-4 text-left cursor-pointer active:scale-[0.98] transition-transform min-h-[104px]"

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white -mx-5 px-5 pt-8 pb-8">
      <div className="max-w-lg mx-auto space-y-5">
        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-text-muted text-base">{greeting ? t(greeting) : "\u00a0"}</p>
              <h1 className="font-heading italic text-4xl mt-1">{first || t("welcome")}</h1>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={toggle} className="h-10 px-4 rounded-full bg-white/10 text-white text-base font-semibold cursor-pointer">{t("langButton")}</button>
              <button
                type="button"
                onClick={() => setIsProfileOpen(true)}
                aria-label="Settings & Notifications"
                className="h-10 w-10 rounded-full bg-white/10 border border-accent-orange/40 flex items-center justify-center text-accent-orange cursor-pointer"
              >
                <Bell className="size-4" />
              </button>
            </div>
          </div>
        </div>

        <ProfileMenu
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          name={data?.name || "Client"}
          email={data?.email ?? null}
          avatarUrl={data?.avatarUrl ?? null}
          role="client"
          onNameUpdated={(newName) => setData((prev) => (prev ? { ...prev, name: newName } : prev))}
        />

        <button type="button" onClick={() => router.push("/workout")} className={`${big} bg-[#F3EDE2] text-[#181310]`}>
          <Dumbbell className="size-10 shrink-0 text-accent-orange" />
          <span className="min-w-0">
            <span className="block text-2xl font-bold leading-tight">{t("workout")}</span>
            <span className="block text-base text-[#8A7F70] mt-0.5 truncate">{data?.workoutTitle ?? t("workoutSub")}</span>
          </span>
        </button>

        <button type="button" onClick={() => router.push("/diet")} className={`${big} bg-[#F3EDE2] text-[#181310]`}>
          <Utensils className="size-10 shrink-0 text-accent-orange" />
          <span className="min-w-0">
            <span className="block text-2xl font-bold leading-tight">{t("food")}</span>
            <span className="block text-base text-[#8A7F70] mt-0.5 truncate">{data?.dietTitle ?? t("foodSub")}</span>
          </span>
        </button>

        <button type="button" onClick={() => router.push("/checkin")} className={`${big} bg-accent-orange text-black`}>
          <ClipboardCheck className="size-10 shrink-0" />
          <span className="min-w-0">
            <span className="block text-2xl font-bold leading-tight">{t("checkin")}</span>
            <span className="block text-base text-black/70 mt-0.5">{t("checkinSub")}</span>
          </span>
        </button>

        {data?.feedback && (
          <div className="rounded-2xl bg-bg-card border border-border-subtle p-4">
            <p className="text-sm text-text-muted">{t("messageFromAman")}</p>
            <p className="text-lg mt-1 leading-snug">{data.feedback}</p>
          </div>
        )}

        {data?.pendingFees && data.pendingFees.length > 0 && (() => {
          const dueAmt = data.pendingFees.reduce(
            (sum, f) => sum + amountDue(f),
            0
          )
          const disc = data.pendingFees.reduce((sum, f) => sum + Number(f.discount || 0), 0)
          const pkgFee = data.pendingFees.reduce(
            (sum, f) => sum + Number(f.package_fee || (Number(f.amount) + Number(f.discount || 0))),
            0
          )
          const firstDue = data.pendingFees[0].due_date
          return (
            <button type="button" onClick={() => router.push("/payments")} className="w-full rounded-2xl bg-bg-card border border-border-subtle p-4 flex items-center gap-3 text-left cursor-pointer">
              <IndianRupee className="size-6 text-accent-orange shrink-0" />
              <span className="flex-1 min-w-0">
                <span className="block text-lg font-semibold">
                  {t("feeDue")} ₹{dueAmt.toLocaleString("en-IN")}
                  {data.pendingFees.length > 1 ? ` (${data.pendingFees.length} bills)` : ""}
                </span>
                <span className="block text-base text-text-muted">
                  {disc > 0 ? `Coaching Fee ₹${pkgFee.toLocaleString("en-IN")} (−₹${disc.toLocaleString("en-IN")}) · ` : ""}
                  {t("by")} {format(new Date(firstDue + "T00:00:00"), "d MMM")}
                </span>
              </span>
              <ChevronRight className="size-5 text-text-muted" />
            </button>
          )
        })()}

        <a
          href={`https://wa.me/${COACH_WHATSAPP}?text=${encodeURIComponent("Hi Aman, ")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="h-14 rounded-2xl bg-[#25D366] text-black font-bold text-lg flex items-center justify-center gap-2"
        >
          <MessageCircle className="size-6" /> {t("messageAman")}
        </a>

        <button type="button" onClick={() => router.push("/more")} className="w-full text-center text-text-muted text-base underline underline-offset-4 py-2 cursor-pointer">
          {t("more")}
        </button>
      </div>
    </div>
  )
}
