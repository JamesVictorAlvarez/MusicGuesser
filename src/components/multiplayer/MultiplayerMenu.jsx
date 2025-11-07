import { useState, useEffect } from 'react'
import { getSocket } from '../../utils/socket'
import { getPlaylistCoverForGenre } from '../../services/spotify'

export default function MultiplayerMenu({ socketConnected, socketError, onBack }) {
  const [playerName, setPlayerName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [showCreateOptions, setShowCreateOptions] = useState(false)
  const [selectedGenre, setSelectedGenre] = useState('any')
  const [selectedType, setSelectedType] = useState('any')
  const [selectedRounds, setSelectedRounds] = useState(10)
  const [genreCovers, setGenreCovers] = useState({})
  const socket = getSocket()

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

  const handleCreateRoom = () => {
    if (!showCreateOptions) {
      if (!playerName.trim()) {
        alert('Please enter your name')
        return
      }
      setShowCreateOptions(true)
      return
    }
    
    if (!socketConnected) {
      alert('Not connected to server. Please wait for connection.')
      return
    }
    if (socket) {
      console.log('Creating room for:', playerName.trim(), 'with genre:', selectedGenre, 'type:', selectedType, 'rounds:', selectedRounds)
      socket.emit('create-room', { 
        playerName: playerName.trim(),
        genre: selectedGenre,
        type: selectedType,
        rounds: selectedRounds
      })
    }
  }

  const handleJoinRoom = () => {
    if (!playerName.trim() || !roomCode.trim()) {
      alert('Please enter your name and room code')
      return
    }
    if (!socketConnected) {
      alert('Not connected to server. Please wait for connection.')
      return
    }
    if (socket) {
      console.log('Joining room:', roomCode.trim(), 'as:', playerName.trim())
      socket.emit('join-room', { roomId: roomCode.trim(), playerName: playerName.trim() })
    }
  }

  return (
    <div className="app">
      <div className="mode-selector">
        <h1>Multiplayer</h1>
        {!socketConnected && (
          <div style={{ 
            padding: '15px', 
            marginBottom: '20px', 
            background: 'var(--visual)', 
            border: '1px solid var(--error)',
            borderRadius: '8px',
            color: 'var(--error)',
            textAlign: 'center'
          }}>
            {socketError || 'Connecting to server...'}
            <br />
            <small style={{ color: 'var(--comment)' }}>Make sure the server is running: npm run server</small>
          </div>
        )}
        <div className="multiplayer-menu">
          {!showCreateOptions ? (
            <>
              <div className="mp-option">
                <h3>Create Room</h3>
                <input
                  type="text"
                  placeholder="Your name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="name-input"
                />
                <button
                  className="menu-btn menu-btn-primary"
                  disabled={!socketConnected}
                  onClick={handleCreateRoom}
                >
                  Create Room
                </button>
              </div>
            </>
          ) : (
            <div className="menu-content">
              <div className="menu-actions">
                <button
                  className="menu-btn menu-btn-primary"
                  disabled={!socketConnected || !selectedRounds}
                  onClick={handleCreateRoom}
                >
                  Create Room
                </button>
                <button
                  className="menu-btn"
                  onClick={() => setShowCreateOptions(false)}
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
                          } else {
                            setSelectedGenre(val)
                            setSelectedType('any')
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
          {!showCreateOptions && (
            <>
              <div className="mp-option">
                <h3>Join Room</h3>
                <input
                  type="text"
                  placeholder="Your name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="name-input"
                />
                <input
                  type="text"
                  placeholder="Room code"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  className="room-input"
                  maxLength={7}
                />
                <button
                  className="menu-btn menu-btn-primary"
                  disabled={!socketConnected}
                  onClick={handleJoinRoom}
                >
                  Join Room
                </button>
              </div>
              <button
                className="menu-btn"
                onClick={onBack}
              >
                Back
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

