export default function Settings({ onBack, volume, onVolumeChange }) {
  return (
    <div className="app">
      <div className="game-container">
        <div className="header">
          <h1>⚙️ Settings</h1>
          <div className="score">
            <button onClick={onBack} className="reset-btn-small">Back</button>
          </div>
        </div>
        <div className="settings-content">
          <div className="setting-item">
            <label htmlFor="volume-slider" className="setting-label">
              🔊 Volume: {Math.round(volume * 100)}%
            </label>
            <input
              id="volume-slider"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="volume-slider"
            />
          </div>
          <p>Auto-start after 5 seconds is enabled. Time-based scoring from 10 to 0.</p>
          <p>More settings coming soon.</p>
        </div>
      </div>
    </div>
  )
}

