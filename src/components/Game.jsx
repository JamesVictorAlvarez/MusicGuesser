import { useEffect } from 'react'

export default function Game({
  gameMode,
  currentTrack,
  options,
  selectedIdx,
  showAnswer,
  isCorrect,
  score,
  timePlayed,
  autoStartIn,
  audioRef,
  isMultiplayer,
  currentRound,
  players,
  audioStarted,
  onChoice,
  onLeave,
  onTimeUpdate
}) {
  useEffect(() => {
    if (audioRef?.current) {
      const audio = audioRef.current
      const interval = setInterval(() => {
        if (audio.currentTime >= 10) {
          audio.pause()
          onTimeUpdate?.(10)
        } else {
          onTimeUpdate?.(audio.currentTime)
        }
      }, 100)
      return () => clearInterval(interval)
    }
  }, [currentTrack, audioRef, onTimeUpdate])

  if (!currentTrack) {
    return (
      <div className="app">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading tracks...</p>
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
            <button onClick={onLeave} className="reset-btn-small">Leave</button>
          </div>
        </div>

        <div className="game-mode">
          {gameMode === 'song' ? '🎧 Guess the Song' : '🎤 Guess the Artist'}
        </div>

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
                  onEnded={() => onTimeUpdate?.(10)}
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
                onClick={() => onChoice(idx)}
                disabled={showAnswer || !audioStarted}
              >
                <span className="choice-label">{opt.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

