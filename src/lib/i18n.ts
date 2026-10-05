"use client"

import { useCallback, useSyncExternalStore } from "react"

// Client app wording in simple English or Hinglish (Hindi in English letters).
// Hinglish wording is a first draft for Aman to check.
export type Lang = "en" | "hi"

const DICT = {
  greetingMorning: { en: "Good morning", hi: "Suprabhat" },
  greetingAfternoon: { en: "Good afternoon", hi: "Namaste" },
  greetingEvening: { en: "Good evening", hi: "Shubh sandhya" },
  welcome: { en: "Welcome", hi: "Swagat hai" },
  workout: { en: "Today's workout", hi: "Aaj ka workout" },
  workoutSub: { en: "Your training plan", hi: "Aapka training plan" },
  food: { en: "Today's food", hi: "Aaj ka khana" },
  foodSub: { en: "Your diet plan", hi: "Aapka diet plan" },
  checkin: { en: "Weekly check-in", hi: "Weekly check-in" },
  checkinSub: { en: "Takes about 3 minutes", hi: "Sirf 3 minute lagte hain" },
  messageFromAman: { en: "Message from Aman", hi: "Aman ka sandesh" },
  feeDue: { en: "Fee due", hi: "Fees baaki hai" },
  by: { en: "by", hi: "tak" },
  messageAman: { en: "Message Aman", hi: "Aman ko message karein" },
  more: { en: "More: progress, badges, payments", hi: "Aur dekhein: progress, badges, payments" },
  navHome: { en: "Home", hi: "Home" },
  navWorkout: { en: "Workout", hi: "Workout" },
  navDiet: { en: "Diet", hi: "Khana" },
  navProgress: { en: "Progress", hi: "Progress" },
  navCheckin: { en: "Check-in", hi: "Check-in" },
  langButton: { en: "हिंदी", hi: "English" },
} as const

export type TKey = keyof typeof DICT

const KEY = "ak_lang"
const listeners = new Set<() => void>()

function read(): Lang {
  try {
    return localStorage.getItem(KEY) === "hi" ? "hi" : "en"
  } catch {
    return "en"
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}

export function useLang() {
  const lang = useSyncExternalStore(subscribe, read, () => "en" as Lang)
  const t = useCallback((k: TKey) => DICT[k][lang], [lang])
  const toggle = useCallback(() => {
    try {
      localStorage.setItem(KEY, read() === "hi" ? "en" : "hi")
    } catch {
      // private mode: language just won't be remembered
    }
    listeners.forEach((l) => l())
  }, [])
  return { lang, t, toggle }
}
