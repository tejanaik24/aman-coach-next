import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore"
import firebase from "./firebase"
import {
  Client,
  Checkin,
  Payment,
  Lead,
  Message,
  WorkoutPlan,
  DietPlan,
  Notification,
} from "@/types"

const { db } = firebase

function ensureDb() {
  if (!db) throw new Error("Firebase not initialized. Check your config.")
  return db
}

function fromFirestore<T>(data: Record<string, unknown>): T {
  return Object.entries(data).reduce((acc, [key, value]) => {
    if (value instanceof Timestamp) {
      return { ...acc, [key]: value.toDate() }
    }
    return { ...acc, [key]: value }
  }, {} as T)
}

export async function getClientProfile(uid: string): Promise<Client | null> {
  const d = ensureDb()
  const snap = await getDoc(doc(d, "clients", uid))
  if (!snap.exists()) return null
  return { ...fromFirestore<Client>(snap.data() as Record<string, unknown>), uid: snap.id }
}

export async function getCoachClients(coachId: string): Promise<Client[]> {
  const d = ensureDb()
  const q = query(
    collection(d, "clients"),
    where("coachId", "==", coachId),
    orderBy("createdAt", "desc")
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({
    ...fromFirestore<Client>(d.data() as Record<string, unknown>),
    uid: d.id,
  }))
}

export async function getCheckins(
  clientId: string,
  max = 20
): Promise<Checkin[]> {
  const d = ensureDb()
  const q = query(
    collection(d, "checkins"),
    where("clientId", "==", clientId),
    orderBy("date", "desc"),
    limit(max)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({
    ...fromFirestore<Checkin>(d.data() as Record<string, unknown>),
    id: d.id,
  }))
}

export async function addCheckin(data: Omit<Checkin, "id" | "createdAt">) {
  const d = ensureDb()
  return addDoc(collection(d, "checkins"), {
    ...data,
    date: Timestamp.fromDate(data.date),
    createdAt: serverTimestamp(),
  })
}

export async function getPayments(
  clientId: string,
  max = 20
): Promise<Payment[]> {
  const d = ensureDb()
  const q = query(
    collection(d, "payments"),
    where("clientId", "==", clientId),
    orderBy("date", "desc"),
    limit(max)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({
    ...fromFirestore<Payment>(d.data() as Record<string, unknown>),
    id: d.id,
  }))
}

export async function addPayment(data: Omit<Payment, "id" | "createdAt">) {
  const d = ensureDb()
  return addDoc(collection(d, "payments"), {
    ...data,
    date: Timestamp.fromDate(data.date),
    createdAt: serverTimestamp(),
  })
}

export async function getLeads(status?: Lead["status"]): Promise<Lead[]> {
  const d = ensureDb()
  let q
  if (status) {
    q = query(
      collection(d, "leads"),
      where("status", "==", status),
      orderBy("createdAt", "desc")
    )
  } else {
    q = query(collection(d, "leads"), orderBy("createdAt", "desc"))
  }
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({
    ...fromFirestore<Lead>(d.data() as Record<string, unknown>),
    id: d.id,
  }))
}

export async function addLead(data: Omit<Lead, "id" | "createdAt" | "updatedAt">) {
  const d = ensureDb()
  return addDoc(collection(d, "leads"), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function updateLeadStatus(id: string, status: Lead["status"]) {
  const d = ensureDb()
  return updateDoc(doc(d, "leads", id), { status, updatedAt: serverTimestamp() })
}

export async function sendMessage(data: Omit<Message, "id" | "createdAt">) {
  const d = ensureDb()
  return addDoc(collection(d, "messages"), {
    ...data,
    createdAt: serverTimestamp(),
  })
}

export async function getMessages(
  userId1: string,
  userId2: string,
  max = 50
): Promise<Message[]> {
  const d = ensureDb()
  const q = query(
    collection(d, "messages"),
    where("senderId", "in", [userId1, userId2]),
    orderBy("createdAt", "desc"),
    limit(max)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({
    ...fromFirestore<Message>(d.data() as Record<string, unknown>),
    id: d.id,
  }))
}

export async function getWorkoutPlan(
  clientId: string
): Promise<WorkoutPlan | null> {
  const d = ensureDb()
  const q = query(
    collection(d, "workoutPlans"),
    where("clientId", "==", clientId),
    orderBy("createdAt", "desc"),
    limit(1)
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  const docSnap = snap.docs[0]
  return { ...fromFirestore<WorkoutPlan>(docSnap.data() as Record<string, unknown>), id: docSnap.id }
}

export async function saveWorkoutPlan(data: Omit<WorkoutPlan, "id" | "createdAt" | "updatedAt">) {
  const d = ensureDb()
  return addDoc(collection(d, "workoutPlans"), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function getDietPlan(clientId: string): Promise<DietPlan | null> {
  const d = ensureDb()
  const q = query(
    collection(d, "dietPlans"),
    where("clientId", "==", clientId),
    orderBy("createdAt", "desc"),
    limit(1)
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  const docSnap = snap.docs[0]
  return { ...fromFirestore<DietPlan>(docSnap.data() as Record<string, unknown>), id: docSnap.id }
}

export async function saveDietPlan(data: Omit<DietPlan, "id" | "createdAt" | "updatedAt">) {
  const d = ensureDb()
  return addDoc(collection(d, "dietPlans"), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function getNotifications(userId: string): Promise<Notification[]> {
  const d = ensureDb()
  const q = query(
    collection(d, "notifications"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(20)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({
    ...fromFirestore<Notification>(d.data() as Record<string, unknown>),
    id: d.id,
  }))
}

export async function markNotificationRead(id: string) {
  const d = ensureDb()
  return updateDoc(doc(d, "notifications", id), { read: true })
}

export async function getCoachCheckins(
  coachId: string,
  max = 50
): Promise<Checkin[]> {
  const d = ensureDb()
  const q = query(
    collection(d, "checkins"),
    where("coachId", "==", coachId),
    orderBy("date", "desc"),
    limit(max)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({
    ...fromFirestore<Checkin>(d.data() as Record<string, unknown>),
    id: d.id,
  }))
}

export async function getCoachPayments(
  coachId: string,
  max = 50
): Promise<Payment[]> {
  const d = ensureDb()
  const q = query(
    collection(d, "payments"),
    where("coachId", "==", coachId),
    orderBy("date", "desc"),
    limit(max)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({
    ...fromFirestore<Payment>(d.data() as Record<string, unknown>),
    id: d.id,
  }))
}
