/**
 * Provisionne le compte admin de dev sur l'émulateur Firebase.
 * Usage : node scripts/seed-admin.mjs
 * À lancer APRÈS "npm run emulators" (auth + firestore sur 9099 / 8080).
 */
import admin from 'firebase-admin'

process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099'
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080'

const PROJECT = 'overlayr-riftbound'
const ADMIN_EMAIL = 'admin@overlayr.fr'
const ADMIN_PASSWORD = 'adminoverlayr'
const ADMIN_ROLE = 'super_admin'

admin.initializeApp({ projectId: PROJECT })

const auth = admin.auth()
const db = admin.firestore()

let uid
try {
  const existing = await auth.getUserByEmail(ADMIN_EMAIL)
  uid = existing.uid
  console.log(`ℹ  Compte existant (${uid}) — mise à jour des claims.`)
} catch {
  const created = await auth.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    emailVerified: true,
    displayName: 'Admin Dev',
  })
  uid = created.uid
  console.log(`✅ Compte créé (${uid}).`)
}

await auth.setCustomUserClaims(uid, { role: ADMIN_ROLE })
await auth.revokeRefreshTokens(uid)

// Miroir dans Firestore users/{uid}
await db.collection('users').doc(uid).set({
  email: ADMIN_EMAIL,
  displayName: 'Admin Dev',
  isAnonymous: false,
  role: ADMIN_ROLE,
  status: 'active',
  betaAccess: 'granted',
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  lastSeenAt: admin.firestore.FieldValue.serverTimestamp(),
}, { merge: true })

console.log(`✅ ${ADMIN_EMAIL} → rôle « ${ADMIN_ROLE} » assigné.`)
console.log(`   Email    : ${ADMIN_EMAIL}`)
console.log(`   Mot de passe : ${ADMIN_PASSWORD}`)
console.log(`   URL admin : http://localhost:5174/admin/login`)
process.exit(0)
