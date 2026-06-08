"use client"

import Link from "next/link"
import { ClientLayout } from "@/components/layout/ClientLayout"
import { Card, CardTitle, CardContent } from "@/components/ui/card"
import { useAuth } from "@/hooks/useAuth"
import { useClientData } from "@/hooks/useClient"

export default function ClientDashboardPage() {
  const { user } = useAuth()
  const { client, checkins, payments } = useClientData()

  const lastCheckin = checkins[0]
  const latestPayment = payments[0]

  return (
    <ClientLayout>
      <div className="mb-6">
        <h1 className="font-heading text-3xl text-white">
          Hey, {user?.displayName?.split(" ")[0] || "there"}
        </h1>
        <p className="text-sm text-white/40">Here&apos;s your progress overview</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card>
          <CardTitle className="text-base">Weight</CardTitle>
          <CardContent>
            <p className="font-heading text-2xl text-white">
              {client?.weight ? `${client.weight} kg` : "--"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardTitle className="text-base">Goal</CardTitle>
          <CardContent>
            <p className="text-sm text-white/60 capitalize">
              {client?.goal?.replace("-", " ") || "Not set"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-4">
        <CardTitle className="text-base">Quick Actions</CardTitle>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/client/checkin"
              className="rounded-lg border border-white/10 px-4 py-3 text-center text-sm text-white/70 transition-colors hover:border-gold/30 hover:text-gold"
            >
              Check In
            </Link>
            <Link
              href="/client/workout"
              className="rounded-lg border border-white/10 px-4 py-3 text-center text-sm text-white/70 transition-colors hover:border-gold/30 hover:text-gold"
            >
              Workout
            </Link>
            <Link
              href="/client/diet"
              className="rounded-lg border border-white/10 px-4 py-3 text-center text-sm text-white/70 transition-colors hover:border-gold/30 hover:text-gold"
            >
              Diet Plan
            </Link>
            <Link
              href="/client/payments"
              className="rounded-lg border border-white/10 px-4 py-3 text-center text-sm text-white/70 transition-colors hover:border-gold/30 hover:text-gold"
            >
              Payments
            </Link>
          </div>
        </CardContent>
      </Card>

      {lastCheckin && (
        <Card className="mb-4">
          <CardTitle className="text-base">Last Check-in</CardTitle>
          <CardContent>
            <p className="text-xs text-white/40">
              {new Date(lastCheckin.date).toLocaleDateString("en-IN")}
            </p>
            {lastCheckin.adherence && (
              <p className="text-sm text-white/60 mt-1">
                Adherence: {lastCheckin.adherence}%
              </p>
            )}
            {lastCheckin.notes && (
              <p className="text-xs text-white/40 mt-1">{lastCheckin.notes}</p>
            )}
          </CardContent>
        </Card>
      )}

      {latestPayment && (
        <Card className="mb-4">
          <CardTitle className="text-base">Latest Payment</CardTitle>
          <CardContent>
            <p className="font-heading text-xl text-gold">
              ₹{latestPayment.amount.toLocaleString("en-IN")}
            </p>
            <p className="text-xs text-white/40">
              {new Date(latestPayment.date).toLocaleDateString("en-IN")} &middot;{" "}
              {latestPayment.status}
            </p>
          </CardContent>
        </Card>
      )}
    </ClientLayout>
  )
}
