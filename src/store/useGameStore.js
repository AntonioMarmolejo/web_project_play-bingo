import { create } from 'zustand'
import { connectSocket, disconnectSocket, getSocket } from '../services/socket'

const useGameStore = create((set) => ({
  room: null,
  calledNumbers: [],
  lastCalledNumber: null,
  players: [],
  myCards: [],
  gameStatus: 'idle', // idle | waiting | active | ended
  winners: [],
  lastBingoClaim: null,
  error: null,

  // Conecta socket y registra todos los listeners del juego
  initSocket: (token) => {
    const socket = connectSocket(token)

    socket.off('room:updated')
    socket.off('game:started')
    socket.off('game:number-called')
    socket.off('game:bingo-claimed')
    socket.off('game:ended')

    socket.on('room:updated', ({ room }) => {
      set({ room, players: room.players })
    })

    socket.on('game:started', ({ room }) => {
      set({ room, players: room.players, gameStatus: 'active' })
    })

    socket.on('game:number-called', ({ number, calledNumbers }) => {
      set({ calledNumbers, lastCalledNumber: number })
    })

    socket.on('game:bingo-claimed', ({ player, valid }) => {
      set({ lastBingoClaim: { player, valid } })
    })

    socket.on('game:ended', ({ winners, room }) => {
      set({ gameStatus: 'ended', winners, room })
    })

    socket.on('connect_error', (err) => {
      set({ error: `Error de conexión: ${err.message}` })
    })
  },

  // ── Acciones de sala ──────────────────────────────────

  createRoom: () =>
    new Promise((resolve, reject) => {
      const socket = getSocket()
      if (!socket?.connected) return reject(new Error('Socket no conectado'))
      socket.emit('room:create', (res) => {
        if (res.ok) {
          set({ room: res.room, players: res.room.players, gameStatus: 'waiting' })
          resolve(res.room)
        } else {
          reject(new Error(res.error))
        }
      })
    }),

  joinRoom: (code) =>
    new Promise((resolve, reject) => {
      const socket = getSocket()
      if (!socket?.connected) return reject(new Error('Socket no conectado'))
      socket.emit('room:join', { code }, (res) => {
        if (res.ok) {
          set({ room: res.room, players: res.room.players, gameStatus: 'waiting' })
          resolve(res.room)
        } else {
          reject(new Error(res.error))
        }
      })
    }),

  selectCard: (roomCode, cardId) =>
    new Promise((resolve, reject) => {
      const socket = getSocket()
      if (!socket?.connected) return reject(new Error('Socket no conectado'))
      socket.emit('room:select-card', { roomCode, cardId }, (res) => {
        if (res.ok) resolve()
        else reject(new Error(res.error))
      })
    }),

  startGame: (roomCode) =>
    new Promise((resolve, reject) => {
      const socket = getSocket()
      if (!socket?.connected) return reject(new Error('Socket no conectado'))
      socket.emit('game:start', { roomCode }, (res) => {
        if (res.ok) resolve()
        else reject(new Error(res.error))
      })
    }),

  callNumber: (roomCode) =>
    new Promise((resolve, reject) => {
      const socket = getSocket()
      if (!socket?.connected) return reject(new Error('Socket no conectado'))
      socket.emit('game:call-number', { roomCode }, (res) => {
        if (res.ok) resolve(res.number)
        else reject(new Error(res.error))
      })
    }),

  claimBingo: (roomCode, cardId) =>
    new Promise((resolve, reject) => {
      const socket = getSocket()
      if (!socket?.connected) return reject(new Error('Socket no conectado'))
      socket.emit('game:claim-bingo', { roomCode, cardId }, (res) => {
        if (res.ok) resolve()
        else reject(new Error(res.error))
      })
    }),

  leaveRoom: (roomCode) =>
    new Promise((resolve) => {
      const socket = getSocket()
      if (!socket?.connected) {
        set({ room: null, calledNumbers: [], players: [], gameStatus: 'idle', lastCalledNumber: null, winners: [] })
        return resolve()
      }
      socket.emit('room:leave', { roomCode }, () => {
        set({ room: null, calledNumbers: [], players: [], gameStatus: 'idle', lastCalledNumber: null, winners: [] })
        resolve()
      })
    }),

  setMyCards: (myCards) => set({ myCards }),
  clearError: () => set({ error: null }),

  resetGame: () => {
    disconnectSocket()
    set({
      room: null,
      calledNumbers: [],
      lastCalledNumber: null,
      players: [],
      myCards: [],
      gameStatus: 'idle',
      winners: [],
      error: null,
      lastBingoClaim: null,
    })
  },
}))

export default useGameStore
