import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  User,
} from "firebase/auth"
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import firebase from "./firebase"
import { AppUser } from "@/types"

const { auth, db } = firebase

function ensureAuth() {
  if (!auth) throw new Error("Firebase Auth not initialized. Check your config.")
  return auth
}

function ensureDb() {
  if (!db) throw new Error("Firebase Firestore not initialized. Check your config.")
  return db
}

export async function signUp(
  email: string,
  password: string,
  displayName: string,
  role: "client" | "coach" = "client"
) {
  const a = ensureAuth()
  const d = ensureDb()
  const cred = await createUserWithEmailAndPassword(a, email, password)
  await updateProfile(cred.user, { displayName })
  const userData: AppUser = {
    uid: cred.user.uid,
    email,
    displayName,
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  await setDoc(doc(d, "users", cred.user.uid), {
    ...userData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return cred.user
}

export async function signIn(email: string, password: string) {
  const a = ensureAuth()
  const cred = await signInWithEmailAndPassword(a, email, password)
  return cred.user
}

export async function signOut() {
  const a = ensureAuth()
  await firebaseSignOut(a)
}

export async function getUserRole(uid: string): Promise<"client" | "coach" | "admin" | null> {
  const d = ensureDb()
  const snap = await getDoc(doc(d, "users", uid))
  if (!snap.exists()) return null
  return snap.data().role as "client" | "coach" | "admin"
}

export function onAuthChange(callback: (user: User | null) => void) {
  const a = ensureAuth()
  return onAuthStateChanged(a, callback)
}
