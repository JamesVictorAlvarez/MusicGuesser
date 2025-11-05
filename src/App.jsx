import { useState, useEffect, useRef } from 'react'
import { getRandomTracks, getPlaylistCoverForGenre } from './services/spotify'
import './App.css'

function App() {
  const [gameMode, setGameMode] = useState(null) // 'song' or 'artist' (set per round)
  const [view, setView] = useState('menu') // 'menu' | 'settings' | 'game'
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

  // Load tracks when game starts
  useEffect(() => {
    if (gameStarted && tracks.length === 0) {
      loadTracks()
    }
  }, [gameStarted])

  // Load a new track when needed
  useEffect(() => {
    if (gameStarted && tracks.length > 0 && !currentTrack) {
      loadNewTrack()
    }
  }, [gameStarted, tracks, currentTrack])

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

  const loadNewTrack = () => {
    if (tracks.length === 0) return
    
    const randomIndex = Math.floor(Math.random() * tracks.length)
    const track = tracks[randomIndex]
    setCurrentTrack(track)
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
    const distractorPool = tracks.filter((_, idx) => idx !== randomIndex)
    const distractors = pickDistractors(track, distractorPool, mode, 3)
    const builtOptions = buildOptionsList(track, distractors, mode)
    setOptions(shuffleArray(builtOptions))
    
    // Remove the track from the pool so it doesn't repeat
    setTracks(prev => prev.filter((_, idx) => idx !== randomIndex))
    // Auto start after 5 seconds
    startAutoPlayCountdown(5)
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
    if (correct) {
      const elapsedSec = typeof timePlayed === 'number' && timePlayed > 0
        ? timePlayed
        : (roundStartAtRef.current ? (performance.now() - roundStartAtRef.current) / 1000 : 0)
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
                  setView('game')
                  setGameStarted(true)
                }}
              >
                Play
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
            <span>Score: {score}</span>
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

export default App

