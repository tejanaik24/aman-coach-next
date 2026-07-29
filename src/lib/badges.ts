import { createClient } from "@supabase/supabase-js"
import { sendCoachSubmissionAlert } from "./whatsapp"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Badge = {
  id: string
  slug: string
  title: string
  description: string
  icon: string
  category: string
}

export type ClientBadge = {
  id: string
  clientId: string
  badgeId: string
  unlockedAt: string
  badge: Badge
}

export const DEFAULT_BADGES: Badge[] = [
  { id: "first_checkin", slug: "first-checkin", title: "First Check-in", description: "Submitted your first weekly check-in form", icon: "CheckCircle2", category: "milestone" },
  { id: "streak_4w", slug: "streak-4w", title: "4-Week Streak", description: "Completed 4 consecutive weekly check-ins", icon: "Flame", category: "streak" },
  { id: "streak_8w", slug: "streak-8w", title: "8-Week Streak", description: "Completed 8 consecutive weekly check-ins", icon: "Trophy", category: "streak" },
  { id: "streak_12w", slug: "streak-12w", title: "12-Week Master", description: "Completed 12 consecutive weekly check-ins", icon: "Crown", category: "streak" },
  { id: "weight_loss_5kg", slug: "weight-loss-5kg", title: "5kg Milestone", description: "Achieved your first 5kg weight loss", icon: "Scale", category: "progress" },
  { id: "workout_80", slug: "workout-80", title: "Iron Commitment", description: "Achieved 80%+ workout completion rate", icon: "Dumbbell", category: "performance" },
  { id: "diet_90", slug: "diet-90", title: "Nutrition Master", description: "Maintained 90%+ diet adherence", icon: "Utensils", category: "performance" },
  { id: "first_plan", slug: "first-plan", title: "Plan Activated", description: "Received your custom nutrition or workout plan", icon: "Sparkles", category: "milestone" },
]

/**
 * Fetch all badge definitions
 */
export async function getAllBadges(): Promise<Badge[]> {
  try {
    const { data } = await supabase.from("badges").select("*")
    if (data && data.length > 0) return data
  } catch (e) {
    console.warn("Using fallback badge definitions:", e)
  }
  return DEFAULT_BADGES
}

/**
 * Fetch unlocked badges for a client
 */
export async function getClientBadges(clientId: string): Promise<ClientBadge[]> {
  try {
    const { data } = await supabase
      .from("client_badges")
      .select("*, badge:badges(*)")
      .eq("client_id", clientId)

    if (data && data.length > 0) {
      return data.map((item: any) => ({
        id: item.id,
        clientId: item.client_id,
        badgeId: item.badge_id,
        unlockedAt: item.unlocked_at,
        badge: item.badge || DEFAULT_BADGES.find(b => b.id === item.badge_id) || DEFAULT_BADGES[0]
      }))
    }
  } catch (e) {
    console.warn("Client badges fetch fallback:", e)
  }
  return []
}

/**
 * Automatically check and unlock badges for a client based on progress data
 */
export async function checkAndUnlockBadges(clientId: string, clientName: string, data: {
  checkinCount?: number
  streakWeeks?: number
  weightLossKg?: number
  workoutRate?: number
  dietRate?: number
  hasPlan?: boolean
}): Promise<Badge[]> {
  const newUnlockedBadges: Badge[] = []
  const existingBadges = await getClientBadges(clientId)
  const existingIds = new Set(existingBadges.map(b => b.badgeId))

  const toCheck: { id: string; condition: boolean }[] = [
    { id: "first_checkin", condition: (data.checkinCount || 0) >= 1 },
    { id: "streak_4w", condition: (data.streakWeeks || 0) >= 4 },
    { id: "streak_8w", condition: (data.streakWeeks || 0) >= 8 },
    { id: "streak_12w", condition: (data.streakWeeks || 0) >= 12 },
    { id: "weight_loss_5kg", condition: (data.weightLossKg || 0) >= 5 },
    { id: "workout_80", condition: (data.workoutRate || 0) >= 80 },
    { id: "diet_90", condition: (data.dietRate || 0) >= 90 },
    { id: "first_plan", condition: !!data.hasPlan },
  ]

  for (const item of toCheck) {
    if (item.condition && !existingIds.has(item.id)) {
      const badgeObj = DEFAULT_BADGES.find(b => b.id === item.id)
      if (!badgeObj) continue

      try {
        await supabase.from("client_badges").insert({
          client_id: clientId,
          badge_id: item.id,
          unlocked_at: new Date().toISOString()
        })
      } catch (e) {
        console.warn(`Error inserting badge ${item.id}:`, e)
      }

      newUnlockedBadges.push(badgeObj)

      // Send WhatsApp Notification to Coach / Client placeholder
      const coachPhone = process.env.AMAN_WHATSAPP || "919815690656"
      sendCoachSubmissionAlert(coachPhone, clientName, `Badge Unlocked: 🏆 ${badgeObj.title}`)
        .catch(err => console.error("Badge WhatsApp alert note:", err))
    }
  }

  return newUnlockedBadges
}

/**
 * Canvas Gold Confetti Particle Animation
 */
export function fireBadgeUnlockConfetti() {
  const canvas = document.createElement("canvas")
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  canvas.style.position = "fixed"
  canvas.style.top = "0"
  canvas.style.left = "0"
  canvas.style.pointerEvents = "none"
  canvas.style.zIndex = "9999"
  document.body.appendChild(canvas)

  const ctx = canvas.getContext("2d")
  if (!ctx) return

  const goldColors = ["#FF6A1A", "#FF8540", "#FFF8DC", "#C2470A", "#FFA500"]
  const particles: { x: number; y: number; vx: number; vy: number; radius: number; color: string; alpha: number }[] = []

  for (let i = 0; i < 90; i++) {
    particles.push({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      vx: (Math.random() - 0.5) * 14,
      vy: (Math.random() - 0.8) * 16,
      radius: Math.random() * 6 + 3,
      color: goldColors[Math.floor(Math.random() * goldColors.length)],
      alpha: 1,
    })
  }

  let animationId: number
  const startTime = Date.now()

  function render() {
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    let active = false

    particles.forEach(p => {
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.35 // Gravity
      p.alpha -= 0.015

      if (p.alpha > 0) {
        active = true
        ctx.save()
        ctx.globalAlpha = Math.max(0, p.alpha)
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.shadowBlur = 10
        ctx.shadowColor = "#FF6A1A"
        ctx.fill()
        ctx.restore()
      }
    })

    if (active && Date.now() - startTime < 2500) {
      animationId = requestAnimationFrame(render)
    } else {
      cancelAnimationFrame(animationId)
      if (document.body.contains(canvas)) {
        document.body.removeChild(canvas)
      }
    }
  }

  render()
}
