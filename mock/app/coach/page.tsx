"use client";

import dynamic from "next/dynamic";
import GlassCard from "@/components/GlassCard";
import KineticText from "@/components/KineticText";
import CountUp from "@/components/CountUp";
import ScrollReveal from "@/components/ScrollReveal";
import MagneticButton from "@/components/MagneticButton";
import {
  Users,
  Clock,
  AlertTriangle,
  IndianRupee,
  Plus,
  Bell,
  ChevronRight,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Star,
  Activity,
} from "lucide-react";

const GradientMesh = dynamic(() => import("@/components/GradientMesh"), {
  ssr: false,
});
const ParticleField = dynamic(() => import("@/components/ParticleField"), {
  ssr: false,
});

const stats = [
  {
    icon: Users,
    label: "Active Clients",
    value: 23,
    change: "+3",
    up: true,
    color: "#FFB800",
  },
  {
    icon: Clock,
    label: "Pending Check-ins",
    value: 8,
    change: "+2",
    up: false,
    color: "#FF6B6B",
  },
  {
    icon: AlertTriangle,
    label: "Fees Due",
    value: 5,
    change: "₹24,995",
    up: false,
    color: "#FFB800",
  },
  {
    icon: IndianRupee,
    label: "Revenue",
    value: 0,
    prefix: "₹",
    displayValue: "1.2L",
    change: "+12%",
    up: true,
    color: "#00CC66",
  },
];

const attentionClients = [
  { name: "Priya Sharma", reason: "Missed 3 check-ins", urgency: "high" },
  { name: "Rahul Verma", reason: "Fee overdue by 5 days", urgency: "high" },
  { name: "Sneha Patel", reason: "No workout this week", urgency: "medium" },
];

const expiringPackages = [
  { name: "Vikram Singh", daysLeft: 3, package: "3 Month Pro" },
  { name: "Anjali Reddy", daysLeft: 5, package: "1 Month Basic" },
  { name: "Karthik Nair", daysLeft: 7, package: "6 Month Elite" },
];

const recentClients = [
  {
    name: "Tejas Kulkarni",
    package: "3 Month Pro",
    lastCheckin: "Today",
    streak: 12,
    avatar: "TK",
  },
  {
    name: "Meera Joshi",
    package: "1 Month Basic",
    lastCheckin: "Yesterday",
    streak: 5,
    avatar: "MJ",
  },
  {
    name: "Aditya Rao",
    package: "6 Month Elite",
    lastCheckin: "2 days ago",
    streak: 28,
    avatar: "AR",
  },
];

const revenueData = [
  30, 45, 35, 60, 50, 75, 65, 80, 70, 90, 85, 95,
];

export default function CoachDashboard() {
  return (
    <div className="min-h-screen relative">
      <GradientMesh />
      <ParticleField />

      <div className="relative z-10 px-5 pt-14 pb-28 max-w-lg mx-auto">
        {/* Hero */}
        <ScrollReveal delay={0}>
          <div className="mb-2">
            <p className="text-[#999999] text-sm font-medium tracking-wider uppercase mb-1">
              Coach Dashboard
            </p>
            <KineticText
              text="Aman"
              fontSize={52}
              delay={0.3}
              className="font-extrabold"
            />
            <div className="flex items-center gap-3 mt-3">
              <div className="w-2 h-2 rounded-full bg-[#00CC66] animate-pulse" />
              <span className="text-[#999999] text-sm">23 active clients</span>
              <span className="text-[rgba(255,255,255,0.2)]">|</span>
              <span className="text-[#FFB800] text-sm font-medium flex items-center gap-1">
                <Star size={12} /> Pro Coach
              </span>
            </div>
          </div>
        </ScrollReveal>

        {/* Stats Grid */}
        <ScrollReveal delay={0.1}>
          <div className="grid grid-cols-2 gap-3 mt-8">
            {stats.map((s, i) => (
              <GlassCard key={s.label} delay={0.15 + i * 0.08} tilt>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: `${s.color}15` }}
                    >
                      <s.icon size={20} style={{ color: s.color }} />
                    </div>
                    <span
                      className={`flex items-center gap-0.5 text-xs font-medium ${
                        s.up ? "text-[#00CC66]" : "text-[#FF6B6B]"
                      }`}
                    >
                      {s.up ? (
                        <ArrowUpRight size={12} />
                      ) : (
                        <ArrowDownRight size={12} />
                      )}
                      {s.change}
                    </span>
                  </div>
                  <p className="text-2xl font-extrabold">
                    {s.displayValue ? (
                      <span>{s.prefix || ""}{s.displayValue}</span>
                    ) : (
                      <CountUp
                        end={s.value}
                        prefix={s.prefix}
                        delay={0.3 + i * 0.1}
                      />
                    )}
                  </p>
                  <p className="text-[#999999] text-xs mt-1">{s.label}</p>
                </div>
              </GlassCard>
            ))}
          </div>
        </ScrollReveal>

        {/* Revenue Graph */}
        <ScrollReveal delay={0.3}>
          <GlassCard className="p-5 mt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-semibold">Revenue Trend</p>
                <p className="text-[#999999] text-xs">Last 12 months</p>
              </div>
              <span className="text-[#00CC66] text-xs font-medium flex items-center gap-1">
                <TrendingUp size={12} /> +18% YoY
              </span>
            </div>
            {/* SVG Line Chart */}
            <div className="relative h-40">
              <svg
                viewBox="0 0 400 150"
                className="w-full h-full"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FFB800" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#FFB800" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* Grid lines */}
                {[0, 1, 2, 3].map((i) => (
                  <line
                    key={i}
                    x1="0"
                    y1={i * 50}
                    x2="400"
                    y2={i * 50}
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="1"
                  />
                ))}
                {/* Area fill */}
                <path
                  d={`M ${revenueData
                    .map(
                      (v, i) =>
                        `${(i / (revenueData.length - 1)) * 400},${
                          150 - (v / 100) * 140
                        }`
                    )
                    .join(" L ")} L 400,150 L 0,150 Z`}
                  fill="url(#goldGrad)"
                  style={{
                    opacity: 0,
                    animation: "revealUp 1s ease-out 0.8s forwards",
                  }}
                />
                {/* Line */}
                <polyline
                  points={revenueData
                    .map(
                      (v, i) =>
                        `${(i / (revenueData.length - 1)) * 400},${
                          150 - (v / 100) * 140
                        }`
                    )
                    .join(" ")}
                  fill="none"
                  stroke="#FFB800"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    filter: "drop-shadow(0 0 8px rgba(255,184,0,0.4))",
                    strokeDasharray: 1200,
                    strokeDashoffset: 1200,
                    animation: "lineDraw 2s ease-out 0.6s forwards",
                  }}
                />
                {/* Data points */}
                {revenueData.map((v, i) => (
                  <circle
                    key={i}
                    cx={(i / (revenueData.length - 1)) * 400}
                    cy={150 - (v / 100) * 140}
                    r="3"
                    fill="#FFB800"
                    style={{
                      opacity: 0,
                      animation: `fadeIn 0.3s ease-out ${0.8 + i * 0.08}s forwards`,
                    }}
                  />
                ))}
              </svg>
            </div>
          </GlassCard>
        </ScrollReveal>

        {/* Needs Attention */}
        <ScrollReveal delay={0.35}>
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[#999999] uppercase tracking-wider">
                Needs Attention
              </h3>
              <span className="text-[#FF6B6B] text-xs font-medium bg-[rgba(255,107,107,0.1)] px-2 py-1 rounded-full">
                {attentionClients.length}
              </span>
            </div>
            <div className="space-y-3">
              {attentionClients.map((c, i) => (
                <GlassCard key={c.name} delay={0.4 + i * 0.08} className="p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-3 h-3 rounded-full shrink-0 ${
                        c.urgency === "high"
                          ? "bg-[#FF4444] animate-pulse"
                          : "bg-[#FFB800]"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{c.name}</p>
                      <p className="text-[#999999] text-xs">{c.reason}</p>
                    </div>
                    <MagneticButton strength={0.2}>
                      <div className="glass rounded-lg px-3 py-1.5 text-xs font-medium text-[#FFB800] cursor-pointer hover:bg-[rgba(255,184,0,0.1)] transition-colors">
                        Remind
                      </div>
                    </MagneticButton>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* Expiring Packages */}
        <ScrollReveal delay={0.4}>
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[#999999] uppercase tracking-wider">
                Expiring Soon
              </h3>
              <Calendar className="text-[#999999]" size={16} />
            </div>
            <div className="flex gap-3 overflow-x-auto pb-4 -mx-5 px-5">
              {expiringPackages.map((p, i) => (
                <GlassCard
                  key={p.name}
                  delay={0.45 + i * 0.08}
                  variant={p.daysLeft <= 3 ? "gold" : "default"}
                  className="p-4 min-w-[160px] shrink-0"
                >
                  <div className="text-center">
                    <p className="font-semibold text-sm">{p.name}</p>
                    <p className="text-[#999999] text-xs mt-1">{p.package}</p>
                    <div className="mt-3 flex items-center justify-center gap-1">
                      <Clock
                        size={14}
                        className={
                          p.daysLeft <= 3
                            ? "text-[#FF4444]"
                            : "text-[#FFB800]"
                        }
                      />
                      <span
                        className={`text-lg font-bold ${
                          p.daysLeft <= 3
                            ? "text-[#FF4444]"
                            : "text-[#FFB800]"
                        }`}
                      >
                        {p.daysLeft}
                      </span>
                      <span className="text-[#999999] text-xs">days</span>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* Quick Actions */}
        <ScrollReveal delay={0.45}>
          <div className="mt-6 flex gap-3">
            {[
              { icon: Plus, label: "Add Client", color: "#FFB800" },
              { icon: Bell, label: "Send Reminder", color: "#3DA3FF" },
              { icon: Users, label: "View All", color: "#00CC66" },
            ].map((action, i) => (
              <MagneticButton key={action.label} strength={0.15}>
                <GlassCard
                  delay={0.5 + i * 0.05}
                  className="flex-1 p-4 flex flex-col items-center gap-2 cursor-pointer hover:bg-[rgba(255,255,255,0.08)] transition-colors"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `${action.color}15` }}
                  >
                    <action.icon size={20} style={{ color: action.color }} />
                  </div>
                  <span className="text-xs font-medium text-[#CCCCCC]">
                    {action.label}
                  </span>
                </GlassCard>
              </MagneticButton>
            ))}
          </div>
        </ScrollReveal>

        {/* Recent Clients */}
        <ScrollReveal delay={0.5}>
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[#999999] uppercase tracking-wider">
                Recent Clients
              </h3>
              <span className="text-[#FFB800] text-xs font-medium flex items-center gap-1 cursor-pointer">
                View All <ChevronRight size={12} />
              </span>
            </div>
            <div className="space-y-3">
              {recentClients.map((c, i) => (
                <GlassCard
                  key={c.name}
                  delay={0.55 + i * 0.08}
                  tilt
                  className="p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FFB800] to-[#CC9300] flex items-center justify-center text-sm font-bold text-black shrink-0">
                      {c.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{c.name}</p>
                      <p className="text-[#999999] text-xs">{c.package}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-[#999999]">
                        Last: {c.lastCheckin}
                      </p>
                      <p className="text-xs text-[#FFB800] font-medium flex items-center gap-0.5 justify-end mt-0.5">
                        <Activity size={10} /> {c.streak} day streak
                      </p>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* Bottom Nav for Coach */}
        <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-6 px-4">
          <div className="glass-strong rounded-2xl px-6 py-3 flex items-center gap-6">
            {[
              { icon: "🏠", label: "Home", active: true },
              { icon: "👥", label: "Clients", active: false },
              { icon: "📊", label: "Reports", active: false },
              { icon: "⚙️", label: "Settings", active: false },
            ].map((item) => (
              <MagneticButton key={item.label} strength={0.2}>
                <div
                  className={`flex flex-col items-center gap-1 cursor-pointer transition-colors duration-300 ${
                    item.active ? "text-[#FFB800]" : "text-[#999999]"
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-[10px] font-medium">{item.label}</span>
                  {item.active && (
                    <div className="w-1 h-1 rounded-full bg-[#FFB800] mt-0.5 gold-glow" />
                  )}
                </div>
              </MagneticButton>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
