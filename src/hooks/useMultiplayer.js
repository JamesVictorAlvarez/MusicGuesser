import { useState, useEffect, useRef } from 'react'
import { getSocket } from '../utils/socket'
import { getRandomTracks } from '../services/spotify'
import { pickDistractors, buildOptionsList, shuffleArray } from '../utils/gameLogic'

export function useMultiplayer(socketConnected, socketId, onViewChange, onGameStart, onRoundStarted, onGameOver) {
  const [roomId, setRoomId] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [players, setPlayers] = useState([])
  const [currentRound, setCurrentRound] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [finalLeaderboard, setFinalLeaderboard] = useState([])
  
  const roomIdRef = useRef('')
  const isMultiplayerRef = useRef(false)
  const socketRef = useRef(null)

  useEffect(() => {
    const socket = getSocket()
    socketRef.current = socket
    
    if (!socket) return

    socket.on('room-created', (data) => {
      console.log('Room created:', data)
      setRoomId(data.roomId)
      roomIdRef.current = data.roomId
      setRoomCode(data.roomId)
      onViewChange('multiplayer-lobby')
    })

    socket.on('room-joined', (data) => {
      console.log('Room joined:', data)
      setRoomId(data.roomId)
      roomIdRef.current = data.roomId
      onViewChange('multiplayer-lobby')
    })

    socket.on('room-updated', (data) => {
      console.log('Room updated:', data)
      if (data.players && Array.isArray(data.players)) {
        setPlayers(data.players)
      }
      setCurrentRound(data.currentRound || 0)
      if (data.gameOver) {
        setGameOver(true)
      }
    })

    socket.on('game-started', () => {
      console.log('Game started event received')
      isMultiplayerRef.current = true
      onGameStart()
    })

    socket.on('load-round', async (data) => {
      console.log('=== LOAD-ROUND EVENT RECEIVED ===')
      console.log('Socket ID:', socket.id)
      console.log('Load round event received:', data)
      
      // Ensure we're in the game view
      if (onViewChange) {
        onViewChange('multiplayer-game')
      }
      
      // Only the host loads and sends track data
      if (!data.isHost) {
        console.log('Not host - waiting for round-started event...')
        return
      }
      
      // Host: Load tracks and send track data
      // This will be handled by the parent component via callback
      if (onRoundStarted && data.isHost) {
        // Trigger track loading in parent
        onRoundStarted({ isHost: true, round: data.round })
      }
    })

    socket.on('round-started', (data) => {
      console.log('=== ROUND-STARTED EVENT RECEIVED ===')
      console.log('Track received:', data.track?.name)
      
      if (!data.track) {
        console.error('round-started received but no track data!')
        return
      }
      
      // Ensure we're in the game view
      if (onViewChange) {
        onViewChange('multiplayer-game')
      }
      
      // Call parent callback with track data
      if (onRoundStarted) {
        onRoundStarted({ track: data.track, options: data.options, gameMode: data.gameMode })
      }
    })

    socket.on('game-over', (data) => {
      console.log('Game over:', data)
      setFinalLeaderboard(data.players)
      setGameOver(true)
      onViewChange('multiplayer-results')
      if (onGameOver) {
        onGameOver(data.players)
      }
    })

    socket.on('room-error', (data) => {
      console.error('Room error:', data)
      alert(data.message)
    })

    return () => {
      if (socket) {
        socket.off('room-created')
        socket.off('room-joined')
        socket.off('room-updated')
        socket.off('game-started')
        socket.off('load-round')
        socket.off('round-started')
        socket.off('game-over')
        socket.off('room-error')
      }
    }
  }, [socketConnected, socketId, onViewChange, onGameStart, onRoundStarted, onGameOver])

  const loadAndSendTrack = async (tracks, selectedGenre, selectedType, setTracks, setLoading) => {
    if (!socketRef.current || !roomIdRef.current) {
      console.error('Cannot load track: socket or roomId not available')
      return
    }

    let tracksToUse = tracks
    if (tracksToUse.length === 0) {
      console.log('Host: No tracks in state, loading tracks...')
      setLoading(true)
      try {
        const fetchedTracks = await getRandomTracks(50, selectedGenre, 'any', selectedType)
        const tracksWithPreview = fetchedTracks.filter(track => track.preview_url)
        console.log(`Host: Loaded ${fetchedTracks.length} tracks, ${tracksWithPreview.length} with preview URLs`)
        
        if (tracksWithPreview.length > 0) {
          setTracks(tracksWithPreview)
          tracksToUse = tracksWithPreview
        } else {
          console.error('Host: No tracks with preview URLs found')
          setLoading(false)
          return
        }
      } catch (error) {
        console.error('Host: Error loading tracks:', error)
        setLoading(false)
        return
      } finally {
        setLoading(false)
      }
    }

    // Wait a bit for state to update
    setTimeout(() => {
      if (tracksToUse.length > 0) {
        const randomIndex = Math.floor(Math.random() * tracksToUse.length)
        const track = tracksToUse[randomIndex]
        
        if (!track.preview_url) {
          console.error('Selected track has no preview URL')
          return
        }

        const mode = Math.random() < 0.5 ? 'song' : 'artist'
        const distractorPool = tracksToUse.filter((_, idx) => idx !== randomIndex)
        const distractors = pickDistractors(track, distractorPool, mode, 3)
        const builtOptions = buildOptionsList(track, distractors, mode)
        const shuffledOptions = shuffleArray(builtOptions)

        console.log('=== SENDING ROUND DATA TO SERVER ===')
        socketRef.current.emit('set-round-data', {
          roomId: roomIdRef.current,
          track,
          options: shuffledOptions,
          gameMode: mode
        })
        console.log('=== ROUND DATA SENT ===')
      }
    }, 100)
  }

  const submitAnswer = (answerIndex, timeTaken) => {
    if (socketRef.current && roomIdRef.current) {
      socketRef.current.emit('submit-answer', {
        roomId: roomIdRef.current,
        answerIndex,
        timeTaken
      })
    }
  }

  const setPlayerReady = () => {
    if (socketRef.current && roomIdRef.current) {
      console.log('Sending player-ready:', roomIdRef.current)
      socketRef.current.emit('player-ready', { roomId: roomIdRef.current })
    }
  }

  return {
    roomId,
    roomCode,
    players,
    currentRound,
    gameOver,
    finalLeaderboard,
    roomIdRef,
    isMultiplayerRef,
    loadAndSendTrack,
    submitAnswer,
    setPlayerReady,
    setRoomId,
    setRoomCode,
    setPlayers,
    setCurrentRound,
    setGameOver,
    setFinalLeaderboard
  }
}

