"use client"

import { useState } from "react"
import { ClientLayout } from "@/components/layout/ClientLayout"
import { Card, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PageSkeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/hooks/useAuth"
import { useClientData } from "@/hooks/useClient"
import { addPayment } from "@/lib/firestore"
import { generateUpiLink } from "@/lib/upi"
import toast from "react-hot-toast"

const plans = [
  { name: "Basic", amount: 5000 },
  { name: "Premium", amount: 8000 },
  { name: "Elite", amount: 15000 },
]

export default function PaymentsPage() {
  const { user } = useAuth()
  const { payments, loading } = useClientData()
  const [selected, setSelected] = useState<string | null>(null)

  const handlePay = async (plan: string, amount: number) => {
    if (!user?.uid) return
    setSelected(plan)
    try {
      await addPayment({
        clientId: user.uid,
        coachId: "",
        amount,
        currency: "INR",
        method: "upi",
        status: "pending",
        plan,
        month: new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
        date: new Date(),
      })
      const upiLink = generateUpiLink(amount, `Payment for ${plan} - ${new Date().toLocaleDateString("en-IN", { month: "long" })}`)
      window.open(upiLink, "_self")
    } catch {
      toast.error("Failed to initiate payment")
    } finally {
      setSelected(null)
    }
  }

  if (loading) return <ClientLayout><PageSkeleton /></ClientLayout>

  return (
    <ClientLayout>
      <h1 className="font-heading text-3xl text-white mb-6">PAYMENTS</h1>

      <h2 className="font-heading text-xl text-gold mb-3">Make a Payment</h2>
      <div className="grid gap-3 mb-8">
        {plans.map((p) => (
          <Card key={p.name}>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">{p.name}</CardTitle>
                <p className="font-heading text-xl text-white mt-1">
                  ₹{p.amount.toLocaleString("en-IN")}
                </p>
              </div>
              <button
                onClick={() => handlePay(p.name, p.amount)}
                disabled={selected === p.name}
                className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {selected === p.name ? "Opening..." : "Pay Now"}
              </button>
            </div>
          </Card>
        ))}
      </div>

      <h2 className="font-heading text-xl text-gold mb-3">Payment History</h2>
      {payments.length > 0 ? (
        <div className="space-y-2">
          {payments.slice(0, 10).map((p) => (
            <Card key={p.id}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/70">
                    {p.plan} -{" "}
                    {new Date(p.date).toLocaleDateString("en-IN", {
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  <p className="font-heading text-lg text-gold mt-0.5">
                    ₹{p.amount.toLocaleString("en-IN")}
                  </p>
                </div>
                <Badge
                  variant={
                    p.status === "completed"
                      ? "success"
                      : p.status === "failed"
                        ? "danger"
                        : "warning"
                  }
                >
                  {p.status}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent>
            <p className="text-sm text-white/40 text-center py-8">
              No payments yet.
            </p>
          </CardContent>
        </Card>
      )}
    </ClientLayout>
  )
}
