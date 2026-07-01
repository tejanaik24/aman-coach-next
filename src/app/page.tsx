"use client"

import Link from "next/link"
import { motion } from "motion/react"
import { Check, ChevronRight, Star, Dumbbell, Apple, ClipboardList, MessageCircle } from "lucide-react"

const RESULTS = [
  { name: "Priya S.", stat: "−14 kg", time: "3 months", goal: "Fat Loss" },
  { name: "Rahul M.", stat: "+8 kg muscle", time: "4 months", goal: "Muscle Building" },
  { name: "Sneha R.", stat: "−9 kg", time: "2 months", goal: "Contest Prep" },
]

const PACKAGES = [
  {
    name: "Starter",
    price: "₹4,999",
    per: "/month",
    highlight: false,
    features: ["Custom workout plan", "Nutrition guide", "Weekly check-ins", "WhatsApp support"],
  },
  {
    name: "Transformation",
    price: "₹7,999",
    per: "/month",
    highlight: true,
    badge: "Most Popular",
    features: ["Custom workout plan", "Full macro nutrition", "Daily check-ins", "Priority support", "Progress tracking", "Monthly review call"],
  },
  {
    name: "Elite",
    price: "₹12,999",
    per: "/month",
    highlight: false,
    features: ["Everything in Transformation", "Contest / posing prep", "Supplement guidance", "Unlimited check-ins", "1:1 video calls"],
  },
]

const HOW = [
  { step: "01", title: "Apply & Onboard", desc: "Fill a quick form. Aman reviews your goals and assigns the right package." },
  { step: "02", title: "Get Your Plan", desc: "Receive a personalised workout + nutrition plan built around your lifestyle." },
  { step: "03", title: "Check In Weekly", desc: "Log your progress inside the app. Aman reviews and adjusts your plan live." },
]

function fadeUp(delay = 0) {
  return {
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.5, delay },
  }
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">

      {/* ── NAV ─────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0A0A0A]/90 backdrop-blur border-b border-[#1A1A1A]">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#C9A84C] flex items-center justify-center">
              <span className="text-black text-sm font-bold" style={{ fontFamily: "var(--font-space-grotesk)" }}>AK</span>
            </div>
            <span className="text-white font-bold text-sm tracking-wider hidden sm:block" style={{ fontFamily: "var(--font-space-grotesk)" }}>
              AMAN KHURANA
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="#packages" className="text-[#A0A0A0] text-sm hover:text-white transition-colors hidden sm:block">
              Packages
            </Link>
            <Link href="#results" className="text-[#A0A0A0] text-sm hover:text-white transition-colors hidden sm:block">
              Results
            </Link>
            <Link href="/login"
              className="h-9 px-5 rounded-full bg-[#C9A84C] text-black text-sm font-bold flex items-center hover:bg-[#d4b05a] transition-colors">
              Login
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────── */}
      <section className="pt-32 pb-20 px-5 text-center max-w-4xl mx-auto">
        <motion.div {...fadeUp(0)} className="inline-flex items-center gap-2 bg-[#C9A84C]/10 border border-[#C9A84C]/30 rounded-full px-4 py-1.5 mb-6">
          <Star className="size-3.5 fill-[#C9A84C] text-[#C9A84C]" />
          <span className="text-[#C9A84C] text-xs font-semibold tracking-wider">ELITE COACHING PLATFORM</span>
        </motion.div>

        <motion.h1 {...fadeUp(0.1)} className="text-5xl sm:text-7xl font-black text-white leading-[1.05] tracking-tight mb-6"
          style={{ fontFamily: "var(--font-space-grotesk)" }}>
          Build the body<br /><span className="text-[#C9A84C]">you deserve.</span>
        </motion.h1>

        <motion.p {...fadeUp(0.2)} className="text-[#A0A0A0] text-lg sm:text-xl max-w-xl mx-auto mb-10 leading-relaxed">
          Science-backed coaching by Aman Khurana — personalised plans, weekly check-ins, and real accountability that gets results.
        </motion.p>

        <motion.div {...fadeUp(0.3)} className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="#packages"
            className="w-full sm:w-auto h-14 px-8 rounded-2xl bg-[#C9A84C] text-black font-bold text-base flex items-center justify-center gap-2 hover:bg-[#d4b05a] transition-colors">
            View Packages <ChevronRight className="size-5" />
          </Link>
          <Link href="/login"
            className="w-full sm:w-auto h-14 px-8 rounded-2xl border border-[#333333] text-white font-semibold text-base flex items-center justify-center gap-2 hover:border-[#C9A84C] transition-colors">
            Already a client? Login
          </Link>
        </motion.div>

        {/* Stats */}
        <motion.div {...fadeUp(0.4)} className="mt-16 grid grid-cols-3 gap-6 max-w-sm mx-auto">
          {[["200+", "Clients"], ["4.9★", "Rating"], ["3 yrs", "Experience"]].map(([val, label]) => (
            <div key={label} className="text-center">
              <p className="text-2xl font-black text-[#C9A84C]" style={{ fontFamily: "var(--font-space-grotesk)" }}>{val}</p>
              <p className="text-[#555555] text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ── WHAT YOU GET ────────────────────────────────── */}
      <section className="py-20 px-5 bg-[#0D0D0D]">
        <div className="max-w-5xl mx-auto">
          <motion.h2 {...fadeUp()} className="text-3xl sm:text-4xl font-black text-center mb-4"
            style={{ fontFamily: "var(--font-space-grotesk)" }}>
            Everything you need to <span className="text-[#C9A84C]">succeed</span>
          </motion.h2>
          <motion.p {...fadeUp(0.1)} className="text-[#A0A0A0] text-center mb-12">
            All inside one app. No spreadsheets. No confusion.
          </motion.p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Dumbbell, title: "Custom Workout Plans", desc: "Built for your body type, schedule and gym access." },
              { icon: Apple, title: "Nutrition Coaching", desc: "Macros, meal timing and supplement guidance." },
              { icon: ClipboardList, title: "Weekly Check-ins", desc: "Track body stats, adherence and energy weekly." },
              { icon: MessageCircle, title: "Direct Coach Access", desc: "Message Aman directly. He reviews every check-in." },
            ].map(({ icon: Icon, title, desc }, i) => (
              <motion.div key={title} {...fadeUp(i * 0.08)}
                className="bg-[#111111] border border-[#1E1E1E] rounded-3xl p-6 hover:border-[#C9A84C]/30 transition-colors">
                <div className="w-11 h-11 rounded-2xl bg-[#C9A84C]/10 flex items-center justify-center mb-4">
                  <Icon className="size-5 text-[#C9A84C]" />
                </div>
                <h3 className="text-white font-bold text-base mb-2" style={{ fontFamily: "var(--font-space-grotesk)" }}>{title}</h3>
                <p className="text-[#666666] text-sm leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────── */}
      <section className="py-20 px-5">
        <div className="max-w-3xl mx-auto">
          <motion.h2 {...fadeUp()} className="text-3xl sm:text-4xl font-black text-center mb-12"
            style={{ fontFamily: "var(--font-space-grotesk)" }}>
            How it <span className="text-[#C9A84C]">works</span>
          </motion.h2>

          <div className="space-y-6">
            {HOW.map(({ step, title, desc }, i) => (
              <motion.div key={step} {...fadeUp(i * 0.1)}
                className="flex gap-5 bg-[#111111] border border-[#1E1E1E] rounded-3xl p-6">
                <span className="text-4xl font-black text-[#C9A84C]/20 leading-none flex-shrink-0"
                  style={{ fontFamily: "var(--font-space-grotesk)" }}>{step}</span>
                <div>
                  <h3 className="text-white font-bold text-lg mb-1" style={{ fontFamily: "var(--font-space-grotesk)" }}>{title}</h3>
                  <p className="text-[#666666] text-sm leading-relaxed">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── RESULTS ─────────────────────────────────────── */}
      <section id="results" className="py-20 px-5 bg-[#0D0D0D]">
        <div className="max-w-5xl mx-auto">
          <motion.h2 {...fadeUp()} className="text-3xl sm:text-4xl font-black text-center mb-4"
            style={{ fontFamily: "var(--font-space-grotesk)" }}>
            Real <span className="text-[#C9A84C]">results</span>
          </motion.h2>
          <motion.p {...fadeUp(0.1)} className="text-[#A0A0A0] text-center mb-12">From real clients.</motion.p>

          <div className="grid sm:grid-cols-3 gap-4">
            {RESULTS.map(({ name, stat, time, goal }, i) => (
              <motion.div key={name} {...fadeUp(i * 0.1)}
                className="bg-[#111111] border border-[#1E1E1E] rounded-3xl p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-[#C9A84C]/10 flex items-center justify-center mx-auto mb-3">
                  <span className="text-[#C9A84C] font-bold text-sm">{name[0]}</span>
                </div>
                <p className="text-3xl font-black text-[#C9A84C] mb-1" style={{ fontFamily: "var(--font-space-grotesk)" }}>{stat}</p>
                <p className="text-white font-semibold text-sm">{name}</p>
                <p className="text-[#555555] text-xs mt-1">{goal} · {time}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PACKAGES ────────────────────────────────────── */}
      <section id="packages" className="py-20 px-5">
        <div className="max-w-5xl mx-auto">
          <motion.h2 {...fadeUp()} className="text-3xl sm:text-4xl font-black text-center mb-4"
            style={{ fontFamily: "var(--font-space-grotesk)" }}>
            Choose your <span className="text-[#C9A84C]">package</span>
          </motion.h2>
          <motion.p {...fadeUp(0.1)} className="text-[#A0A0A0] text-center mb-12">All plans include the coaching app + direct Aman access.</motion.p>

          <div className="grid sm:grid-cols-3 gap-4">
            {PACKAGES.map(({ name, price, per, highlight, badge, features }, i) => (
              <motion.div key={name} {...fadeUp(i * 0.1)}
                className={`relative rounded-3xl p-6 flex flex-col ${
                  highlight
                    ? "bg-[#C9A84C] text-black"
                    : "bg-[#111111] border border-[#1E1E1E] text-white"
                }`}>
                {badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black text-[#C9A84C] text-xs font-bold px-3 py-1 rounded-full border border-[#C9A84C]/40">
                    {badge}
                  </span>
                )}
                <h3 className={`font-black text-xl mb-1 ${highlight ? "text-black" : "text-white"}`}
                  style={{ fontFamily: "var(--font-space-grotesk)" }}>{name}</h3>
                <div className="flex items-end gap-1 mb-5">
                  <span className={`text-4xl font-black ${highlight ? "text-black" : "text-[#C9A84C]"}`}
                    style={{ fontFamily: "var(--font-space-grotesk)" }}>{price}</span>
                  <span className={`text-sm mb-1 ${highlight ? "text-black/60" : "text-[#555555]"}`}>{per}</span>
                </div>
                <ul className="space-y-2.5 flex-1">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check className={`size-4 flex-shrink-0 mt-0.5 ${highlight ? "text-black" : "text-[#C9A84C]"}`} />
                      <span className={highlight ? "text-black/80" : "text-[#A0A0A0]"}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/login"
                  className={`mt-6 h-12 rounded-2xl font-bold text-sm flex items-center justify-center gap-1.5 transition-colors ${
                    highlight
                      ? "bg-black text-[#C9A84C] hover:bg-[#111111]"
                      : "bg-[#1A1A1A] text-white hover:bg-[#222222] border border-[#2A2A2A]"
                  }`}>
                  Get Started <ChevronRight className="size-4" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ──────────────────────────────────── */}
      <section className="py-20 px-5 text-center">
        <div className="max-w-xl mx-auto">
          <motion.div {...fadeUp()} className="w-[72px] h-[72px] rounded-2xl bg-[#C9A84C] flex items-center justify-center mx-auto mb-6">
            <span className="text-black text-2xl font-bold" style={{ fontFamily: "var(--font-space-grotesk)" }}>AK</span>
          </motion.div>
          <motion.h2 {...fadeUp(0.1)} className="text-3xl sm:text-4xl font-black mb-4"
            style={{ fontFamily: "var(--font-space-grotesk)" }}>
            Ready to <span className="text-[#C9A84C]">transform?</span>
          </motion.h2>
          <motion.p {...fadeUp(0.2)} className="text-[#A0A0A0] mb-8">
            Join 200+ clients already crushing their goals with Aman.
          </motion.p>
          <motion.div {...fadeUp(0.3)}>
            <Link href="/login"
              className="inline-flex items-center gap-2 h-14 px-10 rounded-2xl bg-[#C9A84C] text-black font-bold text-base hover:bg-[#d4b05a] transition-colors">
              Login / Get Started <ChevronRight className="size-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────── */}
      <footer className="border-t border-[#1A1A1A] py-8 px-5 text-center">
        <p className="text-[#333333] text-sm">© 2026 Aman Khurana Elite Coaching. Powered by Vyzma.</p>
      </footer>
    </div>
  )
}
