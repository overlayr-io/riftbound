import 'dotenv/config'

function required(key: string): string {
  const value = process.env[key]
  if (!value) throw new Error(`Missing required env var: ${key}`)
  return value
}

export const env = {
  PORT: parseInt(process.env.PORT ?? '3000', 10),
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  FIREBASE_PROJECT_ID: required('FIREBASE_PROJECT_ID'),
  FIREBASE_SERVICE_ACCOUNT_BASE64: process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,
  FIREBASE_DATABASE_URL: process.env.FIREBASE_DATABASE_URL,
  USE_EMULATOR: process.env.USE_EMULATOR === 'true',
  CLIENT_URL: process.env.CLIENT_URL ?? '*',
} as const
