import { useState, useEffect, useRef } from 'react'
import { getRandomTracks } from './services/spotify'
import { getSocket, initializeSocket } from './utils/socket'
import { useSocket } from './hooks/useSocket'
import { useTracks } from './hooks/useTracks'
import { useAudio } from './hooks/useAudio'
import { pickDistractors, buildOptionsList, shuffleArray } from './utils/gameLogic'

// Components
import Menu from './components/Menu'
import Settings from './components/Settings'
import Game from './components/Game'
import MultiplayerMenu from './components/multiplayer/MultiplayerMenu'
import MultiplayerLobby from './components/multiplayer/MultiplayerLobby'
import MultiplayerResults from './components/multiplayer/MultiplayerResults'
import Toast from './components/Toast'

import './App.css'
import './multiplayer.css'

function App() {
  const [view, setView] = useState('menu')
  const [gameMode, setGameMode] = useState(null)
  const [currentTrack, setCurrentTrack] = useState(null)
  const [options, setOptions] = useState([])
  const [selectedIdx, setSelectedIdx] = useState(null)
  const [isCorrect, setIsCorrect] = useState(null)
  const [score, setScore] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [hasSubmittedAnswer, setHasSubmittedAnswer] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
  const [selectedGenre, setSelectedGenre] = useState('any')
  const [selectedType, setSelectedType] = useState('any')
  const [timePlayed, setTimePlayed] = useState(0)
  const [autoStartIn, setAutoStartIn] = useState(null)
  const [audioStarted, setAudioStarted] = useState(false)
  
  // Volume state (persisted in localStorage)
  const [volume, setVolume] = useState(() => {
    const savedVolume = localStorage.getItem('musicGuesserVolume')
    return savedVolume !== null ? parseFloat(savedVolume) : 1.0
  })

  // Round tracking (for both single and multiplayer)
  const [currentRound, setCurrentRound] = useState(0)
  const [totalRounds, setTotalRounds] = useState(10)
  
  // Multiplayer state
  const [isMultiplayer, setIsMultiplayer] = useState(false)
  const [roomId, setRoomId] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [players, setPlayers] = useState([])
  const [hostId, setHostId] = useState(null)
  const [gameOver, setGameOver] = useState(false)
  const [finalLeaderboard, setFinalLeaderboard] = useState([])
  const [toast, setToast] = useState(null)
  const [playerAnswers, setPlayerAnswers] = useState([])

  const roomIdRef = useRef('')
  const isMultiplayerRef = useRef(false)
  const socketIdRef = useRef(null)
  const hasLeftRoomRef = useRef(false)
  const currentTrackIdRef = useRef(null)

  // Hooks
  const { socket, socketConnected, socketError, socketId } = useSocket()
  const { tracks, setTracks, loading, setLoading, loadTracks } = useTracks()
  const { audioRef, roundStartAtRef, startAudioPlayback, startAutoPlayCountdown, stopAudio, getElapsedTime, clearTimers } = useAudio(volume)

  // Handle volume change
  const handleVolumeChange = (newVolume) => {
    setVolume(newVolume)
    localStorage.setItem('musicGuesserVolume', newVolume.toString())
    // Apply volume to current audio element if it exists
    if (audioRef.current) {
      audioRef.current.volume = newVolume
    }
  }

  // Update socketId ref when socket connects
  useEffect(() => {
    if (socketId) {
      socketIdRef.current = socketId
    }
  }, [socketId])

  // Socket event listeners for multiplayer
  useEffect(() => {
    const socketInstance = getSocket()
    if (!socketInstance) return

    socketInstance.on('room-created', (data) => {
      console.log('Room created:', data)
      hasLeftRoomRef.current = false
      // Reset game state for new room
      setGameStarted(false)
      setCurrentTrack(null)
      setShowAnswer(false)
      setHasSubmittedAnswer(false)
      setSelectedIdx(null)
      setOptions([])
      setCurrentRound(0)
      setGameOver(false)
      setFinalLeaderboard([])
      setLoading(false) // Clear loading state
      setPlayerAnswers([]) // Clear player answers
      setRoomId(data.roomId)
      roomIdRef.current = data.roomId
      setRoomCode(data.roomId)
      // When creating a room, the creator is the host
      if (socketIdRef.current) {
        setHostId(socketIdRef.current)
      }
      setView('multiplayer-lobby')
    })

    socketInstance.on('room-joined', (data) => {
      console.log('Room joined:', data)
      hasLeftRoomRef.current = false
      // Reset game state for new room
      setGameStarted(false)
      setCurrentTrack(null)
      setShowAnswer(false)
      setHasSubmittedAnswer(false)
      setSelectedIdx(null)
      setOptions([])
      setCurrentRound(0)
      setGameOver(false)
      setFinalLeaderboard([])
      setLoading(false) // Clear loading state
      setPlayerAnswers([]) // Clear player answers
      setRoomId(data.roomId)
      roomIdRef.current = data.roomId
      // hostId will be set from the first room-updated event
      setView('multiplayer-lobby')
    })

    socketInstance.on('room-updated', (data) => {
      console.log('Room updated:', data)
      
      // Ignore if player has left the room
      if (hasLeftRoomRef.current) {
        console.log('Ignoring room-updated event - player has left the room')
        return
      }
      
      if (data.players && Array.isArray(data.players)) {
        setPlayers(data.players)
      }
      // Update player answers for showing who chose what
      if (data.answers && Array.isArray(data.answers)) {
        setPlayerAnswers(data.answers)
      }
      // Always update hostId if it's provided - this is critical for showing/hiding leave button
      if (data.hostId !== undefined && data.hostId !== null) {
        setHostId(data.hostId)
        console.log('Updated hostId from room-updated:', data.hostId, 'current socketId:', socketIdRef.current, 'isHost:', data.hostId === socketIdRef.current)
      } else {
        console.warn('room-updated event missing hostId!', data)
      }
      setCurrentRound(data.currentRound || 0)
      // Update genre, type, and rounds from room state
      if (data.genre !== undefined) {
        setSelectedGenre(data.genre)
      }
      if (data.type !== undefined) {
        setSelectedType(data.type)
      }
      if (data.totalRounds !== undefined) {
        setTotalRounds(data.totalRounds)
      }
      if (data.gameOver) {
        setGameOver(true)
      }
    })

    socketInstance.on('game-started', () => {
      console.log('Game started event received')
      setView('multiplayer-game')
      setGameStarted(true)
      setIsMultiplayer(true)
      isMultiplayerRef.current = true
    })

    socketInstance.on('load-round', async (data) => {
      console.log('=== LOAD-ROUND EVENT RECEIVED ===')
      console.log('Current tracks in state:', tracks.length, 'isHost:', data.isHost)
      console.log('hasLeftRoomRef:', hasLeftRoomRef.current)
      console.log('roomIdRef.current:', roomIdRef.current)
      console.log('isMultiplayer:', isMultiplayer)
      
      // Ignore if player has left the room - CHECK THIS FIRST
      if (hasLeftRoomRef.current) {
        console.log('IGNORING load-round event - player has left the room')
        return
      }
      
      // Double check: if we don't have a valid room ID, ignore and clear loading
      const currentRoomId = roomIdRef.current || roomId
      if (!currentRoomId) {
        console.log('IGNORING load-round event - no room ID, clearing loading state')
        setLoading(false)
        return
      }
      
      if (view !== 'multiplayer-game') {
        setView('multiplayer-game')
        setGameStarted(true)
        setIsMultiplayer(true)
      }
      
      if (!data.isHost) {
        console.log('Not host - waiting for round-started event...')
        setCurrentTrack(null)
        setOptions([])
        setLoading(true)
        return
      }
      
      // Host: Load tracks if needed
      let tracksToUse = tracks
      if (tracksToUse.length === 0) {
        console.log('Host: Loading tracks...')
        setLoading(true)
        const playlistName = window.__playlistName || null
        try {
          const fetchedTracks = await loadTracks(selectedGenre, selectedType, playlistName)
          // Check again after async operation
          if (hasLeftRoomRef.current || !roomIdRef.current) {
            console.log('IGNORING load-round - player left or no room ID after loading tracks')
            setLoading(false)
            return
          }
          if (fetchedTracks.length > 0) {
            setTracks(fetchedTracks)
            tracksToUse = fetchedTracks
          } else {
            setLoading(false)
            return
          }
        } catch (error) {
          console.error('Error loading tracks:', error)
          setLoading(false)
          return
        }
      }
      
      // Host: Load and send new track
      // Check again before loading track
      if (hasLeftRoomRef.current || !roomIdRef.current) {
        console.log('IGNORING load-round - player left or no room ID before loading track')
        setLoading(false)
        return
      }
      
      // Clear loading state before attempting to load track
      setLoading(false)
      
      setTimeout(() => {
        // Final check before sending data
        if (hasLeftRoomRef.current || !roomIdRef.current) {
          console.log('IGNORING load-round - player left or no room ID in setTimeout')
          return
        }
        if (tracksToUse.length > 0) {
          loadNewTrack(tracksToUse)
        } else if (tracks.length > 0) {
          loadNewTrack()
        }
      }, 100)
    })

    socketInstance.on('round-started', (data) => {
      console.log('=== ROUND-STARTED EVENT RECEIVED ===')
      console.log('Track received:', data.track?.name)
      console.log('hasLeftRoomRef:', hasLeftRoomRef.current)
      
      // Ignore if player has left the room - CHECK THIS FIRST
      if (hasLeftRoomRef.current) {
        console.log('IGNORING round-started event - player has left the room')
        return
      }
      
      if (!data.track) {
        console.log('No track data, ignoring')
        return
      }
      
      // Double check we haven't left
      if (hasLeftRoomRef.current) {
        console.log('IGNORING round-started event - player left during processing')
        return
      }
      
      if (view !== 'multiplayer-game') {
        setView('multiplayer-game')
        setGameStarted(true)
        setIsMultiplayer(true)
      }
      
      // Ensure no timers from previous round are still running
      clearTimers()

      setCurrentTrack(data.track)
      setOptions(data.options || [])
      setGameMode(data.gameMode)
      setShowAnswer(false)
      setHasSubmittedAnswer(false)
      setSelectedIdx(null)
      setTimePlayed(0)
      setIsCorrect(null)
      setAudioStarted(false)
      setLoading(false)
      setPlayerAnswers([]) // Clear answers for new round
      
      // Update track ID ref for timeout validation
      currentTrackIdRef.current = data.track?.id || null
      
      if (data.track && data.track.id) {
        setTracks(prev => prev.filter(t => t.id !== data.track.id))
      }
      
      // Only start countdown if we haven't left
      if (!hasLeftRoomRef.current) {
        const trackId = data.track?.id
        startAutoPlayCountdown(3, setAutoStartIn, () => {
          // Check again before starting audio
          if (hasLeftRoomRef.current) {
            console.log('Player left during countdown, stopping')
            return
          }
          startAudioPlayback(() => {
            // Check if this timeout is still valid for the current track
            if (currentTrackIdRef.current === trackId && !hasLeftRoomRef.current) {
              setIsCorrect(false)
              setShowAnswer(true)
              stopAudio()
              setTimeout(() => {
                if (!hasLeftRoomRef.current && currentTrackIdRef.current === trackId) {
                  setCurrentTrack(null)
                  currentTrackIdRef.current = null
                }
              }, 3000)
            }
          })
        })
      }
    })

    socketInstance.on('all-answers-submitted', () => {
      console.log('All answers submitted - showing answer now')
      // Ignore if player has left the room
      if (hasLeftRoomRef.current) {
        console.log('Ignoring all-answers-submitted event - player has left the room')
        return
      }
      // Now show the answer to all players
      setShowAnswer(true)
    })

    socketInstance.on('game-over', (data) => {
      console.log('Game over:', data)
      
      // Ignore if player has left the room
      if (hasLeftRoomRef.current) {
        console.log('Ignoring game-over event - player has left the room')
        return
      }
      
      setFinalLeaderboard(data.players)
      setGameOver(true)
      setView('multiplayer-results')
    })

    socketInstance.on('room-closed', (data) => {
      console.log('=== ROOM-CLOSED EVENT RECEIVED ===', data)
      
      // Mark that we've left FIRST
      hasLeftRoomRef.current = true
      
      // Stop all game activity immediately
      stopAudio()
      clearTimers()
      setGameStarted(false)
      setCurrentTrack(null)
      setShowAnswer(false)
      setAudioStarted(false)
      setAutoStartIn(null)
      
      // Remove all event listeners
      if (socketInstance) {
        console.log('Removing all socket event listeners after room closed')
        socketInstance.off('room-created')
        socketInstance.off('room-joined')
        socketInstance.off('room-updated')
        socketInstance.off('game-started')
        socketInstance.off('load-round')
        socketInstance.off('round-started')
        socketInstance.off('all-answers-submitted')
        socketInstance.off('game-over')
        socketInstance.off('room-closed')
        socketInstance.off('room-error')
      }
      
      setToast(data.message || 'The room was closed')
      
      // Note: Socket will disconnect automatically when browser closes
      // No need to manually disconnect here
      
      // Clean up state and return to menu
      setGameMode(null)
      setTracks([])
      setIsCorrect(null)
      setScore(0)
      setTimePlayed(0)
      setSelectedIdx(null)
      setOptions([])
      setView('menu')
      setIsMultiplayer(false)
      setRoomId('')
      setRoomCode('')
      setPlayers([])
      setHostId(null)
      setCurrentRound(0)
      setGameOver(false)
      setFinalLeaderboard([])
    })

    socketInstance.on('room-error', (data) => {
      console.error('Room error:', data)
      // If we get a room error, it means we're trying to use a room that doesn't exist
      // Clear room references and reset state
      if (data.message === 'Room not found' || data.message === 'You are not in this room') {
        console.log('Room error detected - clearing room references')
        hasLeftRoomRef.current = true
        roomIdRef.current = ''
        isMultiplayerRef.current = false
        setRoomId('')
        setRoomCode('')
        setGameStarted(false)
        setCurrentTrack(null)
        setShowAnswer(false)
        setHasSubmittedAnswer(false)
        // Don't show alert for these errors as they're likely from cleanup
        return
      }
      setToast(data.message)
    })

    return () => {
      if (socketInstance) {
        socketInstance.off('room-created')
        socketInstance.off('room-joined')
        socketInstance.off('room-updated')
        socketInstance.off('game-started')
        socketInstance.off('load-round')
        socketInstance.off('round-started')
        socketInstance.off('all-answers-submitted')
        socketInstance.off('game-over')
        socketInstance.off('room-closed')
        socketInstance.off('room-error')
      }
    }
  }, [tracks, selectedGenre, selectedType, view, showAnswer, loadTracks, setTracks, setLoading])

  // Load tracks when game starts (single player only)
  useEffect(() => {
    if (gameStarted && !isMultiplayer && tracks.length === 0) {
      const playlistName = window.__playlistName || null
      loadTracks(selectedGenre, selectedType, playlistName)
    }
  }, [gameStarted, isMultiplayer, selectedGenre, selectedType, loadTracks])

  // Load a new track when needed (single player only)
  useEffect(() => {
    if (gameStarted && !isMultiplayer && tracks.length > 0 && !currentTrack) {
      loadNewTrack()
    }
  }, [gameStarted, tracks, currentTrack, isMultiplayer])

  // Auto-stop audio after 10 seconds and track when audio starts
  useEffect(() => {
    if (audioRef.current && gameStarted && currentTrack) {
      const audio = audioRef.current
      
      // Apply volume to audio element
      audio.volume = volume
      
      // Listen for when audio actually starts playing
      const handlePlay = () => {
        setAudioStarted(true)
      }
      
      // Listen for when audio pauses/stops (reset state)
      const handlePause = () => {
        // Don't reset audioStarted here, as it might pause during answer reveal
      }
      
      audio.addEventListener('play', handlePlay)
      audio.addEventListener('pause', handlePause)
      
      const interval = setInterval(() => {
        if (audio.currentTime >= 10) {
          audio.pause()
          setTimePlayed(10)
        } else {
          setTimePlayed(audio.currentTime)
        }
      }, 100)
      
      return () => {
        clearInterval(interval)
        audio.removeEventListener('play', handlePlay)
        audio.removeEventListener('pause', handlePause)
      }
    }
  }, [currentTrack, gameStarted, audioRef, volume])

  const loadNewTrack = (tracksToUse = null) => {
    const tracksPool = tracksToUse || tracks
    if (tracksPool.length === 0) {
      console.warn('No tracks available to load')
      return
    }
    
    const currentRoomId = roomIdRef.current || roomId
    const currentIsMultiplayer = isMultiplayerRef.current || isMultiplayer
    
    // CRITICAL: Check BEFORE doing any work if we should proceed
    if (currentIsMultiplayer && (hasLeftRoomRef.current || !currentRoomId)) {
      console.log('Not loading track - player left room or no room ID in multiplayer')
      return
    }
    
    const randomIndex = Math.floor(Math.random() * tracksPool.length)
    const track = tracksPool[randomIndex]
    
    if (!track.preview_url) {
      console.error('Selected track has no preview URL, skipping')
      return
    }
    
    setIsCorrect(null)
    setShowAnswer(false)
    setHasSubmittedAnswer(false)
    setTimePlayed(0)
    setSelectedIdx(null)
    setAutoStartIn(null)
    setAudioStarted(false)
    roundStartAtRef.current = null
    clearTimers()
    
    const mode = Math.random() < 0.5 ? 'song' : 'artist'
    setGameMode(mode)

    const distractorPool = tracksPool.filter((_, idx) => idx !== randomIndex)
    const distractors = pickDistractors(track, distractorPool, mode, 3)
    const builtOptions = buildOptionsList(track, distractors, mode)
    const shuffledOptions = shuffleArray(builtOptions)
    
    if (!tracksToUse) {
      setTracks(prev => prev.filter((_, idx) => idx !== randomIndex))
    }
    
    const socketInstance = getSocket()
    
    // Final check before sending
    if (currentIsMultiplayer && (hasLeftRoomRef.current || !currentRoomId)) {
      console.log('Not sending round data - player left room or no room ID')
      return
    }
    
    const shouldSendToServer = currentIsMultiplayer && currentRoomId && socketInstance && socketInstance.connected
    
    if (shouldSendToServer) {
      console.log('=== SENDING ROUND DATA TO SERVER ===')
      console.log('Room ID:', currentRoomId)
      socketInstance.emit('set-round-data', {
        roomId: currentRoomId,
        track,
        options: shuffledOptions,
        gameMode: mode
      })
      console.log('=== ROUND DATA SENT ===')
    } else if (!currentIsMultiplayer) {
      // Update track ID ref for timeout validation
      currentTrackIdRef.current = track.id
      setCurrentTrack(track)
      setOptions(shuffledOptions)
      const trackId = track.id
      startAutoPlayCountdown(3, setAutoStartIn, () => {
        startAudioPlayback(() => {
          // Check if this timeout is still valid for the current track
          if (currentTrackIdRef.current === trackId) {
            setIsCorrect(false)
            setShowAnswer(true)
            stopAudio()
            setTimeout(() => {
              if (currentTrackIdRef.current === trackId) {
                setCurrentTrack(null)
                currentTrackIdRef.current = null
              }
            }, 3000)
          }
        })
      })
    }
  }

  const handleChoice = (idx) => {
    if (!currentTrack || showAnswer || !audioStarted) return
    
    setSelectedIdx(idx)
    const chosen = options[idx]
    const correct = !!chosen?.isCorrect
    setIsCorrect(correct)
    
    // Clear track ID ref to prevent timeout from firing
    currentTrackIdRef.current = null
    
    const elapsedSec = typeof timePlayed === 'number' && timePlayed > 0
      ? timePlayed
      : getElapsedTime()
    
    const socketInstance = getSocket()
    const currentRoomId = roomIdRef.current || roomId
    
    if (isMultiplayer && currentRoomId && socketInstance) {
      // In multiplayer, don't show answer immediately - wait for all players
      setHasSubmittedAnswer(true)
      socketInstance.emit('submit-answer', {
        roomId: currentRoomId,
        answerIndex: idx,
        timeTaken: elapsedSec
      })
      // Stop audio and clear timers to avoid late timeouts affecting next rounds
      stopAudio()
    } else {
      // Single player: show answer immediately
      setShowAnswer(true)
      if (correct) {
        // Points in hundreds, with milliseconds counting
        // Max 1000 points at 0 seconds, 0 points at 10 seconds
        const points = Math.max(0, Math.floor((10 - elapsedSec) * 100))
        setScore(prev => prev + points)
      }
      // Show answer for 3 seconds before moving to next song (both correct and incorrect)
      stopAudio()
      setTimeout(() => {
        handleNext()
      }, 3000)
    }
  }

  const handleNext = () => {
    if (!isMultiplayer) {
      // Single player: increment round and check if game is over
      const nextRound = currentRound + 1
      setCurrentRound(nextRound)
      
      if (nextRound > totalRounds) {
        // Game over for single player
        setGameOver(true)
        setGameStarted(false)
        setCurrentTrack(null)
        currentTrackIdRef.current = null
        return
      }
    }
    
    // Clear track ID ref when moving to next round
    currentTrackIdRef.current = null
    
    if (tracks.length === 0) {
      const playlistName = window.__playlistName || null
      loadTracks(selectedGenre, selectedType, playlistName).then(() => {
        setCurrentTrack(null)
      })
    } else {
      setCurrentTrack(null)
    }
  }

  const handleLeave = () => {
    // Mark that we're leaving FIRST
    hasLeftRoomRef.current = true
    
    // Stop all game activity first
    stopAudio()
    clearTimers()
    setGameStarted(false)
    setCurrentTrack(null)
    setShowAnswer(false)
    setHasSubmittedAnswer(false)
    setAudioStarted(false)
    setAutoStartIn(null)
    currentTrackIdRef.current = null
    
    // Leave the room on the server if we're in multiplayer
    const socketInstance = getSocket()
    const currentRoomId = roomIdRef.current || roomId
    if (isMultiplayer && currentRoomId && socketInstance) {
      console.log('Leaving room:', currentRoomId)
      socketInstance.emit('leave-room', { roomId: currentRoomId })
    }
    
    // CRITICAL: Clear room references to prevent sending data to old rooms
    roomIdRef.current = ''
    isMultiplayerRef.current = false
    
    // Clean up all state
    setGameMode(null)
    setTracks([])
    setIsCorrect(null)
    setScore(0)
    setTimePlayed(0)
    setSelectedIdx(null)
    setOptions([])
    setView('menu')
    setIsMultiplayer(false)
    setRoomId('')
    setRoomCode('')
    setPlayers([])
    setHostId(null)
    setCurrentRound(0)
    setGameOver(false)
    setFinalLeaderboard([])
    setPlayerAnswers([]) // Clear player answers
  }

  const handlePlayerReady = () => {
    const socketInstance = getSocket()
    const currentRoomId = roomIdRef.current || roomId
    if (socketInstance && currentRoomId) {
      socketInstance.emit('player-ready', { roomId: currentRoomId })
    }
  }


  // View routing
  let content = null

  if (view === 'menu') {
    content = (
      <Menu
        selectedGenre={selectedGenre}
        selectedType={selectedType}
        onGenreChange={({ genre, type }) => {
          setSelectedGenre(genre)
          setSelectedType(type)
        }}
        onPlaySolo={({ genre, type, rounds, playlistName }) => {
          setSelectedGenre(genre)
          setSelectedType(type)
          setTotalRounds(rounds || 10)
          setIsMultiplayer(false)
          setCurrentRound(1)
          setGameOver(false)
          setScore(0)
          setView('game')
          setGameStarted(true)
          // Store search term for track loading
          if (playlistName) {
            // We'll pass this to loadTracks when needed
            window.__playlistName = playlistName
          } else {
            window.__playlistName = null
          }
        }}
        onPlayMultiplayer={() => {
          setIsMultiplayer(true)
          setView('multiplayer-menu')
        }}
        onSettings={() => setView('settings')}
      />
    )
  } else if (view === 'settings') {
    content = (
      <Settings 
        onBack={() => setView('menu')}
        volume={volume}
        onVolumeChange={handleVolumeChange}
      />
    )
  } else if (view === 'multiplayer-menu') {
    content = (
      <MultiplayerMenu
        socketConnected={socketConnected}
        socketError={socketError}
        onBack={() => setView('menu')}
      />
    )
  } else if (view === 'multiplayer-lobby') {
    content = (
      <MultiplayerLobby
        roomCode={roomCode}
        players={players}
        socketId={socketIdRef.current || socketId}
        hostId={hostId}
        onReady={handlePlayerReady}
        genre={selectedGenre}
        type={selectedType}
        totalRounds={totalRounds}
      />
    )
  } else if (view === 'multiplayer-results') {
    content = (
      <MultiplayerResults
        leaderboard={finalLeaderboard}
        onBackToMenu={() => {
          handleLeave()
        }}
      />
    )
  } else if (!isMultiplayer && gameOver && view === 'game') {
    content = (
      <div className="app">
        <div className="game-container">
          <div className="header">
            <h1>Game Over!</h1>
          </div>
          <div className="leaderboard">
            <h2>Final Score</h2>
            <div className="leaderboard-list">
              <div className="leaderboard-item winner">
                <div className="rank">#1</div>
                <div className="player-info">
                  <span className="player-name">You</span>
                </div>
                <div className="player-score">{score} pts</div>
              </div>
            </div>
            <button
              className="menu-btn menu-btn-primary"
              onClick={handleLeave}
            >
              Back to Menu
            </button>
          </div>
        </div>
      </div>
    )
  } else if (view === 'game' || view === 'multiplayer-game') {
    if (loading && !currentTrack) {
      content = (
        <div className="app">
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading tracks...</p>
          </div>
        </div>
      )
    } else if (!currentTrack && tracks.length === 0 && !loading) {
      content = (
        <div className="app">
          <div className="error">
            <h2>No tracks available</h2>
            <div className="error-details">
              <p>This could be due to:</p>
              <ul>
                <li>Spotify API credentials not set in <code>.env</code> file</li>
                <li>Invalid Client ID or Client Secret</li>
                <li>No tracks with preview URLs found (preview availability varies by region)</li>
                <li>API rate limits or connection issues</li>
              </ul>
              <p className="debug-info">Check the browser console (F12) for detailed error messages.</p>
            </div>
            <button onClick={handleLeave} className="reset-btn">Go Back</button>
          </div>
        </div>
      )
    } else {
      content = (
        <Game
          gameMode={gameMode}
          currentTrack={currentTrack}
          options={options}
          selectedIdx={selectedIdx}
          showAnswer={showAnswer}
          hasSubmittedAnswer={hasSubmittedAnswer}
          isCorrect={isCorrect}
          score={score}
          timePlayed={timePlayed}
          autoStartIn={autoStartIn}
          audioRef={audioRef}
          isMultiplayer={isMultiplayer}
          currentRound={currentRound}
          totalRounds={totalRounds}
          players={players}
          playerAnswers={playerAnswers}
          socketId={socketIdRef.current || socketId}
          audioStarted={audioStarted}
          onChoice={handleChoice}
          onLeave={handleLeave}
          onTimeUpdate={setTimePlayed}
        />
      )
    }
  }

  return (
    <>
      {toast && (
        <Toast
          message={toast}
          onClose={() => setToast(null)}
          duration={4000}
        />
      )}
      {content}
    </>
  )
}

export default App
