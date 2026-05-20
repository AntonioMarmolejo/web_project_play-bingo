import { io } from 'socket.io-client'

let socket = null

export function connectSocket(token) {
  if (socket?.connected) return socket
  socket = io(process.env.EXPO_PUBLIC_BACKEND_URL, {
    auth: { token },
    transports: ['websocket'],
  })
  return socket
}

export function getSocket() {
  return socket
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
}
