import AsyncStorage from '@react-native-async-storage/async-storage'

const BASE = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`

async function getToken() {
  return AsyncStorage.getItem('bingo_token')
}

async function headers(extra = {}) {
  const token = await getToken()
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  }
}

async function handleResponse(res) {
  const text = await res.text()
  if (!text) throw new Error('El servidor no respondió.')
  let data
  try { data = JSON.parse(text) } catch {
    throw new Error(`Respuesta inesperada (${res.status})`)
  }
  if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`)
  return data
}

// ── Auth ──────────────────────────────────────────────
export const auth = {
  register: async (name, email, password) =>
    fetch(`${BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    }).then(handleResponse),

  login: async (email, password) =>
    fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }).then(handleResponse),

  savePushToken: async (pushToken) => {
    const h = await headers({ 'Content-Type': 'application/json' })
    return fetch(`${BASE}/auth/push-token`, {
      method: 'PATCH',
      headers: h,
      body: JSON.stringify({ pushToken }),
    }).then(handleResponse)
  },
}

// ── Cards ─────────────────────────────────────────────
export const cards = {
  ocr: async (uri, mimeType = 'image/jpeg') => {
    const h = await headers()
    const form = new FormData()
    form.append('file', { uri, type: mimeType, name: 'card.jpg' })
    return fetch(`${BASE}/cards/ocr`, {
      method: 'POST',
      headers: h,
      body: form,
    }).then(handleResponse)
  },

  save: async (grid, sourceType, imageUrl, imagePublicId, name) => {
    const h = await headers({ 'Content-Type': 'application/json' })
    return fetch(`${BASE}/cards`, {
      method: 'POST',
      headers: h,
      body: JSON.stringify({ grid, sourceType, imageUrl, imagePublicId, name }),
    }).then(handleResponse)
  },

  list: async () => {
    const h = await headers()
    return fetch(`${BASE}/cards`, { headers: h }).then(handleResponse)
  },

  remove: async (id) => {
    const h = await headers()
    return fetch(`${BASE}/cards/${id}`, { method: 'DELETE', headers: h }).then(handleResponse)
  },
}

// ── Rooms ─────────────────────────────────────────────
export const rooms = {
  myRooms: async () => {
    const h = await headers()
    return fetch(`${BASE}/rooms`, { headers: h }).then(handleResponse)
  },
}
