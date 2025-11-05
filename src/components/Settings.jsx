export default function Settings({ onBack }) {
  return (
    <div className="app">
      <div className="game-container">
        <div className="header">
          <h1>⚙️ Settings</h1>
          <div className="score">
            <button onClick={onBack} className="reset-btn-small">Back</button>
          </div>
        </div>
        <p>Auto-start after 5 seconds is enabled. Time-based scoring from 10 to 0.</p>
        <p>More settings coming soon.</p>
      </div>
    </div>
  )
}

