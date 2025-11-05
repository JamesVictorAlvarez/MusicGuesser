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
      setSocketConnected(false)
      setSocketError(`Cannot connect to server. Make sure the server is running on port 3001.`)
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

