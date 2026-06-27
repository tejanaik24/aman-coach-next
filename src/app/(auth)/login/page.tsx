"use client"

import { useRouter } from "next/navigation"
import { ChevronRight } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col justify-between px-5 py-10">
      <div className="flex-1 flex flex-col justify-center">
        <div className="text-center mb-10">
          <div className="w-[72px] h-[72px] rounded-2xl bg-[#C9A84C] flex items-center justify-center mx-auto mb-5">
            <span className="text-black text-2xl font-bold" style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}>
              AK
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-widest" style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}>
            AMAN KHURANA
          </h1>
          <p className="text-[#A0A0A0] text-xs tracking-[0.3em] mt-1">ELITE COACHING PLATFORM</p>
          <div className="w-12 h-px bg-[#C9A84C] mx-auto mt-3" />
        </div>

        <div className="bg-[#111111] rounded-3xl border border-[#222222] p-6 space-y-4">
          <p className="text-[#A0A0A0] text-sm text-center mb-2">Preview Mode — Choose a view</p>

          <button
            onClick={() => router.push("/coach/dashboard")}
            className="w-full h-14 rounded-2xl bg-[#C9A84C] text-black font-bold text-base flex items-center justify-center gap-2"
          >
            Preview as Coach <ChevronRight className="size-5" />
          </button>

          <button
            onClick={() => router.push("/client/home")}
            className="w-full h-14 rounded-2xl border border-[#C9A84C] text-[#C9A84C] font-bold text-base flex items-center justify-center gap-2"
          >
            Preview as Client <ChevronRight className="size-5" />
          </button>
        </div>
      </div>

      <p className="text-center text-[#333333] text-xs mt-8">Powered by Vyzma</p>
    </div>
  )
}
