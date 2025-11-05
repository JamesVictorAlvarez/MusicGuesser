import { getSocket } from '../../utils/socket'

export default function MultiplayerLobby({ roomCode, players, socketId, onLeave, onReady }) {
  const socket = getSocket()
  const allReady = players.length > 0 && players.every(p => p.isReady)
  const currentPlayer = players.find(p => p.id === socketId)
  
  return (
    <div className="app">
      <div className="game-container">
        <div className="header">
          <h1>Room: {roomCode}</h1>
          <button onClick={onLeave} className="reset-btn-small">Leave</button>
        </div>
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

