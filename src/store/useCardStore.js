import { create } from 'zustand'
import { cards as cardsApi } from '../services/api'

const useCardStore = create((set, get) => ({
  cards: [],
  loading: false,
  error: null,

  fetchCards: async () => {
    set({ loading: true, error: null })
    try {
      const { cards } = await cardsApi.list()
      set({ cards, loading: false })
    } catch (err) {
      set({ error: err.message, loading: false })
    }
  },

  saveCard: async (grid, sourceType, imageUrl = null, name = 'Mi cartón') => {
    set({ loading: true, error: null })
    try {
      const { carton } = await cardsApi.save(grid, sourceType, imageUrl, name)
      set((state) => ({ cards: [carton, ...state.cards], loading: false }))
      return carton
    } catch (err) {
      set({ error: err.message, loading: false })
      throw err
    }
  },

  removeCard: async (id) => {
    try {
      await cardsApi.remove(id)
      set((state) => ({ cards: state.cards.filter((c) => c._id !== id) }))
    } catch (err) {
      set({ error: err.message })
    }
  },

  clearError: () => set({ error: null }),
}))

export default useCardStore
