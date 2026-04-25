const BASE = '/api'

function getToken() {
  return localStorage.getItem('bingo_token')
}

function headers(extra = {}) {
  const token = getToken()
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  }
}

async function handleResponse(res) {
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`)
  return data
}

// ── Auth ─────────────────────────────────────────────
export const auth = {
  register: (name, email, password) =>
    fetch(`${BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    }).then(handleResponse),

  login: (email, password) =>
    fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }).then(handleResponse),

  me: () =>
    fetch(`${BASE}/auth/me`, { headers: headers() }).then(handleResponse),
}

// ── Cards ─────────────────────────────────────────────
export const cards = {
  ocr: (file) => {
    const form = new FormData()
    form.append('file', file)
    return fetch(`${BASE}/cards/ocr`, {
      method: 'POST',
      headers: headers(),
      body: form,
    }).then(handleResponse)
  },

  save: (grid, sourceType, imageUrl, name) =>
    fetch(`${BASE}/cards`, {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ grid, sourceType, imageUrl, name }),
    }).then(handleResponse),

  list: () =>
    fetch(`${BASE}/cards`, { headers: headers() }).then(handleResponse),

  remove: (id) =>
    fetch(`${BASE}/cards/${id}`, {
      method: 'DELETE',
      headers: headers(),
    }).then(handleResponse),
}
