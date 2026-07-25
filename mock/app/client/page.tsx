"use client";

import dynamic from "next/dynamic";
import GlassCard from "@/components/GlassCard";
import KineticText from "@/components/KineticText";
import CountUp from "@/components/CountUp";
import ScrollReveal from "@/components/ScrollReveal";
import ProgressRing from "@/components/ProgressRing";
import MagneticButton from "@/components/MagneticButton";
import BottomNav from "@/components/BottomNav";
import {
  Flame,
  Dumbbell,
  Salad,
  ClipboardCheck,
  TrendingUp,
  ArrowRight,
  ChevronRight,
  Zap,
  Clock,
  Star,
  Trophy,
} from "lucide-react";

const GradientMesh = dynamic(() => import("@/components/GradientMesh"), {
  ssr: false,
});
const ParticleField = dynamic(() => import("@/components/ParticleField"), {
  ssr: false,
});

const workouts = [
  { name: "Upper Body Power", exercises: 8, duration: "45 min", progress: 75 },
  { name: "HIIT Cardio Blast", exercises: 12, duration: "30 min", progress: 40 },
  { name: "Core & Flexibility", exercises: 6, duration: "25 min", progress: 0 },
  { name: "Leg Day Destroyer", exercises: 10, duration: "50 min", progress: 90 },
];

const quickActions = [
  { icon: Dumbbell, label: "Workouts", color: "#FFB800" },
  { icon: Salad, label: "Diet Plan", color: "#00CC66" },
  { icon: ClipboardCheck, label: "Check-in", color: "#3DA3FF" },
  { icon: TrendingUp, label: "Progress", color: "#FF6B6B" },
];

export default function ClientDashboard() {
  return (
    <div className="min-h-screen relative">
      <GradientMesh />
      <ParticleField />

      <div className="relative z-10 px-5 pt-14 pb-28 max-w-lg mx-auto">
        {/* Hero */}
        <ScrollReveal delay={0}>
          <div className="mb-2">
            <p className="text-[#999999] text-sm font-medium tracking-wider uppercase mb-1">
              Welcome back
            </p>
            <KineticText
              text="Tejas"
              fontSize={52}
              delay={0.3}
              className="font-extrabold"
            />
            <div className="flex items-center gap-2 mt-3">
              <div className="w-2 h-2 rounded-full bg-[#00CC66] animate-pulse" />
              <span className="text-[#999999] text-sm">Active today</span>
            </div>
          </div>
        </ScrollReveal>

        {/* Coach Card */}
        <ScrollReveal delay={0.1}>
          <GlassCard variant="strong" tilt className="p-4 mt-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#FFB800] to-[#CC9300] flex items-center justify-center text-xl font-bold text-black shrink-0">
                AK
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-base">Aman Khurana</p>
                <p className="text-[#999999] text-sm">Your Coach</p>
              </div>
              <MagneticButton>
                <div className="glass rounded-xl px-4 py-2 flex items-center gap-2 text-[#FFB800] text-sm font-medium cursor-pointer hover:bg-[rgba(255,184,0,0.1)] transition-colors">
                  Message
                  <ChevronRight size={14} />
                </div>
              </MagneticButton>
            </div>
          </GlassCard>
        </ScrollReveal>

        {/* Streak Counter */}
        <ScrollReveal delay={0.15}>
          <div className="mt-8 grid grid-cols-3 gap-3">
            <GlassCard variant="gold" className="p-4 text-center col-span-1">
              <div className="flex justify-center mb-2">
                <Flame className="text-[#FFB800]" size={28} />
              </div>
              <CountUp
                end={12}
                className="text-3xl font-extrabold text-[#FFB800] block gold-text-glow"
              />
              <p className="text-[#999999] text-xs mt-1">Day Streak</p>
            </GlassCard>
            <GlassCard className="p-4 text-center">
              <div className="flex justify-center mb-2">
                <Zap className="text-[#3DA3FF]" size={28} />
              </div>
              <CountUp
                end={47}
                className="text-3xl font-extrabold text-white block"
              />
              <p className="text-[#999999] text-xs mt-1">Workouts</p>
            </GlassCard>
            <GlassCard className="p-4 text-center">
              <div className="flex justify-center mb-2">
                <Clock className="text-[#00CC66]" size={28} />
              </div>
              <CountUp
                end={23}
                suffix="h"
                className="text-3xl font-extrabold text-white block"
              />
              <p className="text-[#999999] text-xs mt-1">Total Time</p>
            </GlassCard>
          </div>
        </ScrollReveal>

        {/* Fee Status */}
        <ScrollReveal delay={0.2}>
          <GlassCard variant="gold" className="p-4 mt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[rgba(255,184,0,0.15)] flex items-center justify-center">
                  <Star className="text-[#FFB800]" size={20} />
                </div>
                <div>
                  <p className="font-semibold text-sm">Gold Member</p>
                  <p className="text-[#999999] text-xs">Next payment: Aug 15</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[#FFB800] font-bold text-lg">₹4,999</p>
                <p className="text-[#00CC66] text-xs font-medium">Paid</p>
              </div>
            </div>
          </GlassCard>
        </ScrollReveal>

        {/* Quick Actions */}
        <ScrollReveal delay={0.25}>
          <h3 className="text-sm font-semibold text-[#999999] uppercase tracking-wider mt-8 mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-4 gap-3">
            {quickActions.map((action, i) => (
              <MagneticButton key={action.label} strength={0.15}>
                <GlassCard delay={0.3 + i * 0.05} className="p-4 flex flex-col items-center gap-3 cursor-pointer hover:bg-[rgba(255,255,255,0.08)] transition-colors">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: `${action.color}15` }}
                  >
                    <action.icon size={22} style={{ color: action.color }} />
                  </div>
                  <span className="text-xs font-medium text-[#CCCCCC]">
                    {action.label}
                  </span>
                </GlassCard>
              </MagneticButton>
            ))}
          </div>
        </ScrollReveal>

        {/* Today's Workout */}
        <ScrollReveal delay={0.3}>
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[#999999] uppercase tracking-wider">
                Today&apos;s Workout
              </h3>
              <span className="text-[#FFB800] text-xs font-medium flex items-center gap-1 cursor-pointer">
                View All <ArrowRight size={12} />
              </span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-4 -mx-5 px-5 scrollbar-hide">
              {workouts.map((w, i) => (
                <GlassCard
                  key={w.name}
                  tilt
                  delay={0.35 + i * 0.08}
                  className="p-4 min-w-[200px] shrink-0 cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <p className="font-semibold text-sm leading-tight pr-2">
                      {w.name}
                    </p>
                    <ProgressRing
                      progress={w.progress}
                      size={36}
                      strokeWidth={3}
                      delay={0.5 + i * 0.1}
                    />
                  </div>
                  <div className="flex items-center gap-3 text-[#999999] text-xs">
                    <span className="flex items-center gap-1">
                      <Dumbbell size={12} /> {w.exercises} exercises
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> {w.duration}
                    </span>
                  </div>
                  {w.progress > 0 && (
                    <div className="mt-3 h-1 rounded-full bg-[rgba(255,255,255,0.1)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#FFB800] to-[#CC9300]"
                        style={{
                          width: `${w.progress}%`,
                          transition: "width 1.5s cubic-bezier(0.16, 1, 0.3, 1)",
                        }}
                      />
                    </div>
                  )}
                </GlassCard>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* Weekly Goal */}
        <ScrollReveal delay={0.4}>
          <GlassCard className="p-5 mt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-semibold">Weekly Goal</p>
                <p className="text-[#999999] text-sm">4 of 5 workouts completed</p>
              </div>
              <ProgressRing progress={80} size={56} strokeWidth={4} delay={0.6} />
            </div>
            <div className="flex gap-2">
              {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day, i) => (
                <div
                  key={day}
                  className={`flex-1 h-8 rounded-lg flex items-center justify-center text-xs font-medium ${
                    i < 4
                      ? "bg-[#FFB800] text-black"
                      : "bg-[rgba(255,255,255,0.05)] text-[#999999]"
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>
          </GlassCard>
        </ScrollReveal>

        {/* Achievement Badge */}
        <ScrollReveal delay={0.45}>
          <GlassCard variant="gold" className="p-5 mt-6 text-center">
            <Trophy className="text-[#FFB800] mx-auto mb-3" size={36} />
            <p className="font-bold text-lg gold-text-glow">
              Consistency Champion
            </p>
            <p className="text-[#999999] text-sm mt-1">
              12 days in a row — keep going!
            </p>
          </GlassCard>
        </ScrollReveal>
      </div>

      <BottomNav />
    </div>
  );
}
