import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import Room from '../models/Room.js'
import Carton from '../models/Carton.js'

const router = Router()

// GET /api/rooms — salas del usuario (host o jugador) + estadísticas para el dashboard
router.get('/', requireAuth, async (req, res) => {
  const userId = req.user.id
  try {
    const [rooms, cardsCount, bingosWon] = await Promise.all([
      Room.find({
        $or: [{ hostId: userId }, { 'players.userId': userId }],
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('code status players calledNumbers winners hostId createdAt endedAt'),
      Carton.countDocuments({ userId }),
      Room.countDocuments({ winners: userId }),
    ])

    const activeRooms = rooms.filter((r) => r.status !== 'ended').length

    res.json({
      rooms: rooms.map((r) => ({
        code: r.code,
        status: r.status,
        playersCount: r.players.length,
        calledCount: r.calledNumbers.length,
        isHost: String(r.hostId) === String(userId),
        createdAt: r.createdAt,
        endedAt: r.endedAt,
      })),
      stats: {
        cardsCount,
        roomsPlayed: rooms.length,
        bingosWon,
        activeRooms,
      },
    })
  } catch (err) {
    console.error('[rooms/list]', err)
    res.status(500).json({ error: 'Error al obtener las salas.' })
  }
})

export default router
