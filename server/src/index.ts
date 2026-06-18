import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { env } from './config/env'
import './config/firebase'
import router from './routes'
import { errorHandler } from './middlewares/error.middleware'

const app = express()

app.use(helmet())
app.use(cors({ origin: env.CLIENT_URL }))
app.use(express.json())

app.use('/api', router)
app.use(errorHandler)

app.listen(env.PORT, () => {
  console.log(`[server] Running on port ${env.PORT} (${env.NODE_ENV})`)
  if (env.USE_EMULATOR) {
    console.log('[server] Connected to Firebase Emulator Suite')
  }
})
