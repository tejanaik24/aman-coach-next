"use client"

import { useState, useEffect, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { X, Camera, Bell, MessageCircle, LogOut, Check, KeyRound } from "lucide-react"
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

  // Notifications On/Off (#21)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [togglingNotif, setTogglingNotif] = useState(false)

  // Coach Change Admin ID & Password (#20)
  const [showCredentials, setShowCredentials] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newLoginId, setNewLoginId] = useState("")
  const [confirmNewLoginId, setConfirmNewLoginId] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [credsError, setCredsError] = useState("")
  const [savingCreds, setSavingCreds] = useState(false)
  const [displayEmail, setDisplayEmail] = useState(email)

  useEffect(() => {
    setDisplayEmail(email)
  }, [email])

  useEffect(() => {
    if (!isOpen) return
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase
          .from("profiles")
          .select("notifications_enabled")
          .eq("id", user.id)
          .maybeSingle()
        if (data && typeof data.notifications_enabled === "boolean") {
          setNotificationsEnabled(data.notifications_enabled)
        }
      } catch {}
    })()
  }, [isOpen, supabase])

  function close() {
    setIsEditingName(false)
    setDraftName(name)
    setShowCredentials(false)
    setCurrentPassword("")
    setNewLoginId("")
    setConfirmNewLoginId("")
    setNewPassword("")
    setConfirmPassword("")
    setCredsError("")
    onClose()
  }

  async function handleToggleNotifications() {
    if (togglingNotif) return
    const nextVal = !notificationsEnabled
    setTogglingNotif(true)
    setNotificationsEnabled(nextVal)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not signed in")
      const { error } = await supabase
        .from("profiles")
        .update({ notifications_enabled: nextVal })
        .eq("id", user.id)
      if (error) throw error
      toast.success(nextVal ? "Notifications turned ON" : "Notifications turned OFF")
    } catch {
      setNotificationsEnabled(!nextVal)
      toast.error("Could not update notification setting")
    } finally {
      setTogglingNotif(false)
    }
  }

  async function handleSaveCredentials(e: FormEvent) {
    e.preventDefault()
    setCredsError("")
    if (!currentPassword) {
      setCredsError("Enter your current password")
      toast.error("Enter your current password")
      return
    }
    const trimmedLogin = newLoginId.trim()
    const trimmedConfirmLogin = confirmNewLoginId.trim()
    if (!trimmedLogin && !trimmedConfirmLogin && !newPassword) {
      setCredsError("Enter a new Admin ID email or a new password")
      toast.error("Enter a new Admin ID email or a new password")
      return
    }
    if (trimmedLogin || trimmedConfirmLogin) {
      if (!trimmedLogin || !trimmedConfirmLogin || trimmedLogin.toLowerCase() !== trimmedConfirmLogin.toLowerCase()) {
        setCredsError("The two emails do not match.")
        toast.error("The two emails do not match.")
        return
      }
    }
    if (newPassword) {
      if (newPassword.length < 6) {
        setCredsError("New password must be at least 6 characters")
        toast.error("New password must be at least 6 characters")
        return
      }
      if (newPassword !== confirmPassword) {
        setCredsError("New password and confirm password do not match")
        toast.error("New password and confirm password do not match")
        return
      }
    }
    setSavingCreds(true)
    try {
      const res = await fetch("/api/coach/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newLoginId: trimmedLogin,
          confirmNewLoginId: trimmedConfirmLogin,
          newPassword,
          confirmPassword,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const errMsg = data.error || "Could not update login credentials"
        setCredsError(errMsg)
        toast.error(errMsg)
        return
      }
      if (data.email) setDisplayEmail(data.email)
      setCurrentPassword("")
      setNewLoginId("")
      setConfirmNewLoginId("")
      setNewPassword("")
      setConfirmPassword("")
      setCredsError("")
      setShowCredentials(false)
      toast.success("Admin login credentials updated")
    } catch {
      setCredsError("Could not update login credentials")
      toast.error("Could not update login credentials")
    } finally {
      setSavingCreds(false)
    }
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
                    <img src={avatarUrl} alt={name} className="w-20 h-20 rounded-full object-cover border-2 border-accent-orange" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-bg-elevated flex items-center justify-center border-2 border-accent-orange">
                      <span className="text-accent-orange font-heading font-bold text-2xl">{initials}</span>
                    </div>
                  )}
                  <button
                    onClick={() => toast("Photo upload coming soon")}
                    className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-accent-orange border-2 border-bg-surface flex items-center justify-center cursor-pointer"
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
                      className="flex-1 bg-bg-elevated border-2 border-accent-orange rounded-xl px-3 py-2 text-sm font-heading font-bold text-text-primary text-center outline-none"
                    />
                    <button
                      onClick={handleSaveName}
                      disabled={isSaving}
                      className="w-9 h-9 rounded-full bg-accent-orange flex items-center justify-center flex-shrink-0 disabled:opacity-50 cursor-pointer"
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

                {displayEmail && <p className="text-xs text-text-muted">{displayEmail}</p>}
                <span className="text-[9px] font-bold text-accent-orange bg-accent-orange/10 border border-accent-orange/30 px-2.5 py-1 rounded-full uppercase tracking-wider">
                  {role === "coach" ? "Coach Account" : "Client Account"}
                </span>
              </div>

              {/* Menu options */}
              <div className="space-y-2.5 pb-6">
                {/* Notifications On/Off Toggle (#21) */}
                <button
                  type="button"
                  disabled={togglingNotif}
                  onClick={handleToggleNotifications}
                  className="w-full bg-bg-elevated border border-border-subtle rounded-2xl p-4 flex items-center justify-between gap-3 text-left cursor-pointer hover:border-accent-orange/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-bg-primary flex items-center justify-center flex-shrink-0">
                      <Bell className="size-4 text-accent-orange" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-text-primary block">Notifications</span>
                      <span className="text-[11px] text-text-muted block">
                        {notificationsEnabled ? "WhatsApp & Email alerts are ON" : "Notifications are turned OFF"}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                      notificationsEnabled
                        ? "bg-accent-orange text-bg-primary"
                        : "bg-white/10 text-text-muted"
                    }`}
                  >
                    {notificationsEnabled ? "ON" : "OFF"}
                  </span>
                </button>

                {/* Change Admin ID / Password (#20 - Coach only) */}
                {role === "coach" && (
                  <div className="bg-bg-elevated border border-border-subtle rounded-2xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowCredentials((v) => !v)}
                      className="w-full p-4 flex items-center justify-between gap-3 text-left cursor-pointer hover:border-accent-orange/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-bg-primary flex items-center justify-center flex-shrink-0">
                          <KeyRound className="size-4 text-accent-orange" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-text-primary block">Change Admin ID / Password</span>
                          <span className="text-[11px] text-text-muted block">Update login email or password</span>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-accent-orange">{showCredentials ? "Hide" : "Edit"}</span>
                    </button>

                    {showCredentials && (
                      <form onSubmit={handleSaveCredentials} className="px-4 pb-4 pt-2 border-t border-border-subtle/50 space-y-3">
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted block mb-1">
                            Current Password *
                          </label>
                          <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => { setCurrentPassword(e.target.value); setCredsError("") }}
                            placeholder="Required to verify it's you"
                            className="w-full h-10 rounded-xl bg-bg-primary border border-border-subtle px-3 text-xs text-text-primary outline-none focus:border-accent-orange"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted block mb-1">
                            New Admin ID (Email Address)
                          </label>
                          <input
                            type="email"
                            value={newLoginId}
                            onChange={(e) => { setNewLoginId(e.target.value); setCredsError("") }}
                            placeholder={displayEmail || "coach@amankhuranafitness.com"}
                            className="w-full h-10 rounded-xl bg-bg-primary border border-border-subtle px-3 text-xs text-text-primary outline-none focus:border-accent-orange"
                          />
                          <p className="text-[11px] font-semibold text-accent-orange mt-1">
                            You will log in with this email from now on. Double-check it.
                          </p>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted block mb-1">
                            Confirm new Admin ID (email)
                          </label>
                          <input
                            type="email"
                            value={confirmNewLoginId}
                            onChange={(e) => { setConfirmNewLoginId(e.target.value); setCredsError("") }}
                            placeholder="Re-enter new Admin ID email"
                            className="w-full h-10 rounded-xl bg-bg-primary border border-border-subtle px-3 text-xs text-text-primary outline-none focus:border-accent-orange"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted block mb-1">
                            New Password (leave blank to keep current)
                          </label>
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => { setNewPassword(e.target.value); setCredsError("") }}
                            placeholder="At least 6 characters"
                            className="w-full h-10 rounded-xl bg-bg-primary border border-border-subtle px-3 text-xs text-text-primary outline-none focus:border-accent-orange"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted block mb-1">
                            Confirm New Password
                          </label>
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => { setConfirmPassword(e.target.value); setCredsError("") }}
                            placeholder="Re-enter new password"
                            className="w-full h-10 rounded-xl bg-bg-primary border border-border-subtle px-3 text-xs text-text-primary outline-none focus:border-accent-orange"
                          />
                        </div>
                        {credsError && (
                          <p className="text-[11px] font-medium text-danger bg-danger/10 px-3 py-2 rounded-lg">
                            {credsError}
                          </p>
                        )}
                        <button
                          type="submit"
                          disabled={savingCreds || !currentPassword}
                          className="w-full h-10 rounded-xl bg-accent-orange text-bg-primary text-xs font-bold disabled:opacity-50 cursor-pointer"
                        >
                          {savingCreds ? "Saving…" : "Save Login Credentials"}
                        </button>
                      </form>
                    )}
                  </div>
                )}

                <a
                  href={`https://wa.me/${AMAN_WHATSAPP}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-bg-elevated border border-border-subtle rounded-2xl p-4 flex items-center gap-3 text-left cursor-pointer hover:border-accent-orange/40 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-bg-primary flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="size-4 text-accent-orange" />
                  </div>
                  <span className="text-xs font-bold text-text-primary flex-1">Contact Support</span>
                </a>

                <button
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="w-full bg-bg-elevated border border-accent-orange/30 rounded-2xl p-4 flex items-center gap-3 text-left disabled:opacity-60 cursor-pointer hover:bg-accent-orange/10 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-accent-orange flex items-center justify-center flex-shrink-0">
                    <LogOut className="size-4 text-bg-primary" />
                  </div>
                  <span className="text-xs font-bold text-accent-orange flex-1">
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
