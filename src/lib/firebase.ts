import { initializeApp, getApps, FirebaseApp } from "firebase/app"
import { getAuth, connectAuthEmulator, Auth } from "firebase/auth"
import {
  getFirestore,
  connectFirestoreEmulator,
  Firestore,
} from "firebase/firestore"
import { getStorage, connectStorageEmulator, FirebaseStorage } from "firebase/storage"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

let app: FirebaseApp | undefined
let auth: Auth | undefined
let db: Firestore | undefined
let storage: FirebaseStorage | undefined

function initFirebase() {
  const hasConfig = firebaseConfig.apiKey && firebaseConfig.projectId
  if (!hasConfig || typeof window === "undefined") {
    return { app: undefined, auth: undefined, db: undefined, storage: undefined }
  }

  if (!getApps().length) {
    app = initializeApp(firebaseConfig as Record<string, string>)
    auth = getAuth(app)
    db = getFirestore(app)
    storage = getStorage(app)

    if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true") {
      connectAuthEmulator(auth, "http://localhost:9099")
      connectFirestoreEmulator(db, "localhost", 8080)
      connectStorageEmulator(storage, "localhost", 9199)
    }
  } else {
    app = getApps()[0]
    auth = getAuth(app)
    db = getFirestore(app)
    storage = getStorage(app)
  }

  return { app, auth, db, storage }
}

const firebase = initFirebase()

export { firebaseConfig }
export default firebase
