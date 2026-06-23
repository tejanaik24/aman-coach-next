"use client"

import { ClientLayout } from "@/components/layout/ClientLayout"
import { useAuth } from "@/hooks/useAuth"
import { useClientData } from "@/hooks/useClient"
import { PageSkeleton } from "@/components/ui/skeleton"
import { motion } from "motion/react"
import { useState } from "react"
import { Settings, LogOut, Lock } from "lucide-react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"

import toast from "react-hot-toast"
import { changePassword } from "@/lib/auth"

export default function ProfilePage() {
  const { user, profile, logout } = useAuth()
  const { client, payments, loading } = useClientData()
  const router = useRouter()
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [changingPassword, setChangingPassword] = useState(false)

  const handleLogout = async () => {
    await logout()
    router.push("/")
  }

  if (loading) return <ClientLayout><PageSkeleton /></ClientLayout>

  const initials = profile?.displayName
    ?.split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "AK"

  return (
    <ClientLayout>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex flex-col items-center mb-8">
          <div className="size-20 rounded-full bg-[#FFB800]/20 flex items-center justify-center mb-4">
            <span className="font-heading text-3xl text-[#FFD200]">{initials}</span>
          </div>
          <h1 className="font-heading text-xl text-white">{profile?.displayName || user?.email}</h1>
          <p className="text-sm text-zinc-500">{user?.email}</p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 mb-4">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">Plan Details</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Plan</span>
              <span className="text-sm text-white font-medium capitalize">
                {client?.plan || "Not assigned"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Goal</span>
              <span className="text-sm text-white font-medium capitalize">
                {client?.goal?.replace("-", " ") || "Not set"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Start Date</span>
              <span className="text-sm text-white font-medium">
                {client?.startDate ? format(new Date(client.startDate), "MMM d, yyyy") : "—"}
              </span>
            </div>
          </div>
        </div>

        {payments.length > 0 && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 mb-4">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">Payment History</p>
            <div className="space-y-2">
              {payments.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-xl bg-zinc-800/50 px-3 py-2.5">
                  <div>
                    <p className="text-xs text-zinc-400">{p.plan || "Payment"}</p>
                    <p className="text-xs text-zinc-600">{format(new Date(p.date), "MMM d, yyyy")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-heading text-sm text-white">₹{p.amount.toLocaleString("en-IN")}</span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      p.status === "completed" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"
                    }`}>
                      {p.status === "completed" ? "Paid" : "Pending"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 mb-4">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">Settings</p>
          <div className="space-y-2">
            <button
              onClick={() => setShowPasswordModal(true)}
              className="w-full flex items-center gap-3 rounded-xl bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-300 hover:text-white transition-colors text-left"
            >
              <Lock className="size-4 text-zinc-500" />
              Change Password
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 rounded-xl bg-red-500/10 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/20 transition-colors text-left"
            >
              <LogOut className="size-4" />
              Logout
            </button>
          </div>
        </div>

        {showPasswordModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setShowPasswordModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
            >
              <p className="text-sm font-bold uppercase tracking-wider text-white mb-4">Change Password</p>
              <div className="space-y-3 mb-4">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#FFB800]"
                  placeholder="New password"
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#FFB800]"
                  placeholder="Confirm new password"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 rounded-full bg-zinc-800 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:bg-zinc-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!newPassword.trim() || newPassword.length < 6) {
                      toast.error("Password must be at least 6 characters")
                      return
                    }
                    if (newPassword !== confirmPassword) {
                      toast.error("Passwords don't match")
                      return
                    }
                    setChangingPassword(true)
                    try {
                      await changePassword(newPassword)
                      toast.success("Password changed successfully")
                      setShowPasswordModal(false)
                      setNewPassword("")
                      setConfirmPassword("")
                    } catch {
                      toast.error("Failed to change password")
                    } finally {
                      setChangingPassword(false)
                    }
                  }}
                  disabled={!newPassword.trim() || changingPassword}
                  className="flex-1 rounded-full bg-[#FFB800] py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#B28000] disabled:opacity-50 transition-colors"
                >
                  {changingPassword ? "Saving..." : "Save"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </ClientLayout>
  )
}
