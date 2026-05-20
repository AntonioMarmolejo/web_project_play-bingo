import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { auth as authApi } from '../services/api'

const useAuthStore = create((set) => ({
  token: null,
  user: null,
  loading: false,
  error: null,

  // Restaura la sesión desde AsyncStorage al arrancar la app
  hydrate: async () => {
    const token = await AsyncStorage.getItem('bingo_token')
    const raw = await AsyncStorage.getItem('bingo_user')
    if (token && raw) {
      set({ token, user: JSON.parse(raw) })
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null })
    try {
      const { token, user } = await authApi.login(email, password)
      await AsyncStorage.setItem('bingo_token', token)
      await AsyncStorage.setItem('bingo_user', JSON.stringify(user))
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
      await AsyncStorage.setItem('bingo_token', token)
      await AsyncStorage.setItem('bingo_user', JSON.stringify(user))
      set({ token, user, loading: false })
    } catch (err) {
      set({ error: err.message, loading: false })
      throw err
    }
  },

  logout: async () => {
    await AsyncStorage.multiRemove(['bingo_token', 'bingo_user'])
    set({ token: null, user: null })
  },

  clearError: () => set({ error: null }),
}))

export default useAuthStore
