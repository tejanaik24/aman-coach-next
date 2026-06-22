"use client"

import Link from "next/link"
import { motion } from "motion/react"
import { PublicLayout } from "@/components/layout/PublicLayout"
import { ImageWithFallback } from "@/components/ui/ImageWithFallback"
import { ArrowRight, Star } from "lucide-react"

const stats = [
  { label: "Clients Transformed", value: "500+" },
  { label: "Years Experience", value: "10+" },
  { label: "Success Rate", value: "95%" },
]

const services = [
  { title: "CONTEST PREP", desc: "Competition-ready physique with peak week protocols", image: "/images/aman-contest-prep.png" },
  { title: "FAT LOSS", desc: "Sustainable fat loss without sacrificing muscle", image: "/images/aman-fat-loss.png" },
  { title: "MUSCLE BUILDING", desc: "Science-based hypertrophy for lean mass gains", image: "/images/aman-muscle-building.png" },
  { title: "ANTENATAL & POSTNATAL", desc: "Safe, effective training for every stage of motherhood", image: "/images/aman-antenatal.png" },
]

const testimonials = [
  { name: "Priya S.", text: "Aman transformed my approach to fitness. Lost 12kg in 3 months and kept it off!", rating: 5 },
  { name: "Rahul M.", text: "Won my first competition thanks to Aman's contest prep. His attention to detail is unmatched.", rating: 5 },
  { name: "Ananya K.", text: "The antenatal program was a lifesaver. Felt strong throughout my pregnancy and recovered quickly.", rating: 5 },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const } },
}

export default function HomePage() {
  return (
    <PublicLayout>
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,184,0,0.08),transparent_50%)] pointer-events-none" />
        <div className="relative z-10 mx-auto max-w-6xl px-4 w-full">
          <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] as const }}
              className="order-2 lg:order-1"
            >
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#FFB800] mb-4">
                Human Hardware Optimization
              </p>
              <h1
                className="leading-none tracking-tight"
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(3rem, 8vw, 6rem)" }}
              >
                TRANSFORM YOUR
                <br />
                <span
                  style={{
                    background: "linear-gradient(135deg, #FFB800, #B28000)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  HUMAN HARDWARE
                </span>
              </h1>
              <p className="mt-6 text-base text-[#999999] max-w-md leading-relaxed" style={{ fontFamily: "'Barlow', sans-serif" }}>
                Elite coaching by <strong className="text-white">Aman Khurana</strong> — precise nutrition,
                science-backed training, real transformations.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-start gap-4">
                <Link
                  href="/auth/signup"
                  className="group rounded-xl px-8 py-3.5 text-sm font-bold uppercase tracking-wider text-black transition-all hover:-translate-y-0.5"
                  style={{ background: "linear-gradient(135deg, #FFB800, #B28000)", fontFamily: "'Barlow', sans-serif" }}
                >
                  Book a Consultation
                  <ArrowRight className="inline-block size-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/services"
                  className="rounded-xl border px-8 py-3.5 text-sm font-medium text-[#FFB800] transition-all hover:bg-[#FFB800] hover:text-black"
                  style={{ borderColor: "rgba(255,184,0,0.4)", fontFamily: "'Barlow', sans-serif" }}
                >
                  View Programs
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                {["IHFA", "STANFORD", "IAOTH", "VICTOR BLACK"].map((badge) => (
                  <span
                    key={badge}
                    className="px-3 py-1 text-xs font-bold tracking-widest border rounded"
                    style={{
                      borderColor: "rgba(255,184,0,0.25)",
                      color: "#FFB800",
                      fontFamily: "'Barlow', sans-serif",
                      background: "rgba(255,184,0,0.05)"
                    }}
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] as const }}
              className="order-1 lg:order-2 relative"
            >
              <div
                className="relative aspect-[3/4] max-w-sm mx-auto rounded-3xl overflow-hidden"
                style={{ border: "1px solid rgba(255,184,0,0.25)" }}
              >
                <ImageWithFallback
                  src="/images/aman-hero.png"
                  alt="Aman Khurana"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              </div>
              <div className="absolute -bottom-4 -left-4 size-32 rounded-full blur-3xl" style={{ background: "rgba(255,184,0,0.1)" }} />
              <div className="absolute -top-4 -right-4 size-40 rounded-full blur-3xl" style={{ background: "rgba(255,184,0,0.06)" }} />
            </motion.div>
          </div>
        </div>
      </section>

      <motion.section
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="px-4 py-16 border-t border-zinc-800"
      >
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-3 gap-3 sm:gap-6">
            {stats.map((s) => (
              <motion.div
                key={s.label}
                variants={itemVariants}
                className="rounded-2xl border border-[rgba(255,184,0,0.2)] bg-[rgba(255,184,0,0.03)] p-4 sm:p-6 text-center"
              >
                <p className="font-heading text-3xl sm:text-5xl text-[#FFB800]">{s.value}</p>
                <p className="text-xs sm:text-sm text-zinc-500 mt-2">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      <section className="px-4 py-20 border-t border-zinc-800">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FFD200] mb-2">
            / services
          </p>
          <h2 className="font-heading text-4xl sm:text-5xl text-white mb-10">
            WHAT WE OFFER
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-none">
            {services.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="min-w-[280px] sm:min-w-[320px] snap-start"
              >
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden group hover:border-[rgba(255,184,0,0.4)] transition-colors">
                  <div className="aspect-[4/3] relative overflow-hidden">
                    <ImageWithFallback
                      src={s.image}
                      alt={s.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <p className="absolute bottom-3 left-4 font-heading text-xl text-white">
                      {s.title}
                    </p>
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-zinc-400">{s.desc}</p>
                    <Link
                      href={`/services#${s.title.toLowerCase().replace(/\s+/g, "-")}`}
                      className="inline-flex items-center gap-1 mt-3 text-xs font-bold uppercase tracking-wider text-[#FFB800] hover:text-[#FFD200] transition-colors"
                    >
                      Learn More <ArrowRight className="size-3" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="px-4 py-20 border-t border-zinc-800"
      >
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FFB800] mb-2 text-center">
            / testimonials
          </p>
          <h2 className="font-heading text-4xl sm:text-5xl text-white mb-12 text-center">
            WHAT CLIENTS SAY
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="rounded-2xl border border-[rgba(255,184,0,0.15)] bg-[#111111] p-6"
              >
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="size-4 fill-[#FFB800] text-[#FFB800]" />
                  ))}
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed mb-4">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-[rgba(255,184,0,0.15)] flex items-center justify-center">
                    <span className="font-heading text-sm text-[#FFB800]">
                      {t.name.split(" ").map(n => n[0]).join("")}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-white">{t.name}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      <section className="px-4 py-20 border-t border-zinc-800">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FFB800] mb-2">
              / get started
            </p>
            <h2 className="font-heading text-4xl sm:text-5xl text-white mb-6">
              READY TO TRANSFORM?
            </h2>
            <p className="text-base text-zinc-400 mb-8 max-w-lg mx-auto">
              Book a free consultation call to discuss your goals and find the perfect program for you.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-full bg-[#FFB800] px-8 py-3.5 text-sm font-bold uppercase tracking-wider text-black transition-all hover:bg-[#B28000] hover:shadow-lg hover:shadow-[#FFB800]/25"
            >
              Book Free Call <ArrowRight className="size-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      <div className="sticky bottom-0 z-20 border-t border-zinc-800 bg-black/95 backdrop-blur-md px-4 py-3">
        <div className="mx-auto max-w-lg">
          <Link
            href="/auth/signup"
            className="flex items-center justify-center gap-2 rounded-full bg-[#FFB800] py-3.5 text-sm font-bold uppercase tracking-wider text-black transition-all hover:bg-[#B28000]"
          >
            Start Your Journey <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </PublicLayout>
  )
}
