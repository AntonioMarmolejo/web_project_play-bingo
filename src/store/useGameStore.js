import { create } from 'zustand'

const useGameStore = create((set) => ({
  room: null,
  calledNumbers: [],
  players: [],
  myCards: [],
  gameStatus: 'idle', // idle | waiting | active | ended

  setRoom: (room) => set({ room }),
  setPlayers: (players) => set({ players }),
  setMyCards: (myCards) => set({ myCards }),
  addCalledNumber: (num) =>
    set((state) => ({ calledNumbers: [...state.calledNumbers, num] })),
  setGameStatus: (gameStatus) => set({ gameStatus }),

  resetGame: () =>
    set({ room: null, calledNumbers: [], players: [], myCards: [], gameStatus: 'idle' }),
}))

export default useGameStore
