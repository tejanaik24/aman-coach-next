"use client"

import { Dumbbell } from "lucide-react"

export default function WorkoutPage() {
  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-bold text-white" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
        Workout
      </h1>
      <div className="bg-[#161616] border border-[#222222] rounded-2xl p-8 text-center space-y-3">
        <div className="size-12 rounded-full bg-[#C9A84C]/10 flex items-center justify-center mx-auto">
          <Dumbbell className="size-6 text-[#C9A84C]" />
        </div>
        <p className="text-white font-semibold">No workout plan assigned</p>
        <p className="text-sm text-[#A0A0A0]">Your coach will assign a plan soon</p>
      </div>
    </div>
  )
}
