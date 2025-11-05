import { useState, useEffect, useRef } from 'react'
import { getRandomTracks } from './services/spotify'
import './App.css'

function App() {
  const [gameMode, setGameMode] = useState(null) // 'song' or 'artist'
  const [currentTrack, setCurrentTrack] = useState(null)
  const [tracks, setTracks] = useState([])
  const [guess, setGuess] = useState('')
  const [isCorrect, setIsCorrect] = useState(null)
  const [score, setScore] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
  const [loading, setLoading] = useState(false)
  const audioRef = useRef(null)
  const [timePlayed, setTimePlayed] = useState(0)

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

  const loadTracks = async () => {
    setLoading(true)
    try {
      const fetchedTracks = await getRandomTracks(50)
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
    
    // Remove the track from the pool so it doesn't repeat
    setTracks(prev => prev.filter((_, idx) => idx !== randomIndex))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!currentTrack || !guess.trim()) return

    const normalizedGuess = guess.trim().toLowerCase()
    let correct = false

    if (gameMode === 'song') {
      const normalizedTrackName = currentTrack.name.toLowerCase()
      correct = normalizedGuess === normalizedTrackName || 
                normalizedTrackName.includes(normalizedGuess) ||
                normalizedGuess.includes(normalizedTrackName)
    } else if (gameMode === 'artist') {
      const artistNames = currentTrack.artists.map(a => a.name.toLowerCase())
      correct = artistNames.some(name => 
        name === normalizedGuess || 
        name.includes(normalizedGuess) ||
        normalizedGuess.includes(name)
      )
    }

    setIsCorrect(correct)
    setShowAnswer(true)
    
    if (correct) {
      setScore(prev => prev + 1)
    }

    // Stop audio
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
    if (audioRef.current && currentTrack) {
      audioRef.current.currentTime = 0
      audioRef.current.play()
    }
  }

  const handleReset = () => {
    setGameMode(null)
    setCurrentTrack(null)
    setTracks([])
    setGuess('')
    setIsCorrect(null)
    setShowAnswer(false)
    setGameStarted(false)
    setScore(0)
    setTimePlayed(0)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }

  if (!gameMode) {
    return (
      <div className="app">
        <div className="mode-selector">
          <h1>🎵 Music Guesser</h1>
          <p className="subtitle">Test your music knowledge!</p>
          <div className="mode-buttons">
            <button 
              className="mode-btn"
              onClick={() => {
                setGameMode('song')
                setGameStarted(true)
              }}
            >
              🎧 Guess the Song
            </button>
            <button 
              className="mode-btn"
              onClick={() => {
                setGameMode('artist')
                setGameStarted(true)
              }}
            >
              🎤 Guess the Artist
            </button>
          </div>
        </div>
      </div>
    )
  }

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
          <button onClick={handleReset} className="reset-btn">Go Back</button>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <div className="game-container">
        <div className="header">
          <h1>🎵 Music Guesser</h1>
          <div className="score">
            <span>Score: {score}</span>
            <button onClick={handleReset} className="reset-btn-small">Reset</button>
          </div>
        </div>

        <div className="game-mode">
          {gameMode === 'song' ? '🎧 Guess the Song' : '🎤 Guess the Artist'}
        </div>

        {currentTrack && (
          <>
            <div className="audio-section">
              <div className="album-art">
                {currentTrack.album?.images?.[0]?.url ? (
                  <img 
                    src={currentTrack.album.images[0].url} 
                    alt="Album cover"
                    className={showAnswer ? '' : 'blurred'}
                  />
                ) : (
                  <div className="placeholder-art">🎵</div>
                )}
              </div>
              
              <div className="audio-controls">
                {currentTrack.preview_url ? (
                  <>
                    <audio
                      ref={audioRef}
                      src={currentTrack.preview_url}
                      onEnded={() => setTimePlayed(10)}
                    />
                    <button 
                      onClick={handlePlay} 
                      className="play-btn"
                      disabled={showAnswer}
                    >
                      ▶️ Play 10s Clip
                    </button>
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

            <form onSubmit={handleSubmit} className="guess-form">
              <input
                type="text"
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                placeholder={gameMode === 'song' ? 'Enter song name...' : 'Enter artist name...'}
                className="guess-input"
                disabled={showAnswer}
                autoFocus
              />
              <button 
                type="submit" 
                className="submit-btn"
                disabled={!guess.trim() || showAnswer}
              >
                Submit
              </button>
            </form>

            {showAnswer && (
              <div className={`result ${isCorrect ? 'correct' : 'incorrect'}`}>
                <div className="result-icon">
                  {isCorrect ? '✅' : '❌'}
                </div>
                <div className="result-text">
                  {isCorrect ? (
                    <p className="correct-text">Correct! 🎉</p>
                  ) : (
                    <p className="incorrect-text">Not quite!</p>
                  )}
                  <div className="answer">
                    <p><strong>Song:</strong> {currentTrack.name}</p>
                    <p><strong>Artist:</strong> {currentTrack.artists.map(a => a.name).join(', ')}</p>
                  </div>
                </div>
                <button onClick={handleNext} className="next-btn">
                  Next Track →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default App

