"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { X, Camera, Bell, MessageCircle, LogOut, Check } from "lucide-react"
import toast from "react-hot-toast"
import { createClient } from "@/lib/supabase/client"

interface Props {
  isOpen: boolean
  onClose: () => void
  name: string
  email: string | null
  avatarUrl: string | null
  role: "coach" | "client"
  onNameUpdated: (name: string) => void
}

const AMAN_WHATSAPP = "919815690656"

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
}

export default function ProfileMenu({ isOpen, onClose, name, email, avatarUrl, role, onNameUpdated }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [isEditingName, setIsEditingName] = useState(false)
  const [draftName, setDraftName] = useState(name)
  const [isSaving, setIsSaving] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  function close() {
    setIsEditingName(false)
    setDraftName(name)
    onClose()
  }

  async function handleSaveName() {
    if (!draftName.trim() || draftName.trim() === name) { setIsEditingName(false); return }
    setIsSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { error } = await supabase.from("profiles").update({ name: draftName.trim() }).eq("id", user.id)
      if (error) throw error
      onNameUpdated(draftName.trim())
      toast.success("Name updated")
      setIsEditingName(false)
    } catch {
      toast.error("Failed to update name")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleSignOut() {
    setIsSigningOut(true)
    try {
      await supabase.auth.signOut()
      router.replace("/login")
    } catch {
      toast.error("Failed to sign out")
      setIsSigningOut(false)
    }
  }

  const initials = getInitials(name)

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[90]"
            onClick={close}
          />
          {/* Bottom Sheet Drawer */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 350 }}
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-bg-surface border-t border-border-subtle rounded-t-3xl z-[100] max-h-[85vh] flex flex-col shadow-2xl"
          >
            {/* Grab Bar */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-12 h-1 rounded-full bg-text-muted/30" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 flex-shrink-0 border-b border-border-subtle/50">
              <h2 className="font-heading font-bold text-lg text-text-primary">Profile Settings</h2>
              <button onClick={close} className="w-8 h-8 rounded-full bg-bg-elevated flex items-center justify-center text-text-muted hover:text-white cursor-pointer">
                <X className="size-4" />
              </button>
            </div>

            {/* Inner Scrollable Body */}
            <div
              className="px-5 pt-4 pb-28 space-y-5 flex-1 overflow-y-auto"
              style={{ overflowY: "auto", WebkitOverflowScrolling: "touch" }}
            >
              {/* Avatar + identity */}
              <div className="flex flex-col items-center gap-3 py-2">
                <div className="relative">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={name} className="w-20 h-20 rounded-full object-cover border-2 border-accent-gold" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-bg-elevated flex items-center justify-center border-2 border-accent-gold">
                      <span className="text-accent-gold font-heading font-bold text-2xl">{initials}</span>
                    </div>
                  )}
                  <button
                    onClick={() => toast("Photo upload coming soon")}
                    className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-accent-gold border-2 border-bg-surface flex items-center justify-center cursor-pointer"
                    aria-label="Change photo"
                  >
                    <Camera className="size-3.5 text-bg-primary" />
                  </button>
                </div>

                {isEditingName ? (
                  <div className="flex items-center gap-2 w-full">
                    <input
                      type="text"
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      autoFocus
                      className="flex-1 bg-bg-elevated border-2 border-accent-gold rounded-xl px-3 py-2 text-sm font-heading font-bold text-text-primary text-center outline-none"
                    />
                    <button
                      onClick={handleSaveName}
                      disabled={isSaving}
                      className="w-9 h-9 rounded-full bg-accent-gold flex items-center justify-center flex-shrink-0 disabled:opacity-50 cursor-pointer"
                    >
                      <Check className="size-4 text-bg-primary" />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setIsEditingName(true)} className="text-center cursor-pointer">
                    <p className="font-heading font-bold text-lg text-text-primary">{name}</p>
                    <p className="text-[10px] text-text-muted font-semibold uppercase tracking-wide mt-0.5">Tap to edit name</p>
                  </button>
                )}

                {email && <p className="text-xs text-text-muted">{email}</p>}
                <span className="text-[9px] font-bold text-accent-gold bg-accent-gold/10 border border-accent-gold/30 px-2.5 py-1 rounded-full uppercase tracking-wider">
                  {role === "coach" ? "Coach Account" : "Client Account"}
                </span>
              </div>

              {/* Menu options */}
              <div className="space-y-2.5 pb-6">
                <button
                  onClick={() => toast("Notification settings coming soon")}
                  className="w-full bg-bg-elevated border border-border-subtle rounded-2xl p-4 flex items-center gap-3 text-left cursor-pointer hover:border-accent-gold/40 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-bg-primary flex items-center justify-center flex-shrink-0">
                    <Bell className="size-4 text-accent-gold" />
                  </div>
                  <span className="text-xs font-bold text-text-primary flex-1">Notification Settings</span>
                </button>

                <a
                  href={`https://wa.me/${AMAN_WHATSAPP}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-bg-elevated border border-border-subtle rounded-2xl p-4 flex items-center gap-3 text-left cursor-pointer hover:border-accent-gold/40 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-bg-primary flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="size-4 text-accent-gold" />
                  </div>
                  <span className="text-xs font-bold text-text-primary flex-1">Contact Support</span>
                </a>

                <button
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="w-full bg-bg-elevated border border-accent-gold/30 rounded-2xl p-4 flex items-center gap-3 text-left disabled:opacity-60 cursor-pointer hover:bg-accent-gold/10 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-accent-gold flex items-center justify-center flex-shrink-0">
                    <LogOut className="size-4 text-bg-primary" />
                  </div>
                  <span className="text-xs font-bold text-accent-gold flex-1">
                    {isSigningOut ? "Signing out..." : "Sign Out"}
                  </span>
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
