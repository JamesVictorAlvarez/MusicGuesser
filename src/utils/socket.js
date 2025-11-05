// Socket.io client initialization
import { io } from 'socket.io-client'

let socket = null

export function initializeSocket() {
  if (socket) return socket
  
  try {
    socket = io('http://localhost:3001', { autoConnect: false })
    return socket
  } catch (e) {
    console.warn('Socket.io not available', e)
    return null
  }
}

export function getSocket() {
  return socket
}

