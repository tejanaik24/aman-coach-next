"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Download, X, Smartphone } from "lucide-react"

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    // Register Service Worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(err => console.log("SW reg note:", err))
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowPrompt(true)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstall)
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall)
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === "accepted") {
      setShowPrompt(false)
    }
    setDeferredPrompt(null)
  }

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          className="fixed bottom-20 left-4 right-4 max-w-sm mx-auto z-50 bg-[#121212] border border-[#FF6A1A]/50 rounded-2xl p-4 shadow-[0_0_30px_rgba(255, 106, 26,0.25)] flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-[#FF6A1A]/20 border border-[#FF6A1A]/40 flex items-center justify-center text-[#FF6A1A] flex-shrink-0">
              <Smartphone className="size-6" />
            </div>
            <div>
              <h4 className="font-heading font-bold text-xs text-white">INSTALL AK COACH PWA</h4>
              <p className="text-[10px] text-zinc-400 mt-0.5">Add to Home Screen for fast offline access</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleInstallClick}
              className="px-3.5 py-2 rounded-full bg-[#FF6A1A] text-black text-[10px] font-bold uppercase tracking-wider shadow-md hover:bg-[#FF8540] cursor-pointer whitespace-nowrap"
            >
              Install
            </button>
            <button
              onClick={() => setShowPrompt(false)}
              className="size-7 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
