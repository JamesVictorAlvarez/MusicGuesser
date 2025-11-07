import { useState, useEffect } from 'react'
import { getPlaylistCoverForGenre } from '../services/spotify'

export default function Menu({ onPlaySolo, onPlayMultiplayer, onSettings, selectedGenre: initialGenre = 'any', selectedType: initialType = 'any', onGenreChange }) {
  const [selectedGenre, setSelectedGenre] = useState(initialGenre)
  const [selectedType, setSelectedType] = useState(initialType)
  const [genreCovers, setGenreCovers] = useState({})
  const [showPlayOptions, setShowPlayOptions] = useState(false)
  const [selectedRounds, setSelectedRounds] = useState(10)

  useEffect(() => {
    const genres = ['pop', 'rock', 'hip-hop', 'indie', 'electronic', 'r-n-b', 'dance', 'latin', 'country', 'jazz', 'metal', 'k-pop', 'j-pop', 'opm']
    genres.forEach(async (genre) => {
      if (!genreCovers[genre]) {
        const cover = await getPlaylistCoverForGenre(genre)
        if (cover) {
          setGenreCovers(prev => ({ ...prev, [genre]: cover }))
        }
      }
    })
  }, [])

  const handlePlaySoloClick = () => {
    if (!showPlayOptions) {
      setShowPlayOptions(true)
    } else {
      // Start the game
      if (onPlaySolo) {
        onPlaySolo({ genre: selectedGenre, type: selectedType, rounds: selectedRounds })
      }
    }
  }

  const handleBack = () => {
    setShowPlayOptions(false)
  }

  return (
    <div className="app">
      <div className="mode-selector">
        <h1>Music Guesser</h1>
        {!showPlayOptions ? (
          <div className="menu-content">
            <div className="menu-actions menu-actions-no-divider">
              <button
                className="menu-btn menu-btn-primary"
                onClick={handlePlaySoloClick}
              >
                Play Solo
              </button>
              <button
                className="menu-btn menu-btn-primary"
                onClick={onPlayMultiplayer}
              >
                Play Multiplayer
              </button>
              <button
                className="menu-btn"
                onClick={onSettings}
              >
                Settings
              </button>
            </div>
          </div>
        ) : (
          <div className="menu-content">
            <div className="menu-actions">
              <button
                className="menu-btn menu-btn-primary"
                onClick={handlePlaySoloClick}
                disabled={!selectedRounds}
              >
                Start Game
              </button>
              <button
                className="menu-btn"
                onClick={handleBack}
              >
                Back
              </button>
            </div>

            <div className="genre-grid-wrapper">
              <div className="rounds-selection">
                <h2>Select Number of Rounds</h2>
                <div className="rounds-buttons">
                  {[5, 10, 15].map(rounds => (
                    <button
                      key={rounds}
                      className={`rounds-btn ${selectedRounds === rounds ? 'rounds-btn-active' : ''}`}
                      onClick={() => setSelectedRounds(rounds)}
                    >
                      {rounds} Rounds
                    </button>
                  ))}
                </div>
              </div>

              <div className="genre-selection">
                <h2>Select Genre</h2>
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
                          if (onGenreChange) onGenreChange({ genre: 'any', type: val })
                        } else {
                          setSelectedGenre(val)
                          setSelectedType('any')
                          if (onGenreChange) onGenreChange({ genre: val, type: 'any' })
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
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

