"use client"

import Link from "next/link"
import { PublicLayout } from "@/components/layout/PublicLayout"
import {
  HoverSlider,
  HoverSliderImage,
  HoverSliderImageWrap,
  TextStaggerHover,
} from "@/components/blocks/animated-slideshow"

const SLIDES = [
  { id: "slide-1", title: "CONTEST PREP", imageUrl: "/images/aman-contest-prep.png" },
  { id: "slide-2", title: "FAT LOSS", imageUrl: "/images/aman-fat-loss.png" },
  { id: "slide-3", title: "MUSCLE BUILDING", imageUrl: "/images/aman-muscle-building.png" },
  { id: "slide-4", title: "ANTENATAL & POSTNATAL", imageUrl: "/images/aman-antenatal.png" },
]

const stats = [
  { label: "Clients Transformed", value: "500+" },
  { label: "Years Experience", value: "10+" },
  { label: "Success Rate", value: "95%" },
  { label: "Programs", value: "8+" },
]

export default function HomePage() {
  return (
    <PublicLayout>
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center overflow-hidden px-4 py-20">
        <div className="absolute inset-0 bg-gradient-to-b from-gold/5 via-transparent to-black pointer-events-none" />
        <div className="relative z-10 text-center max-w-3xl">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-gold mb-4">
            Online Fitness Coaching
          </p>
          <h1 className="font-heading text-6xl sm:text-7xl md:text-8xl lg:text-9xl text-white leading-none tracking-tight">
            TRANSFORM YOUR
            <br />
            <span className="text-gold">BODY</span>
          </h1>
          <p className="mt-6 text-base sm:text-lg text-white/60 max-w-xl mx-auto">
            Expert coaching tailored to your goals. Contest prep, fat loss, muscle building,
            and antenatal & postnatal programs by Aman Khurana.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/signup"
              className="rounded-lg bg-gold px-8 py-3 text-base font-semibold text-black transition-opacity hover:opacity-90"
            >
              Start Your Journey
            </Link>
            <Link
              href="/services"
              className="rounded-lg border border-white/20 px-8 py-3 text-base font-medium text-white/80 transition-colors hover:border-white/40 hover:text-white"
            >
              View Programs
            </Link>
          </div>
        </div>
        <div className="relative z-10 mt-16 grid grid-cols-2 gap-4 sm:flex sm:gap-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="font-heading text-3xl sm:text-4xl text-gold">{s.value}</p>
              <p className="text-xs text-white/40 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold mb-2">
            / services
          </p>
          <h2 className="font-heading text-4xl sm:text-5xl text-white mb-10">
            WHAT WE OFFER
          </h2>
          <HoverSlider className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
            <div className="flex flex-wrap gap-4 lg:flex-col lg:gap-6">
              {SLIDES.map((slide, index) => (
                <TextStaggerHover
                  key={slide.title}
                  index={index}
                  className="cursor-pointer font-heading text-3xl sm:text-4xl lg:text-5xl text-white/30 hover:text-white transition-colors"
                  text={slide.title}
                />
              ))}
            </div>
            <HoverSliderImageWrap className="w-full max-w-lg aspect-[4/3] rounded-xl overflow-hidden">
              {SLIDES.map((slide, index) => (
                <HoverSliderImage
                  key={slide.id}
                  index={index}
                  imageUrl={slide.imageUrl}
                  src={slide.imageUrl}
                  alt={slide.title}
                  className="size-full object-cover"
                />
              ))}
            </HoverSliderImageWrap>
          </HoverSlider>
        </div>
      </section>

      <section className="px-4 py-20 border-t border-white/5">
        <div className="mx-auto max-w-6xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold mb-2">
            / why choose us
          </p>
          <h2 className="font-heading text-4xl sm:text-5xl text-white mb-12">
            WHY TRAIN WITH AMAN?
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { title: "PERSONALIZED", desc: "Every program is tailored to your body type, lifestyle, and goals. No cookie-cutter plans." },
              { title: "SCIENTIFIC", desc: "Evidence-based training and nutrition protocols updated with the latest sports science research." },
              { title: "ACCOUNTABLE", desc: "Daily check-ins, weekly progress tracking, and constant support to keep you on track." },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-left">
                <p className="font-heading text-lg text-gold mb-2">{item.title}</p>
                <p className="text-sm text-white/50">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-20 border-t border-white/5">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold mb-2">
            / get started
          </p>
          <h2 className="font-heading text-4xl sm:text-5xl text-white mb-6">
            READY TO TRANSFORM?
          </h2>
          <p className="text-base text-white/60 mb-8">
            Book a free consultation call to discuss your goals and find the perfect program for you.
          </p>
          <Link
            href="/contact"
            className="inline-block rounded-lg bg-gold px-8 py-3 text-base font-semibold text-black transition-opacity hover:opacity-90"
          >
            Book Free Call
          </Link>
        </div>
      </section>
    </PublicLayout>
  )
}
