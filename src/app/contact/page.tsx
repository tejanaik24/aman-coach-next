"use client"

import { useState } from "react"
import { motion } from "motion/react"
import { PublicLayout } from "@/components/layout/PublicLayout"
import toast from "react-hot-toast"

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    goal: "",
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.phone) {
      toast.error("Please fill in all required fields")
      return
    }
    setSubmitting(true)
    try {
      const { addLead } = await import("@/lib/store")
      await addLead({
        name: form.name,
        email: form.email,
        phone: form.phone,
        goal: form.goal,
        source: "website",
        status: "new",
        notes: "",
      })
      toast.success("Thank you! We will get back to you shortly.")
      setForm({ name: "", email: "", phone: "", goal: "" })
    } catch {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PublicLayout>
      <section className="px-4 py-20">
        <div className="mx-auto max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-purple-light mb-2">
            / contact
          </p>
          <h1 className="font-heading text-5xl sm:text-6xl text-white leading-none mb-4">
            GET IN TOUCH
          </h1>
          <p className="text-sm text-zinc-400 mb-8">
            Ready to start your transformation? Fill out the form below and we will schedule
            a free consultation call.
          </p>
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs text-zinc-500 font-medium mb-1.5 uppercase tracking-wider">Name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-purple focus:ring-1 focus:ring-purple/30"
                placeholder="Your full name"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 font-medium mb-1.5 uppercase tracking-wider">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-purple focus:ring-1 focus:ring-purple/30"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 font-medium mb-1.5 uppercase tracking-wider">Phone *</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-purple focus:ring-1 focus:ring-purple/30"
                placeholder="+91 98765 43210"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 font-medium mb-1.5 uppercase tracking-wider">Goal</label>
              <select
                value={form.goal}
                onChange={(e) => setForm({ ...form, goal: e.target.value })}
                className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-purple focus:ring-1 focus:ring-purple/30"
              >
                <option value="" className="bg-zinc-900">Select a goal</option>
                <option value="contest-prep" className="bg-zinc-900">Contest Prep</option>
                <option value="fat-loss" className="bg-zinc-900">Fat Loss</option>
                <option value="muscle-building" className="bg-zinc-900">Muscle Building</option>
                <option value="antenatal-postnatal" className="bg-zinc-900">Antenatal & Postnatal</option>
                <option value="other" className="bg-zinc-900">Other</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-purple px-6 py-3 text-sm font-bold uppercase tracking-wider text-white transition-all hover:bg-purple-dark disabled:opacity-50"
            >
              {submitting ? "Sending..." : "Send Message"}
            </button>
          </motion.form>
        </div>
      </section>
    </PublicLayout>
  )
}
