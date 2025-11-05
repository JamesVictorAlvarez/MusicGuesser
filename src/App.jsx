import { useState, useEffect, useRef } from 'react'
import { getRandomTracks, getPlaylistCoverForGenre } from './services/spotify'
import { io } from 'socket.io-client'
import './App.css'
import './multiplayer.css'

let socket = null
try {
  socket = io('http://localhost:3001', { autoConnect: false })
} catch (e) {
  console.warn('Socket.io not available')
}

function App() {
  const [gameMode, setGameMode] = useState(null) // 'song' or 'artist' (set per round)
  const [view, setView] = useState('menu') // 'menu' | 'settings' | 'game' | 'multiplayer-menu' | 'multiplayer-game'
  const [currentTrack, setCurrentTrack] = useState(null)
  const [tracks, setTracks] = useState([])
  const [guess, setGuess] = useState('')
  const [options, setOptions] = useState([]) // { label, sublabel, isCorrect }
  const [selectedIdx, setSelectedIdx] = useState(null)
  const [isCorrect, setIsCorrect] = useState(null)
  const [score, setScore] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedGenre, setSelectedGenre] = useState('any')
  const [selectedType, setSelectedType] = useState('any')
  const [genreCovers, setGenreCovers] = useState({})
  const audioRef = useRef(null)
  const [timePlayed, setTimePlayed] = useState(0)
  const [autoStartIn, setAutoStartIn] = useState(null) // seconds until auto play
  const roundStartAtRef = useRef(null)
  const countdownIntervalRef = useRef(null)
  const autoStartTimeoutRef = useRef(null)
  const roundAutoEndTimeoutRef = useRef(null)
  
  // Multiplayer state
  const [isMultiplayer, setIsMultiplayer] = useState(false)
  const [roomId, setRoomId] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [players, setPlayers] = useState([])
  const [currentRound, setCurrentRound] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [finalLeaderboard, setFinalLeaderboard] = useState([])
  const [socketConnected, setSocketConnected] = useState(false)
  const [socketError, setSocketError] = useState(null)
  const socketIdRef = useRef(null)
  const roomIdRef = useRef('')
  const isMultiplayerRef = useRef(false)

  // Socket event listeners
  useEffect(() => {
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
      socketIdRef.current = socket.id
    })

    socket.on('disconnect', () => {
      console.log('Socket disconnected')
      setSocketConnected(false)
    })

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
      setSocketConnected(false)
      setSocketError(`Cannot connect to server. Make sure the server is running on port 3001.`)
    })
    
    socket.on('room-created', (data) => {
      console.log('Room created:', data)
      setRoomId(data.roomId)
      roomIdRef.current = data.roomId
      setRoomCode(data.roomId)
      setView('multiplayer-lobby')
    })

    socket.on('room-joined', (data) => {
      console.log('Room joined:', data)
      setRoomId(data.roomId)
      roomIdRef.current = data.roomId
      setView('multiplayer-lobby')
    })

    socket.on('room-updated', (data) => {
      console.log('Room updated:', data)
      // Update players with their scores
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
      console.log('Setting view to multiplayer-game')
      setView('multiplayer-game')
      setGameStarted(true)
      setIsMultiplayer(true) // Ensure multiplayer flag is set
      isMultiplayerRef.current = true
      console.log('Game started - isMultiplayer:', true, 'roomId:', roomIdRef.current)
    })

    socket.on('load-round', async (data) => {
      console.log('=== LOAD-ROUND EVENT RECEIVED ===')
      console.log('Socket ID:', socket.id)
      console.log('Load round event received:', data)
      console.log('Current tracks in state:', tracks.length, 'isHost:', data.isHost)
      console.log('Current view:', view)
      
      // Ensure we're in the game view for all players
      if (view !== 'multiplayer-game') {
        console.log('Setting view to multiplayer-game (was:', view, ')')
        setView('multiplayer-game')
        setGameStarted(true)
        setIsMultiplayer(true)
      }
      
      // Only the host loads and sends track data
      // Other players wait for round-started event
      if (!data.isHost) {
        console.log('Not host - waiting for round-started event...')
        console.log('Clearing current track and options...')
        // Clear current track to show loading state
        setCurrentTrack(null)
        setOptions([])
        setLoading(true)
        console.log('=== WAITING FOR ROUND-STARTED ===')
        return
      }
      
      // Host: Load tracks if we don't have any
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
            console.log('Host: Tracks set in state, sample track:', tracksWithPreview[0]?.name)
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
      
      // Host: Load and send new track
      // Use a small delay to ensure state is updated
      setTimeout(() => {
        // Ensure multiplayer state is set
        if (!isMultiplayer) {
          console.log('Host: Setting isMultiplayer to true')
          setIsMultiplayer(true)
        }
        if (!roomId && socket) {
          console.log('Host: roomId not set, checking...')
        }
        console.log('Host: isMultiplayer:', isMultiplayer, 'roomId:', roomId, 'socket:', !!socket)
        
        if (tracksToUse.length > 0) {
          console.log('Host: Using tracks, calling loadNewTrack with', tracksToUse.length, 'tracks')
          loadNewTrack(tracksToUse)
        } else if (tracks.length > 0) {
          console.log('Host: Using tracks from state, calling loadNewTrack with', tracks.length, 'tracks')
          loadNewTrack()
        } else {
          console.error('Host: No tracks available to load new track')
        }
      }, 100)
    })

    socket.on('round-started', (data) => {
      console.log('=== ROUND-STARTED EVENT RECEIVED ===')
      console.log('Socket ID:', socket.id)
      console.log('Round started event received:', data)
      console.log('Track received:', data.track?.name, 'Preview URL:', data.track?.preview_url)
      console.log('Options count:', data.options?.length)
      console.log('Current view:', view)
      
      if (!data.track) {
        console.error('round-started received but no track data!')
        return
      }
      
      // Ensure we're in the game view
      if (view !== 'multiplayer-game') {
        console.log('Setting view to multiplayer-game (was:', view, ')')
        setView('multiplayer-game')
        setGameStarted(true)
        setIsMultiplayer(true)
      }
      
      // All players receive the same track data
      console.log('Setting track and options in state...')
      setCurrentTrack(data.track)
      setOptions(data.options || [])
      setGameMode(data.gameMode)
      setShowAnswer(false)
      setSelectedIdx(null)
      setTimePlayed(0)
      setIsCorrect(null)
      setLoading(false)
      
      // Remove track from local pool if it exists (for host's track pool)
      if (data.track && data.track.id) {
        setTracks(prev => prev.filter(t => t.id !== data.track.id))
      }
      
      // Start the countdown and audio for all players
      console.log('Starting auto-play countdown for all players')
      startAutoPlayCountdown(5)
      console.log('=== ROUND-STARTED HANDLING COMPLETE ===')
    })

    socket.on('game-over', (data) => {
      console.log('Game over:', data)
      setFinalLeaderboard(data.players)
      setGameOver(true)
      setView('multiplayer-results')
    })

    socket.on('room-error', (data) => {
      console.error('Room error:', data)
      alert(data.message)
    })

    return () => {
      if (socket) {
        socket.off('connect')
        socket.off('disconnect')
        socket.off('connect_error')
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
  }, []) // Empty dependency array - listeners should always be active

  // Load playlist covers when menu is shown
  useEffect(() => {
    if (view === 'menu') {
      const genres = ['pop', 'rock', 'hip-hop', 'indie', 'electronic', 'r-n-b', 'dance', 'latin', 'country', 'jazz', 'metal', 'k-pop', 'j-pop', 'opm']
      genres.forEach(async (genre) => {
        if (!genreCovers[genre]) {
          const cover = await getPlaylistCoverForGenre(genre)
          if (cover) {
            setGenreCovers(prev => ({ ...prev, [genre]: cover }))
          }
        }
      })
    }
  }, [view])

  // Load tracks when game starts (single player only)
  useEffect(() => {
    if (gameStarted && !isMultiplayer && tracks.length === 0) {
      loadTracks()
    }
  }, [gameStarted, isMultiplayer])

  // Load a new track when needed (single player only)
  useEffect(() => {
    if (gameStarted && !isMultiplayer && tracks.length > 0 && !currentTrack) {
      loadNewTrack()
    }
  }, [gameStarted, tracks, currentTrack, isMultiplayer])

  // Auto-stop audio after 10 seconds
  useEffect(() => {
    if (audioRef.current && gameStarted && currentTrack) {
      const audio = audioRef.current
      const interval = setInterval(() => {
        if (audio.currentTime >= 10) {
          audio.pause()
          setTimePlayed(10)
        } else {
          setTimePlayed(audio.currentTime)
        }
      }, 100)

      return () => clearInterval(interval)
    }
  }, [currentTrack, gameStarted])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      clearInterval(countdownIntervalRef.current)
      clearTimeout(autoStartTimeoutRef.current)
      clearTimeout(roundAutoEndTimeoutRef.current)
    }
  }, [])

  const loadTracks = async () => {
    setLoading(true)
    try {
      const fetchedTracks = await getRandomTracks(50, selectedGenre, 'any', selectedType)
      // Filter tracks that have preview URLs
      const tracksWithPreview = fetchedTracks.filter(track => track.preview_url)
      console.log(`Loaded ${fetchedTracks.length} tracks, ${tracksWithPreview.length} with preview URLs`)
      
      if (tracksWithPreview.length === 0 && fetchedTracks.length > 0) {
        console.warn('Tracks loaded but none have preview URLs. This might be a region/content availability issue.')
      }
      
      setTracks(tracksWithPreview)
    } catch (error) {
      console.error('Error loading tracks:', error)
      setTracks([])
    } finally {
      setLoading(false)
    }
  }

  const loadNewTrack = (tracksToUse = null) => {
    const tracksPool = tracksToUse || tracks
    if (tracksPool.length === 0) {
      console.warn('No tracks available to load')
      return
    }
    
    console.log(`Loading new track from pool of ${tracksPool.length} tracks`)
    const randomIndex = Math.floor(Math.random() * tracksPool.length)
    const track = tracksPool[randomIndex]
    console.log('Selected track:', track.name, 'Preview URL:', track.preview_url)
    
    if (!track.preview_url) {
      console.error('Selected track has no preview URL, skipping')
      return
    }
    
    setGuess('')
    setIsCorrect(null)
    setShowAnswer(false)
    setTimePlayed(0)
    setSelectedIdx(null)
    setAutoStartIn(null)
    roundStartAtRef.current = null
    clearInterval(countdownIntervalRef.current)
    clearTimeout(autoStartTimeoutRef.current)
    clearTimeout(roundAutoEndTimeoutRef.current)
    
    // Randomly choose mode each round (song or artist)
    const mode = Math.random() < 0.5 ? 'song' : 'artist'
    setGameMode(mode)

    // Build options (3 distractors + 1 correct)
    const distractorPool = tracksPool.filter((_, idx) => idx !== randomIndex)
    const distractors = pickDistractors(track, distractorPool, mode, 3)
    const builtOptions = buildOptionsList(track, distractors, mode)
    const shuffledOptions = shuffleArray(builtOptions)
    
    console.log('Built options:', shuffledOptions.map(opt => ({ label: opt.label, isCorrect: opt.isCorrect })))
    
    // Remove the track from the pool so it doesn't repeat
    if (!tracksToUse) {
      // Only update state if we're using state tracks (not passed-in tracks)
      setTracks(prev => prev.filter((_, idx) => idx !== randomIndex))
    }
    
    // Check multiplayer state - use refs to avoid closure issues
    const currentRoomId = roomIdRef.current || roomId
    const currentIsMultiplayer = isMultiplayerRef.current || isMultiplayer
    const shouldSendToServer = currentIsMultiplayer && currentRoomId && socket && socket.connected
    
    console.log('loadNewTrack - Checking multiplayer state:', {
      isMultiplayer: currentIsMultiplayer,
      roomId: currentRoomId,
      socket: !!socket,
      connected: socket?.connected,
      shouldSend: shouldSendToServer
    })
    
    if (shouldSendToServer) {
      // Send track data to server for synchronization
      console.log('=== SENDING ROUND DATA TO SERVER ===')
      console.log('Sending round data to server:', { 
        roomId: currentRoomId, 
        track: track.name, 
        mode, 
        hasPreview: !!track.preview_url,
        socketConnected: socket.connected,
        socketId: socket.id
      })
      socket.emit('set-round-data', {
        roomId: currentRoomId,
        track,
        options: shuffledOptions,
        gameMode: mode
      })
      console.log('=== ROUND DATA SENT ===')
    } else {
      // Single player or multiplayer not ready
      console.log('Not sending to server - isMultiplayer:', currentIsMultiplayer, 'roomId:', currentRoomId, 'socket:', !!socket, 'connected:', socket?.connected)
      if (!currentIsMultiplayer) {
        // Single player
        setCurrentTrack(track)
        setOptions(shuffledOptions)
        startAutoPlayCountdown(5)
      } else {
        console.error('Multiplayer mode but missing roomId or socket! roomId:', currentRoomId, 'socket:', !!socket)
      }
    }
  }

  function pickDistractors(correctTrack, pool, mode, count) {
    const taken = new Set()
    const out = []
    const correctKey = mode === 'song' 
      ? (correctTrack.name || '').toLowerCase()
      : (correctTrack.artists?.[0]?.name || '').toLowerCase()
    
    // Also track by track ID to avoid duplicates
    const takenIds = new Set()
    takenIds.add(correctTrack.id)
    
    // Shuffle pool first for better randomness
    const shuffledPool = [...pool].sort(() => Math.random() - 0.5)
    
    for (const t of shuffledPool) {
      if (out.length >= count) break
      
      // Skip if same track ID
      if (takenIds.has(t.id)) continue
      
      const key = mode === 'song' 
        ? (t.name || '').toLowerCase()
        : (t.artists?.[0]?.name || '').toLowerCase()
      
      if (!key || key === correctKey) continue
      if (taken.has(key)) continue
      
      taken.add(key)
      takenIds.add(t.id)
      out.push(t)
    }
    
    // If not enough unique options, try again with remaining pool
    if (out.length < count) {
      const remaining = shuffledPool.filter(t => !takenIds.has(t.id))
      for (const t of remaining) {
        if (out.length >= count) break
        if (takenIds.has(t.id)) continue
        const key = mode === 'song' 
          ? (t.name || '').toLowerCase()
          : (t.artists?.[0]?.name || '').toLowerCase()
        if (!key || key === correctKey) continue
        takenIds.add(t.id)
        out.push(t)
      }
    }
    
    return out.slice(0, count)
  }

  function buildOptionsList(correctTrack, distractors, mode) {
    const toOption = (t, isCorrect) => ({
      label: mode === 'song' ? (t.name || 'Unknown') : (t.artists?.[0]?.name || 'Unknown'),
      sublabel: '',
      isCorrect,
      trackId: t.id
    })
    
    const allOptions = [
      toOption(correctTrack, true),
      ...distractors.map(d => toOption(d, false))
    ]
    
    // Final check: ensure no duplicate labels in the options
    const seenLabels = new Set()
    const uniqueOptions = []
    for (const opt of allOptions) {
      const labelKey = opt.label.toLowerCase()
      if (!seenLabels.has(labelKey)) {
        seenLabels.add(labelKey)
        uniqueOptions.push(opt)
      }
    }
    
    // If we lost the correct answer, add it back and remove a distractor
    const hasCorrect = uniqueOptions.some(opt => opt.isCorrect)
    if (!hasCorrect) {
      uniqueOptions.pop()
      uniqueOptions.push(toOption(correctTrack, true))
    }
    
    return uniqueOptions
  }

  function shuffleArray(arr) {
    const a = arr.slice()
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const tmp = a[i]; a[i] = a[j]; a[j] = tmp
    }
    return a
  }

  function startAudioPlayback() {
    if (!audioRef.current) return
    audioRef.current.currentTime = 0
    audioRef.current.play()
    roundStartAtRef.current = performance.now()
    // Auto end round at 10s if no answer
    clearTimeout(roundAutoEndTimeoutRef.current)
    roundAutoEndTimeoutRef.current = setTimeout(() => {
      if (!showAnswer) {
        setIsCorrect(false)
        setShowAnswer(true)
        if (audioRef.current) {
          audioRef.current.pause()
          audioRef.current.currentTime = 0
        }
        // Auto-advance after brief pause
        setTimeout(() => {
          setCurrentTrack(null)
        }, 800)
      }
    }, 10000)
  }

  function startAutoPlayCountdown(seconds) {
    setAutoStartIn(seconds)
    clearInterval(countdownIntervalRef.current)
    clearTimeout(autoStartTimeoutRef.current)
    countdownIntervalRef.current = setInterval(() => {
      setAutoStartIn(prev => {
        if (prev === null) return null
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    autoStartTimeoutRef.current = setTimeout(() => {
      setAutoStartIn(0)
      startAudioPlayback()
    }, seconds * 1000)
  }

  const handleChoice = (idx) => {
    if (!currentTrack || showAnswer) return
    setSelectedIdx(idx)
    const chosen = options[idx]
    const correct = !!chosen?.isCorrect
    setIsCorrect(correct)
    setShowAnswer(true)
    
    const elapsedSec = typeof timePlayed === 'number' && timePlayed > 0
      ? timePlayed
      : (roundStartAtRef.current ? (performance.now() - roundStartAtRef.current) / 1000 : 0)
    
    if (isMultiplayer && roomId && socket) {
      // Send answer to server
      socket.emit('submit-answer', {
        roomId,
        answerIndex: idx,
        timeTaken: elapsedSec
      })
    } else {
      // Single player logic
      if (correct) {
        const points = Math.max(0, 10 - Math.floor(elapsedSec))
        setScore(prev => prev + points)
      }
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
      setTimeout(() => {
        handleNext()
      }, 800)
    }
    
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }

  const handleNext = () => {
    if (tracks.length === 0) {
      // Reload tracks if pool is empty
      loadTracks().then(() => {
        setCurrentTrack(null)
      })
    } else {
      setCurrentTrack(null)
    }
  }

  const handlePlay = () => {
    if (currentTrack) {
      clearInterval(countdownIntervalRef.current)
      clearTimeout(autoStartTimeoutRef.current)
      setAutoStartIn(0)
      startAudioPlayback()
    }
  }

  const handleLeave = () => {
    setGameMode(null)
    setCurrentTrack(null)
    setTracks([])
    setGuess('')
    setIsCorrect(null)
    setShowAnswer(false)
    setGameStarted(false)
    setScore(0)
    setTimePlayed(0)
    setSelectedIdx(null)
    setOptions([])
    setView('menu')
    clearInterval(countdownIntervalRef.current)
    clearTimeout(autoStartTimeoutRef.current)
    clearTimeout(roundAutoEndTimeoutRef.current)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }

  // Menu / Settings screens
  if (view === 'menu') {
    return (
      <div className="app">
        <div className="mode-selector">
          <h1>Music Guesser</h1>
          <div className="menu-content">
            <div className="genre-grid">
              {[
                ['any','Any'],
                ['pop','Pop'],['rock','Rock'],['hip-hop','Hip Hop'],['indie','Indie'],['electronic','Electronic'],
                ['r-n-b','R&B'],['dance','Dance'],['latin','Latin'],['country','Country'],['jazz','Jazz'],['metal','Metal'],
                ['k-pop','K‑Pop'], ['j-pop','J‑Pop'], ['opm','Philippine Pop'],
              ].map(([val,label]) => {
                const isType = ['k-pop','j-pop','opm'].includes(val)
                const isActive = val === 'any' 
                  ? (selectedGenre === 'any' && selectedType === 'any')
                  : (isType ? selectedType === val : selectedGenre === val)
                return (
                <button
                  key={val}
                  className={`genre-card ${isActive ? 'genre-card-active' : ''}`}
                  onClick={() => {
                    if (isType) {
                      setSelectedType(val)
                      setSelectedGenre('any')
                    } else {
                      setSelectedGenre(val)
                      setSelectedType('any')
                    }
                  }}
                >
                  {genreCovers[val] ? (
                    <img src={genreCovers[val]} alt={label} className="genre-cover" />
                  ) : (
                    <div className="genre-placeholder">{label}</div>
                  )}
                  <span className="genre-name">{label}</span>
                </button>
                )
              })}
            </div>

            <div className="menu-actions">
              <button
                className="menu-btn menu-btn-primary"
                onClick={() => {
                  setIsMultiplayer(false)
                  setView('game')
                  setGameStarted(true)
                }}
              >
                Play Solo
              </button>
              <button
                className="menu-btn menu-btn-primary"
                onClick={() => {
                  setIsMultiplayer(true)
                  setView('multiplayer-menu')
                }}
              >
                Play Multiplayer
              </button>
              <button
                className="menu-btn"
                onClick={() => setView('settings')}
              >
                Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (view === 'multiplayer-menu') {
    return (
      <div className="app">
        <div className="mode-selector">
          <h1>Multiplayer</h1>
          {!socketConnected && (
            <div style={{ 
              padding: '15px', 
              marginBottom: '20px', 
              background: 'var(--visual)', 
              border: '1px solid var(--error)',
              borderRadius: '8px',
              color: 'var(--error)',
              textAlign: 'center'
            }}>
              {socketError || 'Connecting to server...'}
              <br />
              <small style={{ color: 'var(--comment)' }}>Make sure the server is running: npm run server</small>
            </div>
          )}
          <div className="multiplayer-menu">
            <div className="mp-option">
              <h3>Create Room</h3>
              <input
                type="text"
                placeholder="Your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="name-input"
              />
              <button
                className="menu-btn menu-btn-primary"
                disabled={!socketConnected}
                onClick={() => {
                  if (!playerName.trim()) {
                    alert('Please enter your name')
                    return
                  }
                  if (!socketConnected) {
                    alert('Not connected to server. Please wait for connection.')
                    return
                  }
                  if (socket) {
                    console.log('Creating room for:', playerName.trim())
                    socket.emit('create-room', { playerName: playerName.trim() })
                  }
                }}
              >
                Create Room
              </button>
            </div>
            <div className="mp-option">
              <h3>Join Room</h3>
              <input
                type="text"
                placeholder="Your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="name-input"
              />
              <input
                type="text"
                placeholder="Room code"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                className="room-input"
                maxLength={7}
              />
              <button
                className="menu-btn menu-btn-primary"
                disabled={!socketConnected}
                onClick={() => {
                  if (!playerName.trim() || !roomCode.trim()) {
                    alert('Please enter your name and room code')
                    return
                  }
                  if (!socketConnected) {
                    alert('Not connected to server. Please wait for connection.')
                    return
                  }
                  if (socket) {
                    console.log('Joining room:', roomCode.trim(), 'as:', playerName.trim())
                    socket.emit('join-room', { roomId: roomCode.trim(), playerName: playerName.trim() })
                  }
                }}
              >
                Join Room
              </button>
            </div>
            <button
              className="menu-btn"
              onClick={() => setView('menu')}
            >
              Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (view === 'multiplayer-lobby') {
    const allReady = players.length > 0 && players.every(p => p.isReady)
    const currentPlayer = players.find(p => p.id === socketIdRef.current)
    
    return (
      <div className="app">
        <div className="game-container">
          <div className="header">
            <h1>Room: {roomCode}</h1>
            <button onClick={() => {
              if (socket) socket.disconnect()
              setView('menu')
            }} className="reset-btn-small">Leave</button>
          </div>
          {!socketConnected && (
            <div style={{ padding: '20px', color: 'var(--error)', textAlign: 'center' }}>
              {socketError || 'Connecting to server...'}
            </div>
          )}
          <div className="lobby-content">
            <h2>Players ({players.length})</h2>
            {players.length === 0 ? (
              <p style={{ color: 'var(--comment)' }}>Waiting for players to join...</p>
            ) : (
              <div className="players-list">
                {players.map((player) => (
                  <div key={player.id} className={`player-item ${player.isReady ? 'ready' : ''}`}>
                    <span>{player.name}</span>
                    {player.isReady ? <span className="ready-badge">✓ Ready</span> : <span>Waiting...</span>}
                  </div>
                ))}
              </div>
            )}
            {currentPlayer && !currentPlayer.isReady && socketConnected && (
              <button
                className="menu-btn menu-btn-primary"
                onClick={() => {
                  if (socket && roomId) {
                    console.log('Sending player-ready:', roomId)
                    socket.emit('player-ready', { roomId })
                  }
                }}
              >
                Ready
              </button>
            )}
            {allReady && currentPlayer?.isReady && (
              <p className="waiting-text">Waiting for game to start...</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (view === 'multiplayer-results') {
    return (
      <div className="app">
        <div className="game-container">
          <div className="header">
            <h1>Game Over!</h1>
          </div>
          <div className="leaderboard">
            <h2>Final Scores</h2>
            <div className="leaderboard-list">
              {finalLeaderboard.map((player, index) => (
                <div key={player.id} className={`leaderboard-item ${index === 0 ? 'winner' : ''}`}>
                  <div className="rank">#{index + 1}</div>
                  <div className="player-info">
                    <span className="player-name">{player.name}</span>
                  </div>
                  <div className="player-score">{player.score} pts</div>
                </div>
              ))}
            </div>
            <button
              className="menu-btn menu-btn-primary"
              onClick={() => {
                setView('menu')
                setGameOver(false)
                setFinalLeaderboard([])
                setCurrentRound(0)
                setPlayers([])
                setRoomId('')
                setRoomCode('')
              }}
            >
              Back to Menu
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (view === 'settings') {
    return (
      <div className="app">
        <div className="game-container">
          <div className="header">
            <h1>⚙️ Settings</h1>
            <div className="score">
              <button onClick={() => setView('menu')} className="reset-btn-small">Back</button>
            </div>
          </div>
          <p>Auto-start after 5 seconds is enabled. Time-based scoring from 10 to 0.</p>
          <p>More settings coming soon.</p>
        </div>
      </div>
    )
  }

  // No mode selection screen; rounds mix song/artist automatically

  // Game view (both single player and multiplayer)
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
    <div className="app">
      <div className="game-container">
        <div className="header">
          <h1>Music Guesser</h1>
          <div className="score">
            {isMultiplayer ? (
              <>
                <span>Round {currentRound}/10</span>
                <div className="players-mini">
                  {players.map(p => (
                    <span key={p.id} className="player-score-mini">
                      {p.name}: {p.score}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <span>Score: {score}</span>
            )}
            <button onClick={handleLeave} className="reset-btn-small">Leave</button>
          </div>
        </div>

        <div className="game-mode">
          {gameMode === 'song' ? '🎧 Guess the Song' : '🎤 Guess the Artist'}
        </div>

        {currentTrack && (
          <>
            <div className="audio-section">
              {autoStartIn !== null && autoStartIn > 0 ? (
                <div className="loading-circle-container">
                  <div className="loading-circle">
                    <div className="loading-circle-inner"></div>
                  </div>
                </div>
              ) : !showAnswer ? null : (
                <div className="album-art">
                  {currentTrack.album?.images?.[0]?.url ? (
                    <img 
                      src={currentTrack.album.images[0].url} 
                      alt="Album cover"
                    />
                  ) : (
                    <div className="placeholder-art">🎵</div>
                  )}
                </div>
              )}
              
              <div className="audio-controls">
                {currentTrack.preview_url ? (
                  <>
                    <audio
                      ref={audioRef}
                      src={currentTrack.preview_url}
                      onEnded={() => setTimePlayed(10)}
                    />
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${(timePlayed / 10) * 100}%` }}
                      />
                    </div>
                    <p className="time-info">{Math.min(timePlayed.toFixed(1), 10)}s / 10s</p>
                  </>
                ) : (
                  <p className="no-preview">No preview available for this track</p>
                )}
              </div>
            </div>

            <div className="choices">
              {options.map((opt, idx) => {
                const isSelected = selectedIdx === idx
                const stateClass = showAnswer
                  ? opt.isCorrect
                    ? 'choice-correct'
                    : isSelected ? 'choice-incorrect' : ''
                  : ''
                return (
                  <button
                    key={idx}
                    className={`choice-btn ${stateClass}`}
                    onClick={() => handleChoice(idx)}
                    disabled={showAnswer}
                  >
                    <span className="choice-label">{opt.label}</span>
                  </button>
                )
              })}
            </div>

          </>
        )}
      </div>
    </div>
    )
  }

  // Fallback (should never reach here, but just in case)
  return (
    <div className="app">
      <div className="game-container">
        <h1>Loading...</h1>
      </div>
    </div>
  )
}

export default App

