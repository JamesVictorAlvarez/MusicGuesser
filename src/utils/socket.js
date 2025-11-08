// Socket.io client initialization
import { io } from 'socket.io-client'

let socket = null

export function initializeSocket() {
  if (socket && socket.connected) return socket
  
  try {
    // If socket exists but is disconnected, create a new one
    if (socket && !socket.connected) {
      socket.removeAllListeners()
      socket = null
    }
    
    if (!socket) {
      const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'
      console.log('Initializing socket connection to:', serverUrl)
      socket = io(serverUrl, { 
        autoConnect: false,
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      })
    }
    return socket
  } catch (e) {
    console.warn('Socket.io not available', e)
    return null
  }
}

export function getSocket() {
  return socket
}

export function disconnectSocket() {
  if (socket) {
    console.log('Disconnecting socket from utility')
    socket.removeAllListeners()
    socket.disconnect()
    socket = null
  }
}

