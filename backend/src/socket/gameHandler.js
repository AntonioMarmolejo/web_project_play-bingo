import Room from '../models/Room.js'
import Carton from '../models/Carton.js'

// Genera código aleatorio de 4 caracteres (sin caracteres ambiguos)
function makeCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

async function uniqueCode() {
  let code
  do { code = makeCode() } while (await Room.exists({ code }))
  return code
}

// Valida bingo: revisa filas, columnas y diagonales del grid 5x5
// null en [2][2] = FREE (siempre marcada)
function hasBingo(grid, calledNumbers) {
  const called = new Set(calledNumbers)
  const marked = (val) => val === null || called.has(val)

  for (let r = 0; r < 5; r++) {
    if (grid[r].every(marked)) return true
  }
  for (let c = 0; c < 5; c++) {
    if (grid.every((row) => marked(row[c]))) return true
  }
  if ([0, 1, 2, 3, 4].every((i) => marked(grid[i][i]))) return true
  if ([0, 1, 2, 3, 4].every((i) => marked(grid[i][4 - i]))) return true

  return false
}

export function registerGameHandlers(io, socket) {
  const { userId, userName } = socket.data

  // ── Crear sala ────────────────────────────────────────
  socket.on('room:create', async (callback) => {
    try {
      const code = await uniqueCode()
      const room = await Room.create({
        code,
        hostId: userId,
        players: [{ userId, name: userName, socketId: socket.id }],
      })
      socket.join(code)
      callback({ ok: true, room: room.toObject() })
    } catch (err) {
      callback({ ok: false, error: err.message })
    }
  })

  // ── Unirse a sala ─────────────────────────────────────
  socket.on('room:join', async ({ code }, callback) => {
    try {
      const room = await Room.findOne({ code: code.toUpperCase().trim() })
      if (!room) return callback({ ok: false, error: 'Sala no encontrada.' })
      if (room.status !== 'waiting') return callback({ ok: false, error: 'La partida ya comenzó.' })

      const existing = room.players.find((p) => p.userId.toString() === userId.toString())
      if (existing) {
        existing.socketId = socket.id
      } else {
        room.players.push({ userId, name: userName, socketId: socket.id })
      }
      await room.save()

      socket.join(code.toUpperCase().trim())
      io.to(room.code).emit('room:updated', { room: room.toObject() })
      callback({ ok: true, room: room.toObject() })
    } catch (err) {
      callback({ ok: false, error: err.message })
    }
  })

  // ── Seleccionar cartón ────────────────────────────────
  socket.on('room:select-card', async ({ roomCode, cardId }, callback) => {
    try {
      const room = await Room.findOne({ code: roomCode })
      if (!room) return callback({ ok: false, error: 'Sala no encontrada.' })

      const player = room.players.find((p) => p.userId.toString() === userId.toString())
      if (!player) return callback({ ok: false, error: 'No estás en esta sala.' })

      player.cardId = cardId
      await room.save()
      io.to(roomCode).emit('room:updated', { room: room.toObject() })
      callback({ ok: true })
    } catch (err) {
      callback({ ok: false, error: err.message })
    }
  })

  // ── Iniciar juego (solo host) ──────────────────────────
  socket.on('game:start', async ({ roomCode }, callback) => {
    try {
      const room = await Room.findOne({ code: roomCode })
      if (!room) return callback({ ok: false, error: 'Sala no encontrada.' })
      if (room.hostId.toString() !== userId.toString())
        return callback({ ok: false, error: 'Solo el anfitrión puede iniciar.' })
      if (room.status !== 'waiting')
        return callback({ ok: false, error: 'El juego ya comenzó.' })

      room.status = 'active'
      await room.save()
      io.to(roomCode).emit('game:started', { room: room.toObject() })
      callback({ ok: true })
    } catch (err) {
      callback({ ok: false, error: err.message })
    }
  })

  // ── Cantar número (solo host) ─────────────────────────
  socket.on('game:call-number', async ({ roomCode }, callback) => {
    try {
      const room = await Room.findOne({ code: roomCode })
      if (!room) return callback({ ok: false, error: 'Sala no encontrada.' })
      if (room.hostId.toString() !== userId.toString())
        return callback({ ok: false, error: 'Solo el anfitrión puede cantar.' })
      if (room.status !== 'active')
        return callback({ ok: false, error: 'El juego no está activo.' })

      const remaining = Array.from({ length: 75 }, (_, i) => i + 1).filter(
        (n) => !room.calledNumbers.includes(n)
      )
      if (!remaining.length) return callback({ ok: false, error: 'Se cantaron todos los números.' })

      const number = remaining[Math.floor(Math.random() * remaining.length)]
      room.calledNumbers.push(number)
      await room.save()

      io.to(roomCode).emit('game:number-called', {
        number,
        calledNumbers: room.calledNumbers,
      })
      callback({ ok: true, number })
    } catch (err) {
      callback({ ok: false, error: err.message })
    }
  })

  // ── Reclamar bingo ────────────────────────────────────
  socket.on('game:claim-bingo', async ({ roomCode, cardId }, callback) => {
    try {
      const room = await Room.findOne({ code: roomCode })
      if (!room) return callback({ ok: false, error: 'Sala no encontrada.' })
      if (room.status !== 'active')
        return callback({ ok: false, error: 'El juego no está activo.' })

      const carton = await Carton.findOne({ _id: cardId, userId })
      if (!carton) return callback({ ok: false, error: 'Cartón no encontrado.' })

      const valid = hasBingo(carton.grid, room.calledNumbers)

      if (!valid) {
        io.to(roomCode).emit('game:bingo-claimed', { player: userName, valid: false })
        return callback({ ok: false, error: 'El bingo no es válido aún.' })
      }

      room.winners.push(userId)
      const player = room.players.find((p) => p.userId.toString() === userId.toString())
      if (player) player.hasBingo = true
      room.status = 'ended'
      room.endedAt = new Date()
      await room.save()

      io.to(roomCode).emit('game:bingo-claimed', { player: userName, valid: true })
      io.to(roomCode).emit('game:ended', { winners: [userName], room: room.toObject() })
      callback({ ok: true })
    } catch (err) {
      callback({ ok: false, error: err.message })
    }
  })

  // ── Salir de sala ─────────────────────────────────────
  socket.on('room:leave', async ({ roomCode }, callback) => {
    try {
      await handlePlayerLeave(io, socket, userId, roomCode)
      if (callback) callback({ ok: true })
    } catch (err) {
      if (callback) callback({ ok: false, error: err.message })
    }
  })

  // ── Desconexión ───────────────────────────────────────
  socket.on('disconnect', async () => {
    const rooms = await Room.find({
      'players.socketId': socket.id,
      status: { $in: ['waiting', 'active'] },
    })
    for (const room of rooms) {
      await handlePlayerLeave(io, socket, userId, room.code)
    }
  })
}

async function handlePlayerLeave(io, socket, userId, roomCode) {
  const room = await Room.findOne({ code: roomCode })
  if (!room) return

  room.players = room.players.filter((p) => p.userId.toString() !== userId.toString())

  if (room.players.length === 0) {
    await Room.deleteOne({ _id: room._id })
  } else {
    if (room.hostId.toString() === userId.toString()) {
      room.hostId = room.players[0].userId
    }
    await room.save()
    io.to(roomCode).emit('room:updated', { room: room.toObject() })
  }

  socket.leave(roomCode)
}
