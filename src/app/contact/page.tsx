"use client"

import { useState } from "react"
import { PublicLayout } from "@/components/layout/PublicLayout"
import { Input } from "@/components/ui/input"
import { addLead } from "@/lib/firestore"
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
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold mb-2">
            / contact
          </p>
          <h1 className="font-heading text-5xl sm:text-6xl text-white leading-none mb-4">
            GET IN TOUCH
          </h1>
          <p className="text-sm text-white/50 mb-8">
            Ready to start your transformation? Fill out the form below and we will schedule
            a free consultation call.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-white/40 mb-1.5">Name *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Your full name"
              />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1.5">Email *</label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1.5">Phone *</label>
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+91 98765 43210"
              />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1.5">Goal</label>
              <select
                value={form.goal}
                onChange={(e) => setForm({ ...form, goal: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-gold focus:ring-1 focus:ring-gold/30"
              >
                <option value="" className="bg-black">Select a goal</option>
                <option value="contest-prep" className="bg-black">Contest Prep</option>
                <option value="fat-loss" className="bg-black">Fat Loss</option>
                <option value="muscle-building" className="bg-black">Muscle Building</option>
                <option value="antenatal-postnatal" className="bg-black">Antenatal & Postnatal</option>
                <option value="other" className="bg-black">Other</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-gold px-6 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Sending..." : "Send Message"}
            </button>
          </form>
        </div>
      </section>
    </PublicLayout>
  )
}
