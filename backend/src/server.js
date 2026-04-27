import 'dotenv/config'
import { createServer } from 'http'
import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import { connectDB } from './config/db.js'
import authRoutes from './routes/auth.js'
import cardRoutes from './routes/cards.js'
import { registerGameHandlers } from './socket/gameHandler.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const httpServer = createServer(app)
const PORT = process.env.PORT ?? 3001

app.use(cors({ origin: 'http://localhost:5173', credentials: true }))
app.use(express.json())

// Sirve los archivos subidos (en producción usar Cloudinary)
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')))

app.use('/api/auth',  authRoutes)
app.use('/api/cards', cardRoutes)

app.get('/api/health', (_, res) => res.json({ ok: true, ts: Date.now() }))

// ── Socket.io ─────────────────────────────────────────
const io = new Server(httpServer, {
  cors: { origin: 'http://localhost:5173', credentials: true },
})

// Autenticación por JWT en el handshake
io.use((socket, next) => {
  const token = socket.handshake.auth?.token
  if (!token) return next(new Error('Token requerido'))
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    socket.data.userId = payload.id
    socket.data.userName = payload.name
    next()
  } catch {
    next(new Error('Token inválido'))
  }
})

io.on('connection', (socket) => {
  console.log(`[socket] ${socket.data.userName} conectado (${socket.id})`)
  registerGameHandlers(io, socket)
  socket.on('disconnect', () =>
    console.log(`[socket] ${socket.data.userName} desconectado (${socket.id})`)
  )
})

connectDB()
  .then(() => {
    httpServer.listen(PORT, () => console.log(`[server] http://localhost:${PORT}`))
  })
  .catch((err) => {
    console.error('[server] No se pudo conectar a MongoDB:', err.message)
    process.exit(1)
  })
