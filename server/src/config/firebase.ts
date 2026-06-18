import * as admin from 'firebase-admin'
import { env } from './env'

if (env.USE_EMULATOR) {
  process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080'
  process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099'
}

const appOptions: admin.AppOptions = {
  projectId: env.FIREBASE_PROJECT_ID,
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
