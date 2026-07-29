"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { DEFAULT_BADGES, type Badge, type ClientBadge } from "@/lib/badges"
import {
  CheckCircle2, Flame, Trophy, Crown, Scale, Dumbbell, Utensils, Sparkles, Lock, X
} from "lucide-react"

const ICON_MAP: Record<string, any> = {
  CheckCircle2,
  Flame,
  Trophy,
  Crown,
  Scale,
  Dumbbell,
  Utensils,
  Sparkles
}

interface BadgesGridProps {
  unlockedBadges: ClientBadge[]
  title?: string
  showAll?: boolean
}

export default function BadgesGrid({ unlockedBadges, title = "Badges & Milestones", showAll = true }: BadgesGridProps) {
  const [activeBadge, setActiveBadge] = useState<{ badge: Badge; unlocked: boolean; unlockedAt?: string } | null>(null)

  const unlockedMap = new Map<string, ClientBadge>()
  unlockedBadges.forEach(b => unlockedMap.set(b.badgeId, b))

  const badgesToDisplay = showAll ? DEFAULT_BADGES : DEFAULT_BADGES.filter(b => unlockedMap.has(b.id))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold text-[#FF6A1A] uppercase tracking-widest block">Trophy Case</span>
          <h3 className="font-heading text-lg text-white tracking-wide mt-0.5">{title}</h3>
        </div>
        <span className="px-3 py-1 rounded-full bg-[#FF6A1A]/15 border border-[#FF6A1A]/30 text-xs text-[#FF6A1A] font-bold shadow-inner">
          {unlockedBadges.length} / {DEFAULT_BADGES.length} Unlocked
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {badgesToDisplay.map((badge, idx) => {
          const unlockedItem = unlockedMap.get(badge.id)
          const isUnlocked = !!unlockedItem
          const IconComponent = ICON_MAP[badge.icon] || Trophy

          return (
            <motion.div
              key={badge.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              whileHover={{ scale: 1.04, rotateX: 5, rotateY: 5 }}
              onClick={() => setActiveBadge({ badge, unlocked: isUnlocked, unlockedAt: unlockedItem?.unlockedAt })}
              className={`relative rounded-2xl p-4 border flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 overflow-hidden ${
                isUnlocked
                  ? "bg-gradient-to-b from-[#FF6A1A]/20 via-[#141418] to-[#0A0A0A] border-[#FF6A1A]/50 shadow-[0_10px_25px_rgba(255,106,26,0.18)]"
                  : "bg-[#121215]/80 border-white/5 opacity-50 hover:opacity-80"
              }`}
            >
              {/* Gold Shimmer Pass on Unlocked Badges */}
              {isUnlocked && <div className="absolute inset-0 orange-shimmer pointer-events-none opacity-40" />}

              {/* Lock Indicator */}
              {!isUnlocked && (
                <div className="absolute top-2.5 right-2.5 size-5 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
                  <Lock className="size-3" />
                </div>
              )}

              {/* Icon Container with Metallic Glow */}
              <div className={`size-13 rounded-2xl flex items-center justify-center mb-2.5 transition-transform ${
                isUnlocked
                  ? "bg-[#FF6A1A]/20 text-[#FF6A1A] border border-[#FF6A1A]/50 shadow-[0_0_20px_rgba(255,106,26,0.3)] scale-105"
                  : "bg-zinc-800/80 text-zinc-600 border border-zinc-700/50"
              }`}>
                <IconComponent className="size-6" />
              </div>

              {/* Title & Category */}
              <h4 className={`font-bold text-xs ${isUnlocked ? "text-white" : "text-zinc-400"}`}>
                {badge.title}
              </h4>
              <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-1">
                {badge.category}
              </p>

              {/* Unlocked tag */}
              {isUnlocked && (
                <span className="mt-2.5 text-[9px] font-bold text-[#FF6A1A] bg-[#FF6A1A]/15 px-2.5 py-0.5 rounded-full border border-[#FF6A1A]/30 shadow-sm">
                  Unlocked
                </span>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Badge Detail Modal */}
      <AnimatePresence>
        {activeBadge && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4"
            onClick={() => setActiveBadge(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl border border-[#FF6A1A]/40 bg-[#121215] p-6 text-center space-y-4 shadow-[0_0_50px_rgba(0,0,0,0.9)] relative overflow-hidden"
            >
              <div className="absolute -top-16 -left-16 radial-orange-ambient" />

              <button
                onClick={() => setActiveBadge(null)}
                className="absolute top-4 right-4 size-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <X className="size-4" />
              </button>

              <div className={`size-18 mx-auto rounded-3xl flex items-center justify-center ${
                activeBadge.unlocked ? "bg-[#FF6A1A]/20 text-[#FF6A1A] border border-[#FF6A1A]/60 shadow-[0_0_30px_rgba(255,106,26,0.4)]" : "bg-zinc-800/80 text-zinc-500"
              }`}>
                {(() => {
                  const Icon = ICON_MAP[activeBadge.badge.icon] || Trophy
                  return <Icon className="size-9" />
                })()}
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-[#FF6A1A] tracking-widest">{activeBadge.badge.category}</span>
                <h3 className="font-heading text-xl text-white mt-1">{activeBadge.badge.title}</h3>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed">{activeBadge.badge.description}</p>
              </div>

              {activeBadge.unlocked ? (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#FF6A1A]/20 to-[#FF6A1A]/5 border border-[#FF6A1A]/40 text-xs text-[#FF6A1A] font-semibold flex items-center justify-center gap-2">
                  <Trophy className="size-4 text-[#FF6A1A]" />
                  <span>Unlocked on {new Date(activeBadge.unlockedAt || Date.now()).toLocaleDateString("en-IN")}</span>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 flex items-center justify-center gap-2">
                  <Lock className="size-4 text-zinc-500" />
                  <span>Complete the objective to unlock this badge!</span>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
