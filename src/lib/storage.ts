import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
import firebase from "./firebase"

const { storage } = firebase

function ensureStorage() {
  if (!storage) throw new Error("Firebase Storage not initialized. Check your config.")
  return storage
}

export async function uploadFile(
  path: string,
  file: File | Blob | Uint8Array
): Promise<string> {
  const s = ensureStorage()
  const storageRef = ref(s, path)
  const snapshot = await uploadBytes(storageRef, file)
  return getDownloadURL(snapshot.ref)
}

export async function uploadCheckinPhoto(
  clientId: string,
  file: File,
  index: number
): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg"
  const path = `checkins/${clientId}/${Date.now()}_${index}.${ext}`
  return uploadFile(path, file)
}

export async function deleteFile(path: string) {
  const s = ensureStorage()
  const storageRef = ref(s, path)
  await deleteObject(storageRef)
}
