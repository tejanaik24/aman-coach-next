"use client"

import { useState } from "react"
import { CoachLayout } from "@/components/layout/CoachLayout"
import toast from "react-hot-toast"
import { useRouter } from "next/navigation"
import { ArrowLeft, UserPlus } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"

const planTypes = [
  { value: "fat-loss", label: "Fat Loss" },
  { value: "muscle-building", label: "Muscle Building" },
  { value: "contest-prep", label: "Contest Prep" },
  { value: "antenatal", label: "Antenatal" },
]

const planDurations = [
  { value: "1", label: "1 Month" },
  { value: "3", label: "3 Months" },
  { value: "6", label: "6 Months" },
  { value: "12", label: "12 Months" },
]

export default function AddClientPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    planType: "fat-loss",
    duration: "3",
    startDate: new Date().toISOString().split("T")[0],
    fee: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.phone || !form.email || !form.password) {
      toast.error("Please fill in all required fields")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/create-client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          display_name: form.name,
          phone: form.phone,
          plan: form.planType,
          coach_id: user?.id,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to create client")
      toast.success("Client added successfully!")
      router.push("/coach/clients")
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to add client")
    } finally {
      setLoading(false)
    }
  }

  return (
    <CoachLayout>
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors mb-4"
      >
        <ArrowLeft className="size-4" />
        Back
      </button>

      <h1 className="font-heading text-2xl text-white mb-6">Add New Client</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
          <div>
            <label className="block text-xs text-zinc-500 font-medium mb-1.5 uppercase tracking-wider">Full Name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#FFB800] focus:ring-1 focus:ring-[#FFB800]/30"
              placeholder="Client name"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 font-medium mb-1.5 uppercase tracking-wider">Phone Number *</label>
            <input
              type="tel"
              inputMode="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#FFB800] focus:ring-1 focus:ring-[#FFB800]/30"
              placeholder="+91 98765 43210"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 font-medium mb-1.5 uppercase tracking-wider">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#FFB800] focus:ring-1 focus:ring-[#FFB800]/30"
              placeholder="client@email.com"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 font-medium mb-1.5 uppercase tracking-wider">Temporary Password *</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#FFB800] focus:ring-1 focus:ring-[#FFB800]/30"
              placeholder="Set initial password"
              minLength={6}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
          <div>
            <label className="block text-xs text-zinc-500 font-medium mb-1.5 uppercase tracking-wider">Plan Type</label>
            <div className="flex flex-wrap gap-2">
              {planTypes.map((pt) => (
                <button
                  key={pt.value}
                  type="button"
                  onClick={() => setForm({ ...form, planType: pt.value })}
                  className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${
                    form.planType === pt.value
                      ? "bg-[#FFB800] text-white"
                      : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-500"
                  }`}
                >
                  {pt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 font-medium mb-1.5 uppercase tracking-wider">Plan Duration</label>
            <div className="flex flex-wrap gap-2">
              {planDurations.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setForm({ ...form, duration: d.value })}
                  className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${
                    form.duration === d.value
                      ? "bg-[#FFB800] text-white"
                      : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-500"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 font-medium mb-1.5 uppercase tracking-wider">Start Date</label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#FFB800] focus:ring-1 focus:ring-[#FFB800]/30"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 font-medium mb-1.5 uppercase tracking-wider">Fee Amount (INR)</label>
            <input
              type="number"
              inputMode="numeric"
              value={form.fee}
              onChange={(e) => setForm({ ...form, fee: e.target.value })}
              className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#FFB800] focus:ring-1 focus:ring-[#FFB800]/30"
              placeholder="5000"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-[#FFB800] py-3.5 text-sm font-bold uppercase tracking-wider text-white hover:bg-[#B28000] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {loading ? "Adding..." : <><UserPlus className="size-4" /> Add Client</>}
        </button>
      </form>
    </CoachLayout>
  )
}
