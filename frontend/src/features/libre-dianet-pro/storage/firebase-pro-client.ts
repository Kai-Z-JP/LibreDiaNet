import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getStorage, type FirebaseStorage } from 'firebase/storage'

const FIREBASE_APP_NAME = 'libre-dianet-pro'

export type FirebaseProClient = {
  app: FirebaseApp
  auth: Auth
  firestore: Firestore
  storage: FirebaseStorage
  projectId: string
}

export function getFirebaseProClient(): FirebaseProClient {
  const options = readFirebaseOptions()
  const app = getApps().some((candidate) => candidate.name === FIREBASE_APP_NAME)
    ? getApp(FIREBASE_APP_NAME)
    : initializeApp(options, FIREBASE_APP_NAME)
  return {
    app,
    auth: getAuth(app),
    firestore: getFirestore(app),
    storage: getStorage(app),
    projectId: options.projectId,
  }
}

function readFirebaseOptions(): FirebaseOptions & { projectId: string } {
  const options = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  }
  const missing = Object.entries({
    VITE_FIREBASE_API_KEY: options.apiKey,
    VITE_FIREBASE_AUTH_DOMAIN: options.authDomain,
    VITE_FIREBASE_PROJECT_ID: options.projectId,
    VITE_FIREBASE_STORAGE_BUCKET: options.storageBucket,
    VITE_FIREBASE_APP_ID: options.appId,
  })
    .filter(([, value]) => !value)
    .map(([key]) => key)
  if (missing.length > 0) {
    throw new Error(`Firebase の設定が不足しています: ${missing.join(', ')}`)
  }
  return options as FirebaseOptions & { projectId: string }
}
