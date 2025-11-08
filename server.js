import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'

const app = express()
app.use(cors())
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
})

// Game state storage
const rooms = new Map()

// Room structure:
// {
//   id: string,
//   hostId: string,
//   players: Map(socketId -> { id, name, score, currentRoundScore, isReady }),
//   currentRound: number,
//   totalRounds: number,
//   genre: string,
//   type: string,
//   currentTrack: object,
//   options: array,
//   gameMode: 'song' | 'artist',
//   roundStarted: boolean,
//   answers: Map(socketId -> { answer, time, isCorrect })
// }

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id)

  socket.on('create-room', (data) => {
    // First, leave any existing room the player might be in
    for (const [existingRoomId, existingRoom] of rooms.entries()) {
      if (existingRoom.players.has(socket.id)) {
        console.log(`Player ${socket.id} is already in room ${existingRoomId}, leaving it first`)
        existingRoom.players.delete(socket.id)
        socket.leave(existingRoomId)
        if (existingRoom.hostId === socket.id) {
          // Host left - close room
          const otherPlayerIds = Array.from(existingRoom.players.keys())
          otherPlayerIds.forEach(playerId => {
            io.to(playerId).emit('room-closed', { message: 'Host left the room' })
          })
          rooms.delete(existingRoomId)
        } else if (existingRoom.players.size === 0) {
          rooms.delete(existingRoomId)
        } else {
          existingRoom.players.forEach((player, playerId) => {
            io.to(playerId).emit('room-updated', getRoomState(existingRoomId))
          })
        }
        break
      }
    }
    
    const roomId = Math.random().toString(36).substring(2, 9).toUpperCase()
    const { playerName, genre = 'any', type = 'any', rounds = 10 } = data
    
    console.log(`Creating room ${roomId} for player ${playerName} (${socket.id}) with genre: ${genre}, type: ${type}, rounds: ${rounds}`)
    
    rooms.set(roomId, {
      id: roomId,
      hostId: socket.id, // First player to create room is the host
      players: new Map([[socket.id, { id: socket.id, name: playerName, score: 0, currentRoundScore: 0, isReady: false }]]),
      currentRound: 0,
      totalRounds: rounds,
      genre: genre,
      type: type,
      currentTrack: null,
      options: [],
      gameMode: null,
      roundStarted: false,
      answers: new Map(),
      tracks: [],
      gameFinished: false
    })
    
    socket.join(roomId)
    socket.emit('room-created', { roomId })
    // Only send to active players (just the creator at this point)
    const room = rooms.get(roomId)
    if (room) {
      room.players.forEach((player, playerId) => {
        io.to(playerId).emit('room-updated', getRoomState(roomId))
      })
    }
    console.log(`Room ${roomId} created with state:`, getRoomState(roomId))
  })

  socket.on('join-room', (data) => {
    const { roomId, playerName } = data
    
    console.log(`Player ${playerName} (${socket.id}) attempting to join room ${roomId}`)
    
    // First, leave any existing room the player might be in
    for (const [existingRoomId, existingRoom] of rooms.entries()) {
      if (existingRoom.players.has(socket.id)) {
        console.log(`Player ${socket.id} is already in room ${existingRoomId}, leaving it first`)
        existingRoom.players.delete(socket.id)
        socket.leave(existingRoomId)
        if (existingRoom.hostId === socket.id) {
          // Host left - close room
          const otherPlayerIds = Array.from(existingRoom.players.keys())
          otherPlayerIds.forEach(playerId => {
            io.to(playerId).emit('room-closed', { message: 'Host left the room' })
          })
          rooms.delete(existingRoomId)
        } else if (existingRoom.players.size === 0) {
          rooms.delete(existingRoomId)
        } else {
          existingRoom.players.forEach((player, playerId) => {
            io.to(playerId).emit('room-updated', getRoomState(existingRoomId))
          })
        }
        break
      }
    }
    
    if (!rooms.has(roomId)) {
      console.log(`Room ${roomId} not found`)
      socket.emit('room-error', { message: 'Room not found' })
      return
    }
    
    const room = rooms.get(roomId)
    if (room.players.has(socket.id)) {
      console.log(`Player ${socket.id} already in room ${roomId}`)
      socket.emit('room-error', { message: 'Already in room' })
      return
    }
    
    // Don't allow joining finished games
    if (room.gameFinished) {
      console.log(`Room ${roomId} has finished, cannot join`)
      socket.emit('room-error', { message: 'This game has already finished' })
      return
    }
    
    room.players.set(socket.id, { id: socket.id, name: playerName, score: 0, currentRoundScore: 0, isReady: false })
    socket.join(roomId)
    socket.emit('room-joined', { roomId })
    // Only send to active players
    room.players.forEach((player, playerId) => {
      io.to(playerId).emit('room-updated', getRoomState(roomId))
    })
    console.log(`Player ${playerName} joined room ${roomId}. Players:`, Array.from(room.players.values()).map(p => p.name))
  })

  socket.on('leave-room', (data) => {
    const { roomId } = data
    console.log(`Player ${socket.id} leaving room ${roomId}`)
    const room = rooms.get(roomId)
    if (!room) {
      console.log(`Room ${roomId} not found for leave signal`)
      return
    }
    
    if (!room.players.has(socket.id)) {
      console.log(`Player ${socket.id} not in room ${roomId}`)
      return
    }
    
    const isHost = room.hostId === socket.id
    room.players.delete(socket.id)
    socket.leave(roomId)
    
    if (isHost) {
      // Host left - close room and notify other players
      console.log(`Host left room ${roomId}, closing room and notifying ${room.players.size} other players`)
      const otherPlayerIds = Array.from(room.players.keys())
      otherPlayerIds.forEach(playerId => {
        io.to(playerId).emit('room-closed', { message: 'Host left the room' })
      })
      rooms.delete(roomId)
    } else {
      // Regular player left
      if (room.players.size === 0) {
        // No players left, delete room
        rooms.delete(roomId)
      } else {
        // Notify remaining players
        room.players.forEach((player, playerId) => {
          io.to(playerId).emit('room-updated', getRoomState(roomId))
        })
      }
    }
  })

  socket.on('player-ready', (data) => {
    const { roomId } = data
    console.log(`Player ${socket.id} ready in room ${roomId}`)
    const room = rooms.get(roomId)
    if (!room) {
      console.log(`Room ${roomId} not found for ready signal`)
      return
    }
    
    const player = room.players.get(socket.id)
    if (player) {
      player.isReady = true
      console.log(`Player ${player.name} is now ready`)
      // Only send to active players
      room.players.forEach((player, playerId) => {
        io.to(playerId).emit('room-updated', getRoomState(roomId))
      })
      
      const allReady = Array.from(room.players.values()).every(p => p.isReady)
      console.log(`All players ready: ${allReady}, Current round: ${room.currentRound}`)
      
      // Start game if all players are ready and game hasn't started
      if (allReady && room.currentRound === 0) {
        console.log(`Starting game for room ${roomId}`)
        startGame(roomId)
      }
    } else {
      console.log(`Player ${socket.id} not found in room ${roomId}`)
    }
  })

  socket.on('submit-answer', (data) => {
    const { roomId, answerIndex, timeTaken } = data
    const room = rooms.get(roomId)
    if (!room || !room.roundStarted) return
    
    const player = room.players.get(socket.id)
    if (!player) {
      console.log(`Player ${socket.id} not in room ${roomId}, ignoring answer`)
      return
    }
    
    const selectedOption = room.options[answerIndex]
    const isCorrect = selectedOption?.isCorrect || false
    
    room.answers.set(socket.id, {
      answerIndex,
      timeTaken,
      isCorrect,
      playerName: player.name
    })
    
    // Calculate points but don't add to score yet - wait until round ends
    if (isCorrect) {
      // Points in hundreds, with milliseconds counting
      // Max 1000 points at 0 seconds, 0 points at 10 seconds
      const points = Math.max(0, Math.floor((10 - timeTaken) * 100))
      player.currentRoundScore = points
    } else {
      player.currentRoundScore = 0
    }
    
    // Update all players with new answers (but don't update scores yet)
    room.players.forEach((player, playerId) => {
      io.to(playerId).emit('room-updated', getRoomState(roomId))
    })
    
    console.log(`Player ${player.name} answered. Answers: ${room.answers.size}/${room.players.size}`)
    
    // Check if all remaining players answered
    if (room.answers.size === room.players.size && room.players.size > 0) {
      console.log(`All players answered, showing answers...`)
      
      // NOW apply the round scores to the main scores
      room.players.forEach((player) => {
        player.score += player.currentRoundScore
      })
      
      // Send updated scores to all players
      room.players.forEach((player, playerId) => {
        io.to(playerId).emit('room-updated', getRoomState(roomId))
      })
      
      // Emit event to all players to show the answer
      room.players.forEach((player, playerId) => {
        io.to(playerId).emit('all-answers-submitted')
      })
      // Wait 3 seconds for players to see the answer, then move to next round
      setTimeout(() => {
        nextRound(roomId)
      }, 3000)
    }
  })

  socket.on('next-round', (data) => {
    const { roomId } = data
    nextRound(roomId)
  })

  socket.on('set-round-data', async (data) => {
    const { roomId, track, options, gameMode } = data
    console.log(`=== SET-ROUND-DATA RECEIVED ===`)
    console.log(`set-round-data received from ${socket.id} for room ${roomId}`)
    const room = rooms.get(roomId)
    if (!room) {
      console.log(`Room ${roomId} not found - sending error to client`)
      // Send error to client so it knows to stop trying
      socket.emit('room-error', { message: 'Room not found' })
      return
    }
    
    // Verify the player is actually in this room
    if (!room.players.has(socket.id)) {
      console.log(`Player ${socket.id} not in room ${roomId} - sending error`)
      socket.emit('room-error', { message: 'You are not in this room' })
      return
    }
    if (room.roundStarted) {
      console.log(`Round already started in room ${roomId}, ignoring duplicate set-round-data`)
      return // Only accept if round hasn't started
    }
    
    if (!track || !options || !gameMode) {
      console.error(`Invalid round data from ${socket.id}: missing track, options, or gameMode`)
      return
    }
    
    console.log(`Setting round data for room ${roomId}:`, {
      trackName: track?.name,
      optionsCount: options?.length,
      gameMode
    })
    
    room.currentTrack = track
    room.options = options
    room.gameMode = gameMode
    room.roundStarted = true
    room.roundStartTime = Date.now() // Track when round started for timeout
    
    // Clear any existing timeout
    if (room.roundTimeout) {
      clearTimeout(room.roundTimeout)
    }
    
    console.log(`Broadcasting round-started to room ${roomId} with ${room.players.size} players`)
    console.log(`Room ${roomId} player IDs:`, Array.from(room.players.keys()))
    
    // Get all sockets in the room to verify
    const roomSockets = await io.in(roomId).fetchSockets()
    console.log(`Room ${roomId} has ${roomSockets.length} connected sockets`)
    roomSockets.forEach(s => {
      console.log(`  - Socket ${s.id} in room ${roomId}`)
    })
    
    // Only send to players who are still in the room
    console.log(`Emitting round-started to ${room.players.size} active players in room ${roomId}...`)
    room.players.forEach((player, playerId) => {
      console.log(`Sending round-started to player ${playerId} (${player.name})`)
      io.to(playerId).emit('round-started', {
        track,
        options,
        gameMode
      })
    })
    
    console.log(`=== ROUND-STARTED BROADCAST COMPLETE ===`)
    
    // Set timeout for unanswered questions (10 seconds after audio starts, so ~15 seconds total)
    room.roundTimeout = setTimeout(() => {
      const currentRoom = rooms.get(roomId)
      if (!currentRoom || !currentRoom.roundStarted) return
      
      // Check if any remaining players haven't answered (only check players still in room)
      const remainingPlayers = Array.from(currentRoom.players.keys())
      const unanswered = remainingPlayers.filter(
        playerId => !currentRoom.answers.has(playerId)
      )
      
      if (unanswered.length > 0) {
        console.log(`Timeout: ${unanswered.length} players haven't answered, marking as incorrect`)
        unanswered.forEach(playerId => {
          const player = currentRoom.players.get(playerId)
          if (player) {
            currentRoom.answers.set(playerId, {
              answerIndex: -1,
              timeTaken: 10,
              isCorrect: false,
              playerName: player.name
            })
            player.currentRoundScore = 0
          }
        })
        
        // Only send to active players
        if (currentRoom) {
          currentRoom.players.forEach((player, playerId) => {
            io.to(playerId).emit('room-updated', getRoomState(roomId))
          })
        }
        
        // NOW apply the round scores to the main scores (for timeout case)
        if (currentRoom) {
          currentRoom.players.forEach((player) => {
            player.score += player.currentRoundScore
          })
          
          // Send updated scores to all players
          currentRoom.players.forEach((player, playerId) => {
            io.to(playerId).emit('room-updated', getRoomState(roomId))
          })
        }
        
        // Emit event to all players to show the answer (even if some timed out)
        if (currentRoom) {
          currentRoom.players.forEach((player, playerId) => {
            io.to(playerId).emit('all-answers-submitted')
          })
        }
        
        // Wait 3 seconds for players to see the answer, then move to next round
        setTimeout(() => {
          nextRound(roomId)
        }, 3000)
      }
    }, 15000) // 15 seconds (5s countdown + 10s audio)
  })

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id)
    
    // Remove player from all rooms
    for (const [roomId, room] of rooms.entries()) {
      if (room.players.has(socket.id)) {
        const isHost = room.hostId === socket.id
        
        room.players.delete(socket.id)
        
        if (isHost) {
          // Host disconnected - close room and kick all other players
          console.log(`Host disconnected from room ${roomId}, closing room and kicking ${room.players.size} other players`)
          
          const otherPlayerIds = Array.from(room.players.keys())
          otherPlayerIds.forEach(playerId => {
            io.to(playerId).emit('room-closed', { message: 'Host disconnected' })
          })
          
          rooms.delete(roomId)
        } else {
          // Regular player disconnected
          if (room.players.size === 0) {
            rooms.delete(roomId)
          } else {
            // Only send to active players
            room.players.forEach((player, playerId) => {
              io.to(playerId).emit('room-updated', getRoomState(roomId))
            })
          }
        }
        break
      }
    }
  })
})

function getRoomState(roomId) {
  const room = rooms.get(roomId)
  if (!room) return null
  
  return {
    roomId: room.id,
    hostId: room.hostId,
    players: Array.from(room.players.values()),
    currentRound: room.currentRound,
    totalRounds: room.totalRounds || 10,
    genre: room.genre || 'any',
    type: room.type || 'any',
    currentTrack: room.currentTrack,
    options: room.options,
    gameMode: room.gameMode,
    roundStarted: room.roundStarted,
    answers: Array.from(room.answers.entries()).map(([id, answer]) => ({
      playerId: id,
      ...answer
    })),
    gameOver: room.currentRound >= (room.totalRounds || 10)
  }
}

async function startGame(roomId) {
  const room = rooms.get(roomId)
  if (!room) return
  
  room.currentRound = 1
  // Only send to active players
  room.players.forEach((player, playerId) => {
    io.to(playerId).emit('game-started')
  })
  await loadRound(roomId)
}

async function loadRound(roomId) {
  const room = rooms.get(roomId)
  if (!room) {
    console.log(`loadRound: Room ${roomId} not found`)
    return
  }
  
  // Check if there are still players in the room
  if (room.players.size === 0) {
    console.log(`loadRound: No players in room ${roomId}, deleting room`)
    rooms.delete(roomId)
    return
  }
  
  // Check if host is still in the room
  if (!room.players.has(room.hostId)) {
    console.log(`loadRound: Host left room ${roomId}, closing room`)
    const otherPlayerIds = Array.from(room.players.keys())
    otherPlayerIds.forEach(playerId => {
      io.to(playerId).emit('room-closed', { message: 'Host left the room' })
    })
    rooms.delete(roomId)
    return
  }
  
  console.log(`loadRound: Loading round ${room.currentRound} for room ${roomId} with ${room.players.size} players`)
  
  // Clear any existing timeout
  if (room.roundTimeout) {
    clearTimeout(room.roundTimeout)
    room.roundTimeout = null
  }
  
  // Reset round state
  room.roundStarted = false
  room.answers.clear()
  room.currentTrack = null
  room.options = []
  
  // Only send load-round to players who are still in the room
  // Only the host should load tracks and send track data
  // Other players will wait for round-started event
  if (room.players.has(room.hostId)) {
    console.log(`loadRound: Emitting to host ${room.hostId}`)
    io.to(room.hostId).emit('load-round', { round: room.currentRound, isHost: true })
  }
  
  // Tell other players to wait (they'll receive round-started when host sends track data)
  const otherPlayers = Array.from(room.players.keys()).filter(id => id !== room.hostId)
  console.log(`loadRound: ${otherPlayers.length} other players waiting for round-started`)
  if (otherPlayers.length > 0) {
    otherPlayers.forEach(playerId => {
      if (room.players.has(playerId)) {
        io.to(playerId).emit('load-round', { round: room.currentRound, isHost: false })
      }
    })
  }
}

async function nextRound(roomId) {
  const room = rooms.get(roomId)
  if (!room) return
  
  room.currentRound++
  const totalRounds = room.totalRounds || 10
  
  if (room.currentRound > totalRounds) {
    // Game over - send results but don't delete room yet (players can view results)
    // Only send to active players
    room.players.forEach((player, playerId) => {
      io.to(playerId).emit('game-over', {
        players: Array.from(room.players.values()).sort((a, b) => b.score - a.score)
      })
    })
    // Mark room as finished - it will be cleaned up when all players leave
    room.gameFinished = true
  } else {
    await loadRound(roomId)
  }
}


const PORT = process.env.PORT || 3001
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

