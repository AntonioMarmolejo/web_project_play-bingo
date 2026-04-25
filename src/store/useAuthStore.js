import { create } from 'zustand'
import { auth as authApi } from '../services/api'

const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('bingo_token') || null,
  loading: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null })
    try {
      const { token, user } = await authApi.login(email, password)
      localStorage.setItem('bingo_token', token)
      set({ token, user, loading: false })
    } catch (err) {
      set({ error: err.message, loading: false })
      throw err
    }
  },

  register: async (name, email, password) => {
    set({ loading: true, error: null })
    try {
      const { token, user } = await authApi.register(name, email, password)
      localStorage.setItem('bingo_token', token)
      set({ token, user, loading: false })
    } catch (err) {
      set({ error: err.message, loading: false })
      throw err
    }
  },

  logout: () => {
    localStorage.removeItem('bingo_token')
    set({ user: null, token: null })
  },

  setUser: (user) => set({ user }),
  clearError: () => set({ error: null }),
}))

export default useAuthStore
