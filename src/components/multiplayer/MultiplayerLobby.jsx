import { useState } from 'react'
import { getSocket } from '../../utils/socket'

export default function MultiplayerLobby({ roomCode, players, socketId, hostId, onReady, genre, type, totalRounds }) {
  const socket = getSocket()
  const allReady = players.length > 0 && players.every(p => p.isReady)
  const currentPlayer = players.find(p => p.id === socketId)
  const [copied, setCopied] = useState(false)
  
  const getGenreLabel = () => {
    const genreMap = {
      'any': 'Any',
      'pop': 'Pop',
      'rock': 'Rock',
      'hip-hop': 'Hip Hop',
      'indie': 'Indie',
      'electronic': 'Electronic',
      'r-n-b': 'R&B',
      'dance': 'Dance',
      'latin': 'Latin',
      'country': 'Country',
      'jazz': 'Jazz',
      'metal': 'Metal',
      'k-pop': 'K‑Pop',
      'j-pop': 'J‑Pop',
      'opm': 'Philippine Pop'
    }
    if (type && type !== 'any') {
      return genreMap[type] || type
    }
    return genreMap[genre] || genre || 'Any'
  }
  
  const handleCopyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy room code:', err)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = roomCode
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }
  
  return (
    <div className="app">
      <div className="game-container">
        <div className="header">
          <h1>
            Room: {roomCode}
            <button
              onClick={handleCopyRoomCode}
              className="copy-room-code-btn"
              style={{
                marginLeft: '12px',
                padding: '6px 12px',
                background: copied ? 'var(--success)' : 'transparent',
                border: copied ? 'none' : '1px solid var(--border)',
                borderRadius: '6px',
                cursor: 'pointer',
                color: copied ? 'white' : 'var(--text)',
                fontSize: '13px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                position: 'relative',
                overflow: 'hidden'
              }}
              title="Copy room code"
              onMouseEnter={(e) => {
                if (!copied) {
                  e.currentTarget.style.background = 'var(--background-secondary)'
                  e.currentTarget.style.borderColor = 'var(--floatBorder)'
                }
              }}
              onMouseLeave={(e) => {
                if (!copied) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.borderColor = 'var(--border)'
                }
              }}
            >
              {copied ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13.5 4.5L6 12L2.5 8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    <path d="M3 3V11H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                  </svg>
                  <span>Copy</span>
                </>
              )}
            </button>
          </h1>
        </div>
        <div className="lobby-content">
          {(genre || totalRounds) && (
            <div style={{ 
              marginBottom: '20px', 
              padding: '15px', 
              background: 'var(--visual)', 
              borderRadius: '8px',
              border: '1px solid var(--line)'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {genre && (
                  <div style={{ fontSize: '1rem', color: 'var(--fg)' }}>
                    <strong>Genre:</strong> {getGenreLabel()}
                  </div>
                )}
                {totalRounds && (
                  <div style={{ fontSize: '1rem', color: 'var(--fg)' }}>
                    <strong>Rounds:</strong> {totalRounds}
                  </div>
                )}
              </div>
            </div>
          )}
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
          {currentPlayer && !currentPlayer.isReady && socket && socket.connected && (
            <button
              className="menu-btn menu-btn-primary"
              onClick={onReady}
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

