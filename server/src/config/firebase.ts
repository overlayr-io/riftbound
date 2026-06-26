import * as admin from 'firebase-admin'
import { env } from './env'


const appOptions: admin.AppOptions = {
  projectId: env.FIREBASE_PROJECT_ID,
}

if (env.FIREBASE_DATABASE_URL) {
  appOptions.databaseURL = env.FIREBASE_DATABASE_URL
}

if (env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
  const serviceAccount = JSON.parse(
    Buffer.from(env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf-8'),
  )
  appOptions.credential = admin.credential.cert(serviceAccount)
} else if (!env.USE_EMULATOR) {
  appOptions.credential = admin.credential.applicationDefault()
}

admin.initializeApp(appOptions)

export const db = admin.firestore()
export const firebaseAuth = admin.auth()
export const rtdb = env.FIREBASE_DATABASE_URL ? admin.database() : null
