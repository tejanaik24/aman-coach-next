import { createClient } from "@supabase/supabase-js"
import { sendWhatsAppText } from "./whatsapp"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Availability = {
  id: string
  coachId: string
  dayOfWeek: number // 0..6
  startTime: string // "09:00"
  endTime: string // "18:00"
  slotDurationMins: number
  isActive: boolean
}

export type Booking = {
  id: string
  clientId: string
  coachId: string
  bookingDate: string // "YYYY-MM-DD"
  startTime: string
  endTime: string
  status: "confirmed" | "completed" | "cancelled"
  notes?: string
  clientName?: string
  clientPhone?: string
  createdAt: string
}

/**
 * Fetch availability config for a coach
 */
export async function getCoachAvailability(coachId?: string): Promise<Availability[]> {
  try {
    let query = supabase.from("availability").select("*").eq("is_active", true)
    if (coachId) query = query.eq("coach_id", coachId)

    const { data } = await query
    if (data && data.length > 0) {
      return data.map((item: any) => ({
        id: item.id,
        coachId: item.coach_id,
        dayOfWeek: item.day_of_week,
        startTime: item.start_time,
        endTime: item.end_time,
        slotDurationMins: item.slot_duration_mins,
        isActive: item.is_active
      }))
    }
  } catch (e) {
    console.warn("Availability fetch note:", e)
  }

  // Default fallback: Mon-Sat 09:00 to 18:00
  return [1, 2, 3, 4, 5, 6].map(day => ({
    id: `default-${day}`,
    coachId: coachId || "default",
    dayOfWeek: day,
    startTime: "09:00",
    endTime: "18:00",
    slotDurationMins: 30,
    isActive: true
  }))
}

/**
 * Generate 30-min available time slots for a given date
 */
export async function getAvailableTimeSlots(dateStr: string, coachId?: string): Promise<{ time: string; endTime: string; available: boolean }[]> {
  const dateObj = new Date(dateStr)
  const dayOfWeek = dateObj.getDay()

  const availList = await getCoachAvailability(coachId)
  const dayConfig = availList.find(a => a.dayOfWeek === dayOfWeek && a.isActive)

  if (!dayConfig) return []

  // Fetch existing bookings for that date
  const { data: existingBookings } = await supabase
    .from("bookings")
    .select("start_time")
    .eq("booking_date", dateStr)
    .neq("status", "cancelled")

  const bookedTimes = new Set((existingBookings || []).map((b: any) => b.start_time.slice(0, 5)))

  const slots = []
  const startHour = parseInt(dayConfig.startTime.split(":")[0], 10)
  const endHour = parseInt(dayConfig.endTime.split(":")[0], 10)

  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m < 60; m += dayConfig.slotDurationMins) {
      const time = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
      const endM = m + dayConfig.slotDurationMins
      const endH = endM >= 60 ? h + 1 : h
      const endTime = `${endH.toString().padStart(2, "0")}:${(endM % 60).toString().padStart(2, "0")}`

      slots.push({
        time,
        endTime,
        available: !bookedTimes.has(time)
      })
    }
  }

  return slots
}

/**
 * Create a new call booking
 */
export async function createBooking(data: {
  clientId: string
  coachId: string
  bookingDate: string
  startTime: string
  endTime: string
  notes?: string
  clientName?: string
  clientPhone?: string
}): Promise<{ success: boolean; bookingId?: string; error?: string }> {
  try {
    const { data: inserted, error } = await supabase
      .from("bookings")
      .insert({
        client_id: data.clientId,
        coach_id: data.coachId,
        booking_date: data.bookingDate,
        start_time: data.startTime,
        end_time: data.endTime,
        status: "confirmed",
        notes: data.notes || null,
        created_at: new Date().toISOString()
      })
      .select("id")
      .single()

    if (error) return { success: false, error: error.message }

    // WhatsApp Confirmation to Coach & Client
    const coachPhone = process.env.AMAN_WHATSAPP || "919815690656"
    const bookingMsg = `📅 *NEW CALL BOOKED*\n\n` +
      `👤 Client: *${data.clientName || "Client"}*\n` +
      `📆 Date: *${data.bookingDate}*\n` +
      `⏰ Time: *${data.startTime} - ${data.endTime}*\n` +
      `📝 Note: ${data.notes || "None"}\n\n` +
      `View in Coach Schedule: https://aman-coach-next.vercel.app/coach/schedule`

    sendWhatsAppText(coachPhone, bookingMsg).catch(e => console.error("Booking WA alert note:", e))

    if (data.clientPhone) {
      const clientMsg = `✅ *CALL CONFIRMED WITH COACH AMAN*\n\n` +
        `Hi ${data.clientName || "there"},\n` +
        `Your 1-on-1 coaching call is booked for *${data.bookingDate}* at *${data.startTime}*.\n\n` +
        `Please be ready 5 mins before the call!`
      sendWhatsAppText(data.clientPhone, clientMsg).catch(e => console.error("Client WA booking note:", e))
    }

    return { success: true, bookingId: inserted.id }
  } catch (err: any) {
    return { success: false, error: err.message || String(err) }
  }
}

/**
 * Fetch bookings for a client
 */
export async function getClientBookings(clientId: string): Promise<Booking[]> {
  try {
    const { data } = await supabase
      .from("bookings")
      .select("*")
      .eq("client_id", clientId)
      .order("booking_date", { ascending: true })

    if (data) {
      return data.map((b: any) => ({
        id: b.id,
        clientId: b.client_id,
        coachId: b.coach_id,
        bookingDate: b.booking_date,
        startTime: b.start_time.slice(0, 5),
        endTime: b.end_time.slice(0, 5),
        status: b.status,
        notes: b.notes,
        createdAt: b.created_at
      }))
    }
  } catch (e) {
    console.warn("Client bookings fetch note:", e)
  }
  return []
}

/**
 * Fetch all bookings for coach schedule
 */
export async function getCoachBookings(coachId: string): Promise<Booking[]> {
  try {
    const { data, error } = await supabase
      .from("bookings")
      .select("*, clients(id, user_id, profiles!user_id(name, phone))")
      .eq("coach_id", coachId)
      .order("booking_date", { ascending: true })
    if (error) console.error("getCoachBookings failed:", error.message)

    if (data) {
      return data.map((b: any) => {
        const clientProfile = b.clients?.profiles as any
        return {
          id: b.id,
          clientId: b.client_id,
          coachId: b.coach_id,
          bookingDate: b.booking_date,
          startTime: b.start_time.slice(0, 5),
          endTime: b.end_time.slice(0, 5),
          status: b.status,
          notes: b.notes,
          clientName: clientProfile?.name || "Client",
          clientPhone: clientProfile?.phone || "",
          createdAt: b.created_at
        }
      })
    }
  } catch (e) {
    console.warn("Coach bookings fetch note:", e)
  }
  return []
}
