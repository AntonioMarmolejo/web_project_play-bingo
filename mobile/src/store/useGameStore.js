import { create } from 'zustand'
import { connectSocket, disconnectSocket, getSocket } from '../services/socket'

const useGameStore = create((set, get) => ({
  room: null,
  players: [],
  calledNumbers: [],
  lastCalledNumber: null,
  gameStatus: 'idle',   // idle | waiting | active | ended
  winners: [],
  lastBingoClaim: null,
  error: null,

  initSocket: (token) => {
    const socket = connectSocket(token)

    socket.on('room:updated', ({ room }) => {
      set({ room, players: room.players })
    })
    socket.on('game:started', ({ room }) => {
      set({ room, players: room.players, gameStatus: 'active', calledNumbers: [] })
    })
    socket.on('game:number-called', ({ number, calledNumbers }) => {
      set({ calledNumbers, lastCalledNumber: number })
    })
    socket.on('game:bingo-claimed', (data) => {
      set({ lastBingoClaim: data })
    })
    socket.on('game:ended', ({ winners, room }) => {
      set({ gameStatus: 'ended', winners, room })
    })
    socket.on('connect_error', (err) => {
      set({ error: err.message })
    })
  },

  createRoom: () => new Promise((resolve, reject) => {
    const socket = getSocket()
    socket.emit('room:create', {}, ({ ok, room, error }) => {
      if (!ok) return reject(new Error(error ?? 'No se pudo crear la sala.'))
      set({ room, players: room.players, gameStatus: 'waiting' })
      resolve(room)
    })
  }),

  joinRoom: (code) => new Promise((resolve, reject) => {
    const socket = getSocket()
    socket.emit('room:join', { code }, ({ ok, room, error }) => {
      if (!ok) return reject(new Error(error ?? 'No se pudo unir a la sala.'))
      set({ room, players: room.players, gameStatus: 'waiting' })
      resolve(room)
    })
  }),

  selectCard: (roomCode, cardId) => new Promise((resolve, reject) => {
    const socket = getSocket()
    socket.emit('room:select-card', { roomCode, cardId }, ({ ok, error }) => {
      if (!ok) return reject(new Error(error ?? 'No se pudo seleccionar el cartón.'))
      resolve()
    })
  }),

  startGame: (roomCode) => new Promise((resolve, reject) => {
    const socket = getSocket()
    socket.emit('game:start', { roomCode }, ({ ok, error }) => {
      if (!ok) return reject(new Error(error ?? 'No se pudo iniciar el juego.'))
      resolve()
    })
  }),

  callNumber: (roomCode) => new Promise((resolve, reject) => {
    const socket = getSocket()
    socket.emit('game:call-number', { roomCode }, ({ ok, error }) => {
      if (!ok) return reject(new Error(error ?? 'Error al cantar número.'))
      resolve()
    })
  }),

  claimBingo: (roomCode, cardId) => new Promise((resolve, reject) => {
    const socket = getSocket()
    socket.emit('game:claim-bingo', { roomCode, cardId }, ({ ok, error }) => {
      if (!ok) return reject(new Error(error ?? 'Error al reclamar bingo.'))
      resolve()
    })
  }),

  leaveRoom: (roomCode) => {
    const socket = getSocket()
    if (roomCode) socket?.emit('room:leave', { roomCode })
    set({ room: null, players: [], calledNumbers: [], lastCalledNumber: null,
          gameStatus: 'idle', winners: [], lastBingoClaim: null })
  },

  clearError: () => set({ error: null }),

  cleanup: () => {
    disconnectSocket()
    set({ room: null, players: [], calledNumbers: [], lastCalledNumber: null,
          gameStatus: 'idle', winners: [], lastBingoClaim: null, error: null })
  },
}))

export default useGameStore
