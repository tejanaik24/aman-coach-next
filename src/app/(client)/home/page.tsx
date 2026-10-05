"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Dumbbell, Utensils, ClipboardCheck, MessageCircle, ChevronRight, IndianRupee } from "lucide-react"
import { format } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import { COACH_WHATSAPP } from "@/lib/coach-contact"
import { useLang, type TKey } from "@/lib/i18n"

// The whole client app in three buttons. Everything extra lives behind "More".
interface HomeData {
  name: string
  workoutTitle: string | null
  dietTitle: string | null
  fee: { amount: number; due_date: string } | null
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

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const [profileRes, clientRes] = await Promise.all([
          supabase.from("profiles").select("name").eq("id", user.id).single(),
          supabase.from("clients").select("id").eq("user_id", user.id).maybeSingle(),
        ])
        const clientId = clientRes.data?.id as string | undefined
        const [docsRes, feeRes, checkinRes] = clientId
          ? await Promise.all([
              supabase.from("client_documents").select("kind, title").eq("client_id", clientId).order("created_at", { ascending: false }).limit(10),
              supabase.from("fees").select("amount, due_date").eq("client_id", clientId).in("status", ["pending", "overdue"]).order("due_date").limit(1),
              supabase.from("checkins").select("coach_feedback, reviewed_at").eq("client_id", clientId).not("coach_feedback", "is", null).order("reviewed_at", { ascending: false }).limit(1),
            ])
          : [null, null, null]
        const docs = (docsRes?.data ?? []) as { kind: string; title: string }[]
        const fb = checkinRes?.data?.[0] as { coach_feedback: string; reviewed_at: string } | undefined
        const recentFeedback = fb && Date.now() - new Date(fb.reviewed_at).getTime() < 7 * 86400000 ? fb.coach_feedback : null
        if (!cancelled) {
          setData({
            name: (profileRes.data?.name as string | undefined) ?? "",
            workoutTitle: docs.find((d) => d.kind === "workout")?.title ?? null,
            dietTitle: docs.find((d) => d.kind === "diet")?.title ?? null,
            fee: (feeRes?.data?.[0] as HomeData["fee"]) ?? null,
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
              <p className="text-text-muted text-base">{t(greetingKey())}</p>
              <h1 className="font-heading italic text-4xl mt-1">{first || t("welcome")}</h1>
            </div>
            <button type="button" onClick={toggle} className="h-10 px-4 rounded-full bg-white/10 text-white text-base font-semibold cursor-pointer">{t("langButton")}</button>
          </div>
        </div>

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

        {data?.fee && (
          <button type="button" onClick={() => router.push("/payments")} className="w-full rounded-2xl bg-bg-card border border-border-subtle p-4 flex items-center gap-3 text-left cursor-pointer">
            <IndianRupee className="size-6 text-accent-orange shrink-0" />
            <span className="flex-1 min-w-0">
              <span className="block text-lg font-semibold">{t("feeDue")} ₹{Number(data.fee.amount).toLocaleString("en-IN")}</span>
              <span className="block text-base text-text-muted">{t("by")} {format(new Date(data.fee.due_date + "T00:00:00"), "d MMM")}</span>
            </span>
            <ChevronRight className="size-5 text-text-muted" />
          </button>
        )}

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
