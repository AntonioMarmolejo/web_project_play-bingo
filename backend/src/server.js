import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { connectDB } from './config/db.js'
import authRoutes from './routes/auth.js'
import cardRoutes from './routes/cards.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT ?? 3001

app.use(cors({ origin: 'http://localhost:5173', credentials: true }))
app.use(express.json())

// Sirve los archivos subidos (en producción usar Cloudinary)
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')))

app.use('/api/auth',  authRoutes)
app.use('/api/cards', cardRoutes)

app.get('/api/health', (_, res) => res.json({ ok: true, ts: Date.now() }))

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`[server] http://localhost:${PORT}`))
  })
  .catch((err) => {
    console.error('[server] No se pudo conectar a MongoDB:', err.message)
    process.exit(1)
  })
