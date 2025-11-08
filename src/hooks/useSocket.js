import { useEffect, useRef, useState } from 'react'
import { initializeSocket, getSocket } from '../utils/socket'

export function useSocket() {
  const [socketConnected, setSocketConnected] = useState(false)
  const [socketError, setSocketError] = useState(null)
  const [socketId, setSocketId] = useState(null)
  const socketRef = useRef(null)

  useEffect(() => {
    const socket = initializeSocket()
    socketRef.current = socket

    if (!socket) {
      console.warn('Socket.io not initialized - multiplayer will not work')
      setSocketError('Socket.io not available. Make sure the server is running.')
      return
    }
    
    console.log('Connecting to socket server...')
    socket.connect()
    
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id)
      setSocketConnected(true)
      setSocketError(null)
      setSocketId(socket.id)
    })

    socket.on('disconnect', () => {
      console.log('Socket disconnected')
      setSocketConnected(false)
      setSocketId(null)
    })

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
      const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'
      setSocketConnected(false)
      setSocketError(`Cannot connect to server at ${serverUrl}. Make sure the server is running and ngrok is active.`)
    })

    return () => {
      if (socket) {
        socket.off('connect')
        socket.off('disconnect')
        socket.off('connect_error')
      }
    }
  }, [])

  return {
    socket: socketRef.current,
    socketConnected,
    socketError,
    socketId
  }
}

