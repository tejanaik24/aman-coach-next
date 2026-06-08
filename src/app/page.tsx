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
        <div className="absolute inset-0 bg-gradient-to-br from-purple/10 via-transparent to-black pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(124,58,237,0.08),transparent_50%)]" />
        <div className="relative z-10 mx-auto max-w-6xl px-4 w-full">
          <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] as const }}
              className="order-2 lg:order-1"
            >
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-purple-light mb-4">
                Online Fitness Coaching
              </p>
              <h1 className="font-heading text-5xl sm:text-7xl lg:text-8xl text-white leading-none tracking-tight">
                TRANSFORM
                <br />
                <span className="text-purple">YOUR BODY</span>
              </h1>
              <p className="mt-6 text-base text-zinc-400 max-w-md leading-relaxed">
                Expert coaching tailored to your goals. Contest prep, fat loss, muscle building,
                and antenatal & postnatal programs by Aman Khurana.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-start gap-4">
                <Link
                  href="/auth/signup"
                  className="group rounded-full bg-purple px-8 py-3.5 text-sm font-bold uppercase tracking-wider text-white transition-all hover:bg-purple-dark hover:shadow-lg hover:shadow-purple/25"
                >
                  Start Your Journey
                  <ArrowRight className="inline-block size-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/services"
                  className="rounded-full border border-zinc-700 px-8 py-3.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
                >
                  View Programs
                </Link>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] as const }}
              className="order-1 lg:order-2 relative"
            >
              <div className="relative aspect-[3/4] max-w-sm mx-auto rounded-3xl overflow-hidden border border-zinc-800">
                <ImageWithFallback
                  src="/images/aman-contest-prep.png"
                  alt="Aman Khurana"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="absolute -bottom-4 -left-4 size-32 rounded-full bg-purple/10 blur-3xl" />
              <div className="absolute -top-4 -right-4 size-40 rounded-full bg-purple/5 blur-3xl" />
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
                className="rounded-2xl border border-purple/20 bg-zinc-900/50 p-4 sm:p-6 text-center"
              >
                <p className="font-heading text-3xl sm:text-5xl text-purple-light">{s.value}</p>
                <p className="text-xs sm:text-sm text-zinc-500 mt-2">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      <section className="px-4 py-20 border-t border-zinc-800">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-purple-light mb-2">
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
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden group hover:border-purple/30 transition-colors">
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
                      className="inline-flex items-center gap-1 mt-3 text-xs font-bold uppercase tracking-wider text-purple-light hover:text-purple transition-colors"
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
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-purple-light mb-2 text-center">
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
                className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
              >
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="size-4 fill-purple text-purple" />
                  ))}
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed mb-4">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-purple/20 flex items-center justify-center">
                    <span className="font-heading text-sm text-purple-light">
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
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-purple-light mb-2">
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
              className="inline-flex items-center gap-2 rounded-full bg-purple px-8 py-3.5 text-sm font-bold uppercase tracking-wider text-white transition-all hover:bg-purple-dark hover:shadow-lg hover:shadow-purple/25"
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
            className="flex items-center justify-center gap-2 rounded-full bg-purple py-3.5 text-sm font-bold uppercase tracking-wider text-white transition-all hover:bg-purple-dark"
          >
            Start Your Journey <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </PublicLayout>
  )
}
