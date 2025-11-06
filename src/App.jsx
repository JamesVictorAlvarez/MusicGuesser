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
  const [gameStarted, setGameStarted] = useState(false)
  const [selectedGenre, setSelectedGenre] = useState('any')
  const [selectedType, setSelectedType] = useState('any')
  const [timePlayed, setTimePlayed] = useState(0)
  const [autoStartIn, setAutoStartIn] = useState(null)
  const [audioStarted, setAudioStarted] = useState(false)

  // Round tracking (for both single and multiplayer)
  const [currentRound, setCurrentRound] = useState(0)
  
  // Multiplayer state
  const [isMultiplayer, setIsMultiplayer] = useState(false)
  const [roomId, setRoomId] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [players, setPlayers] = useState([])
  const [gameOver, setGameOver] = useState(false)
  const [finalLeaderboard, setFinalLeaderboard] = useState([])

  const roomIdRef = useRef('')
  const isMultiplayerRef = useRef(false)
  const socketIdRef = useRef(null)

  // Hooks
  const { socket, socketConnected, socketError, socketId } = useSocket()
  const { tracks, setTracks, loading, setLoading, loadTracks } = useTracks()
  const { audioRef, roundStartAtRef, startAudioPlayback, startAutoPlayCountdown, stopAudio, getElapsedTime, clearTimers } = useAudio()

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
      setRoomId(data.roomId)
      roomIdRef.current = data.roomId
      setRoomCode(data.roomId)
      setView('multiplayer-lobby')
    })

    socketInstance.on('room-joined', (data) => {
      console.log('Room joined:', data)
      setRoomId(data.roomId)
      roomIdRef.current = data.roomId
      setView('multiplayer-lobby')
    })

    socketInstance.on('room-updated', (data) => {
      console.log('Room updated:', data)
      if (data.players && Array.isArray(data.players)) {
        setPlayers(data.players)
      }
      setCurrentRound(data.currentRound || 0)
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
        const fetchedTracks = await loadTracks(selectedGenre, selectedType)
        if (fetchedTracks.length > 0) {
          setTracks(fetchedTracks)
          tracksToUse = fetchedTracks
        } else {
          setLoading(false)
          return
        }
        setLoading(false)
      }
      
      // Host: Load and send new track
      setTimeout(() => {
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
      
      if (!data.track) return
      
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
      setSelectedIdx(null)
      setTimePlayed(0)
      setIsCorrect(null)
      setAudioStarted(false)
      setLoading(false)
      
      if (data.track && data.track.id) {
        setTracks(prev => prev.filter(t => t.id !== data.track.id))
      }
      
      startAutoPlayCountdown(5, setAutoStartIn, () => {
        startAudioPlayback(() => {
          if (!showAnswer) {
            setIsCorrect(false)
            setShowAnswer(true)
            stopAudio()
            setTimeout(() => {
              setCurrentTrack(null)
            }, 3000)
          }
        })
      })
    })

    socketInstance.on('game-over', (data) => {
      console.log('Game over:', data)
      setFinalLeaderboard(data.players)
      setGameOver(true)
      setView('multiplayer-results')
    })

    socketInstance.on('room-error', (data) => {
      console.error('Room error:', data)
      alert(data.message)
    })

    return () => {
      if (socketInstance) {
        socketInstance.off('room-created')
        socketInstance.off('room-joined')
        socketInstance.off('room-updated')
        socketInstance.off('game-started')
        socketInstance.off('load-round')
        socketInstance.off('round-started')
        socketInstance.off('game-over')
        socketInstance.off('room-error')
      }
    }
  }, [tracks, selectedGenre, selectedType, view, showAnswer, loadTracks, setTracks, setLoading])

  // Load tracks when game starts (single player only)
  useEffect(() => {
    if (gameStarted && !isMultiplayer && tracks.length === 0) {
      loadTracks(selectedGenre, selectedType)
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
  }, [currentTrack, gameStarted, audioRef])

  const loadNewTrack = (tracksToUse = null) => {
    const tracksPool = tracksToUse || tracks
    if (tracksPool.length === 0) {
      console.warn('No tracks available to load')
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
    
    const currentRoomId = roomIdRef.current || roomId
    const currentIsMultiplayer = isMultiplayerRef.current || isMultiplayer
    const socketInstance = getSocket()
    const shouldSendToServer = currentIsMultiplayer && currentRoomId && socketInstance && socketInstance.connected
    
    if (shouldSendToServer) {
      console.log('=== SENDING ROUND DATA TO SERVER ===')
      socketInstance.emit('set-round-data', {
        roomId: currentRoomId,
        track,
        options: shuffledOptions,
        gameMode: mode
      })
      console.log('=== ROUND DATA SENT ===')
    } else if (!currentIsMultiplayer) {
      setCurrentTrack(track)
      setOptions(shuffledOptions)
      startAutoPlayCountdown(5, setAutoStartIn, () => {
        startAudioPlayback(() => {
          if (!showAnswer) {
            setIsCorrect(false)
            setShowAnswer(true)
            stopAudio()
            setTimeout(() => {
              setCurrentTrack(null)
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
    setShowAnswer(true)
    
    const elapsedSec = typeof timePlayed === 'number' && timePlayed > 0
      ? timePlayed
      : getElapsedTime()
    
    const socketInstance = getSocket()
    const currentRoomId = roomIdRef.current || roomId
    
    if (isMultiplayer && currentRoomId && socketInstance) {
      socketInstance.emit('submit-answer', {
        roomId: currentRoomId,
        answerIndex: idx,
        timeTaken: elapsedSec
      })
      // Stop audio and clear timers to avoid late timeouts affecting next rounds
      stopAudio()
    } else {
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
      
      if (nextRound >= 10) {
        // Game over for single player
        setGameOver(true)
        setGameStarted(false)
        setCurrentTrack(null)
        return
      }
    }
    
    if (tracks.length === 0) {
      loadTracks(selectedGenre, selectedType).then(() => {
        setCurrentTrack(null)
      })
    } else {
      setCurrentTrack(null)
    }
  }

  const handleLeave = () => {
    setGameMode(null)
    setCurrentTrack(null)
    setTracks([])
    setIsCorrect(null)
    setShowAnswer(false)
    setGameStarted(false)
    setScore(0)
    setTimePlayed(0)
    setSelectedIdx(null)
    setOptions([])
    setView('menu')
    setIsMultiplayer(false)
    setRoomId('')
    setRoomCode('')
    setPlayers([])
    setCurrentRound(0)
    setGameOver(false)
    setFinalLeaderboard([])
    clearTimers()
    stopAudio()
  }

  const handlePlayerReady = () => {
    const socketInstance = getSocket()
    const currentRoomId = roomIdRef.current || roomId
    if (socketInstance && currentRoomId) {
      socketInstance.emit('player-ready', { roomId: currentRoomId })
    }
  }

  const handleMultiplayerLeave = () => {
    const socketInstance = getSocket()
    if (socketInstance) {
      socketInstance.disconnect()
    }
    handleLeave()
  }

  // View routing
  if (view === 'menu') {
    return (
      <Menu
        selectedGenre={selectedGenre}
        selectedType={selectedType}
        onGenreChange={({ genre, type }) => {
          setSelectedGenre(genre)
          setSelectedType(type)
        }}
        onPlaySolo={({ genre, type }) => {
          setSelectedGenre(genre)
          setSelectedType(type)
          setIsMultiplayer(false)
          setCurrentRound(1)
          setGameOver(false)
          setScore(0)
          setView('game')
          setGameStarted(true)
        }}
        onPlayMultiplayer={() => {
          setIsMultiplayer(true)
          setView('multiplayer-menu')
        }}
        onSettings={() => setView('settings')}
      />
    )
  }

  if (view === 'settings') {
    return <Settings onBack={() => setView('menu')} />
  }

  if (view === 'multiplayer-menu') {
    return (
      <MultiplayerMenu
        socketConnected={socketConnected}
        socketError={socketError}
        onBack={() => setView('menu')}
      />
    )
  }

  if (view === 'multiplayer-lobby') {
    return (
      <MultiplayerLobby
        roomCode={roomCode}
        players={players}
        socketId={socketIdRef.current}
        onLeave={handleMultiplayerLeave}
        onReady={handlePlayerReady}
      />
    )
  }

  if (view === 'multiplayer-results') {
    return (
      <MultiplayerResults
        leaderboard={finalLeaderboard}
        onBackToMenu={() => {
          handleLeave()
        }}
      />
    )
  }

  // Show single player results if game is over
  if (!isMultiplayer && gameOver && view === 'game') {
    return (
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
  }

  // Game view (single player or multiplayer)
  if (view === 'game' || view === 'multiplayer-game') {
    if (loading && !currentTrack) {
      return (
        <div className="app">
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading tracks...</p>
          </div>
        </div>
      )
    }

    if (!currentTrack && tracks.length === 0 && !loading) {
      return (
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
    }

    return (
      <Game
        gameMode={gameMode}
        currentTrack={currentTrack}
        options={options}
        selectedIdx={selectedIdx}
        showAnswer={showAnswer}
        isCorrect={isCorrect}
        score={score}
        timePlayed={timePlayed}
        autoStartIn={autoStartIn}
        audioRef={audioRef}
        isMultiplayer={isMultiplayer}
        currentRound={currentRound}
        players={players}
        audioStarted={audioStarted}
        onChoice={handleChoice}
        onLeave={handleLeave}
        onTimeUpdate={setTimePlayed}
      />
    )
  }

  return null
}

export default App
