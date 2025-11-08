import { useEffect } from 'react'

export default function Game({
  gameMode,
  currentTrack,
  options,
  selectedIdx,
  showAnswer,
  hasSubmittedAnswer = false,
  isCorrect,
  score,
  timePlayed,
  autoStartIn,
  audioRef,
  isMultiplayer,
  currentRound,
  totalRounds = 10,
  players,
  playerAnswers = [],
  socketId,
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
                <span>Round {currentRound}/{totalRounds}</span>
                <div className="players-mini">
                  {players.map(p => {
                    const playerAnswer = playerAnswers.find(a => a.playerId === p.id)
                    const gotItRight = showAnswer && playerAnswer?.isCorrect
                    return (
                      <span key={p.id} className="player-name-mini">
                        {p.name}
                        {gotItRight && (
                          <span className="check-icon" title="Got it right!">✓</span>
                        )}
                      </span>
                    )
                  })}
                </div>
              </>
            ) : (
              <>
                <span>Round {currentRound}/{totalRounds}</span>
                <button onClick={onLeave} className="reset-btn-small">Leave</button>
              </>
            )}
          </div>
        </div>

        <div className="game-content-wrapper">
          <div className="game-sidebar">
            {isMultiplayer ? (
              <div className="players-mini">
                {players.map(p => {
                  const playerAnswer = playerAnswers.find(a => a.playerId === p.id)
                  const gotItRight = showAnswer && playerAnswer?.isCorrect
                  return (
                    <div key={p.id} className="player-score-item">
                      <span className="player-name-mini">
                        {p.name}
                        {gotItRight && (
                          <span className="check-icon" title="Got it right!">✓</span>
                        )}
                      </span>
                      <span className="player-score-mini">{p.score}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="score-value">{score}</div>
            )}
          </div>

          <div className="game-main">
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

            {isMultiplayer && hasSubmittedAnswer && !showAnswer ? (
              <div className="waiting-message">
                <p>Waiting for other players to submit their answers...</p>
              </div>
            ) : null}
            <div className="choices">
              {options.map((opt, idx) => {
                const isSelected = selectedIdx === idx
                const stateClass = showAnswer
                  ? opt.isCorrect
                    ? 'choice-correct'
                    : isSelected ? 'choice-incorrect' : ''
                  : ''
                
                // Get players who chose this option (excluding current player)
                const playersWhoChose = isMultiplayer && !showAnswer
                  ? playerAnswers
                      .filter(answer => answer.answerIndex === idx && answer.playerId !== socketId)
                      .map(answer => answer.playerName)
                  : []
                
                return (
                  <button
                    key={idx}
                    className={`choice-btn ${stateClass}`}
                    onClick={() => onChoice(idx)}
                    disabled={showAnswer || hasSubmittedAnswer || !audioStarted}
                  >
                    <span className="choice-label">{opt.label}</span>
                    {playersWhoChose.length > 0 && (
                      <div className="choice-badges">
                        {playersWhoChose.map((playerName, i) => (
                          <span key={i} className="choice-badge" title={playerName}>
                            {playerName.substring(0, 3).toUpperCase()}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

