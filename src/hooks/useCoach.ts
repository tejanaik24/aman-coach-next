"use client"

import { useEffect, useState, useRef } from "react"
import { useAuth } from "./useAuth"
import { getCoachClients, getCoachCheckins, getCoachPayments, getLeads } from "@/lib/store"
import { Client, Checkin, Payment, Lead, Analytics } from "@/types"

export function useCoachData() {
  const { user } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false)
      return
    }

    const cid: string = user.id
    async function load() {
      try {
        const [cl, ch, p, l] = await Promise.all([
          getCoachClients(cid),
          getCoachCheckins(cid),
          getCoachPayments(cid),
          getLeads(),
        ])
        setClients(cl)
        setCheckins(ch)
        setPayments(p)
        setLeads(l)

        const activeClients = cl.filter((c) => c.status === "active")
        const totalRevenue = p.reduce((sum, pay) => sum + pay.amount, 0)
        const thisMonth = new Date().getMonth()
        const monthlyRevenue = p
          .filter(
            (pay) =>
              new Date(pay.date).getMonth() === thisMonth &&
              pay.status === "completed"
          )
          .reduce((sum, pay) => sum + pay.amount, 0)

        const converted = l.filter((lead) => lead.status === "converted").length
        const conversionRate = l.length > 0 ? converted / l.length : 0
        const checkinRate =
          ch.length > 0
            ? ch.filter(
                (ck) => new Date(ck.date).getMonth() === thisMonth
              ).length / (activeClients.length || 1)
            : 0

        setAnalytics({
          totalClients: cl.length,
          activeClients: activeClients.length,
          totalRevenue,
          monthlyRevenue,
          newLeads: l.filter((lead) => lead.status === "new").length,
          conversionRate,
          checkinRate: Math.min(checkinRate, 1),
          revenueByMonth: [],
          clientGrowth: [],
        })
      } catch (err) {
        console.error("useCoachData error:", err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [user])

  return { clients, checkins, payments, leads, analytics, loading }
}
