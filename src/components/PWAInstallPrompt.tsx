"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "motion/react"
import { X } from "lucide-react"

declare global {
  interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
  }
}

function getInitialStandalone(): boolean {
  if (typeof window === "undefined") return true
  return window.matchMedia("(display-mode: standalone)").matches
}

function getInitialIOS(): boolean {
  if (typeof window === "undefined") return false
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
  const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent)
  return isSafari || isIOSDevice
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [show, setShow] = useState(false)
  const [isStandalone] = useState(getInitialStandalone)
  const [isIOS] = useState(getInitialIOS)

  useEffect(() => {
    if (typeof window === "undefined") return

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {})
    }

    if (isStandalone) return

    const dismissed = localStorage.getItem("pwa-dismissed")
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10)
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) return
      localStorage.removeItem("pwa-dismissed")
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener("beforeinstallprompt", handler)

    const timer = setTimeout(() => setShow(true), 30000)

    return () => {
      window.removeEventListener("beforeinstallprompt", handler)
      clearTimeout(timer)
    }
  }, [isStandalone])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === "accepted") setShow(false)
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    localStorage.setItem("pwa-dismissed", Date.now().toString())
    setShow(false)
  }

  return (
    <AnimatePresence>
      {show && !isStandalone && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-50"
        >
          <div className="mx-auto max-w-lg rounded-t-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <p className="font-heading text-lg text-white">Install AK Fitness App</p>
                <p className="mt-1 text-xs text-zinc-400">
                  Get the full app experience — works offline, instant access
                </p>
              </div>
              <button
                onClick={handleDismiss}
                className="rounded-full p-1 text-zinc-500 hover:bg-zinc-800 hover:text-white transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>
            {isIOS ? (
              <div className="rounded-xl bg-zinc-800/50 p-3">
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Tap <span className="font-medium text-white">Share</span>{" "}
                  <span className="text-zinc-500">→</span>{" "}
                  <span className="font-medium text-white">Add to Home Screen</span>
                </p>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleInstall}
                  className="flex-1 rounded-full bg-[#FFB800] py-3.5 text-sm font-bold uppercase tracking-wider text-white hover:bg-[#B28000] transition-colors"
                >
                  Install App
                </button>
                <button
                  onClick={handleDismiss}
                  className="rounded-full border border-zinc-700 px-6 py-3.5 text-sm font-medium text-zinc-400 hover:border-zinc-500 hover:text-white transition-colors"
                >
                  Not now
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
