export default function MultiplayerResults({ leaderboard, onBackToMenu }) {
  return (
    <div className="app">
      <div className="game-container">
        <div className="header">
          <h1>Game Over!</h1>
        </div>
        <div className="leaderboard">
          <h2>Final Scores</h2>
          <div className="leaderboard-list">
            {leaderboard.map((player, index) => (
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
            onClick={onBackToMenu}
          >
            Back to Menu
          </button>
        </div>
      </div>
    </div>
  )
}

