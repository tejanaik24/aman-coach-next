"use client"

import { useState, useRef, useLayoutEffect, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { gsap } from "gsap"
import { createClient } from "@/lib/supabase/client"
import { EASE, DURATION, STAGGER } from "@/lib/animations"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const heroPhotoRef = useRef<HTMLDivElement>(null)
  const goldTextRef = useRef<HTMLDivElement>(null)
  const formCardRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      // Ken Burns slow zoom on hero photo
      gsap.fromTo(
        heroPhotoRef.current,
        { scale: 1.15 },
        { scale: 1, duration: DURATION.kenBurns, ease: "none" }
      )

      const tl = gsap.timeline({ defaults: { ease: EASE.smooth } })
      tl.fromTo(
        goldTextRef.current?.querySelectorAll(".reveal-line") ?? [],
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: DURATION.base, stagger: STAGGER.base }
      ).fromTo(
        formCardRef.current,
        { yPercent: 8, opacity: 0 },
        { yPercent: 0, opacity: 1, duration: DURATION.slow, ease: EASE.smooth },
        "-=0.4"
      ).fromTo(
        formCardRef.current?.querySelectorAll(".field-stagger") ?? [],
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: DURATION.fast, stagger: STAGGER.tight },
        "-=0.6"
      )
    })
    return () => ctx.revert()
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError("")
    if (!email.trim() || !password) { setError("Enter email and password"); return }
    setLoading(true)
    try {
      const supabase = createClient()
      const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (err) { setError(err.message); return }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError("Login failed. Try again."); return }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, must_reset_password")
        .eq("id", user.id)
        .single()

      if (profile?.must_reset_password) { router.replace("/reset-password"); return }
      const role = profile?.role
      if (role === "coach") router.replace("/dashboard")
      else if (role === "client") router.replace("/home")
      else router.replace("/onboarding")
    } catch {
      setError("Login failed. Try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex flex-col h-dvh bg-bg-primary overflow-hidden">
      {/* Full-bleed hero photo */}
      <div className="absolute inset-0 h-[42%] overflow-hidden">
        <div ref={heroPhotoRef} className="relative w-full h-full">
          <Image
            src="/images/aman/aman-01.jpeg"
            alt=""
            fill
            priority
            className="object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-bg-primary" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-transparent to-transparent" />
      </div>

      {/* Gold reveal headline over hero */}
      <div ref={goldTextRef} className="relative z-10 px-6 pt-14 shrink-0">
        <div className="overflow-hidden">
          <p className="reveal-line text-[11px] font-semibold uppercase tracking-[0.25em] text-accent-orange">
            AK Fitness Coach
          </p>
        </div>
        <div className="overflow-hidden mt-2">
          <h1 className="reveal-line font-heading font-bold text-3xl text-text-primary leading-tight">
            Welcome Back,
          </h1>
        </div>
        <div className="overflow-hidden">
          <h1 className="reveal-line font-heading font-bold text-3xl text-accent-orange leading-tight">
            Champion.
          </h1>
        </div>
      </div>

      {/* Form card — fills remaining viewport height, flush to bottom */}
      <div className="relative z-10 flex-1 px-4 min-h-0">
        <div
          ref={formCardRef}
          className="h-full flex flex-col rounded-t-[28px] border-t border-x border-border-subtle bg-bg-surface/90 backdrop-blur-xl p-6 pt-8 space-y-5 shadow-[0_0_40px_rgba(255, 106, 26,0.06)]"
          style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
        >
          <div className="field-stagger space-y-1">
            <p className="text-xs text-text-muted">Log in to check progress, diet, and training.</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="field-stagger flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                Email Address
              </label>
              <input
                type="email"
                placeholder="e.g. client@akfitness.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError("") }}
                className="w-full bg-bg-elevated border border-border-subtle focus:border-accent-orange rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted transition-colors outline-none"
                autoFocus
                required
              />
            </div>

            <div className="field-stagger flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError("") }}
                className="w-full bg-bg-elevated border border-border-subtle focus:border-accent-orange rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted transition-colors outline-none"
                required
              />
              {error && (
                <p className="text-[11px] font-medium text-danger bg-danger/10 px-3 py-2 rounded-lg mt-1">
                  {error}
                </p>
              )}
            </div>

            <div className="field-stagger pt-1">
              <button
                type="submit"
                disabled={loading || !email.trim() || !password}
                className="w-full bg-accent-orange text-bg-primary font-heading font-bold text-sm py-4 rounded-full transition-transform active:scale-[0.98] disabled:opacity-50 flex items-center justify-center"
              >
                {loading
                  ? <div className="w-4 h-4 border-2 border-bg-primary/30 border-t-bg-primary rounded-full animate-spin" />
                  : "Sign In"}
              </button>
            </div>
          </form>

          <p className="field-stagger text-center text-[10px] text-text-muted">
            Premium Fitness Coaching PWA. Designed for results.
          </p>
        </div>
      </div>
    </div>
  )
}
