// Expo Push Notifications — no requiere Firebase ni APNs directo
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

export async function sendPush(tokens, title, body, data = {}) {
  const valid = tokens.filter((t) => t?.startsWith('ExponentPushToken['))
  if (valid.length === 0) return

  const messages = valid.map((to) => ({ to, title, body, data, sound: 'default' }))

  try {
    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    })
  } catch (err) {
    console.warn('[push]', err.message)
  }
}
