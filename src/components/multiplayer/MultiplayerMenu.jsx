import { useState } from 'react'
import { getSocket } from '../../utils/socket'

export default function MultiplayerMenu({ socketConnected, socketError, onBack }) {
  const [playerName, setPlayerName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const socket = getSocket()

  const handleCreateRoom = () => {
    if (!playerName.trim()) {
      alert('Please enter your name')
      return
    }
    if (!socketConnected) {
      alert('Not connected to server. Please wait for connection.')
      return
    }
    if (socket) {
      console.log('Creating room for:', playerName.trim())
      socket.emit('create-room', { playerName: playerName.trim() })
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
        </div>
      </div>
    </div>
  )
}

