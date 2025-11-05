import { useState, useEffect } from 'react'
import { getPlaylistCoverForGenre } from '../services/spotify'

export default function Menu({ onPlaySolo, onPlayMultiplayer, onSettings, selectedGenre: initialGenre = 'any', selectedType: initialType = 'any', onGenreChange }) {
  const [selectedGenre, setSelectedGenre] = useState(initialGenre)
  const [selectedType, setSelectedType] = useState(initialType)
  const [genreCovers, setGenreCovers] = useState({})

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

          <div className="menu-actions">
            <button
              className="menu-btn menu-btn-primary"
              onClick={() => {
                if (onPlaySolo) {
                  onPlaySolo({ genre: selectedGenre, type: selectedType })
                }
              }}
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
      </div>
    </div>
  )
}

