import { useState, useRef } from 'react'
import { pickDistractors, buildOptionsList, shuffleArray } from '../utils/gameLogic'

export function useGameLogic() {
  const [gameMode, setGameMode] = useState(null) // 'song' or 'artist'
  const [currentTrack, setCurrentTrack] = useState(null)
  const [options, setOptions] = useState([])
  const [selectedIdx, setSelectedIdx] = useState(null)
  const [isCorrect, setIsCorrect] = useState(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [score, setScore] = useState(0)
  const [timePlayed, setTimePlayed] = useState(0)
  const [autoStartIn, setAutoStartIn] = useState(null)

  const loadNewTrack = (tracksPool, onTrackLoaded, isMultiplayer = false, roomId = null, socket = null, roomIdRef = null, isMultiplayerRef = null) => {
    if (!tracksPool || tracksPool.length === 0) {
      console.warn('No tracks available to load')
      return
    }
    
    console.log(`Loading new track from pool of ${tracksPool.length} tracks`)
    const randomIndex = Math.floor(Math.random() * tracksPool.length)
    const track = tracksPool[randomIndex]
    console.log('Selected track:', track.name, 'Preview URL:', track.preview_url)
    
    if (!track.preview_url) {
      console.error('Selected track has no preview URL, skipping')
      return
    }
    
    // Reset state
    setIsCorrect(null)
    setShowAnswer(false)
    setTimePlayed(0)
    setSelectedIdx(null)
    setAutoStartIn(null)
    
    // Randomly choose mode each round (song or artist)
    const mode = Math.random() < 0.5 ? 'song' : 'artist'
    setGameMode(mode)

    // Build options (3 distractors + 1 correct)
    const distractorPool = tracksPool.filter((_, idx) => idx !== randomIndex)
    const distractors = pickDistractors(track, distractorPool, mode, 3)
    const builtOptions = buildOptionsList(track, distractors, mode)
    const shuffledOptions = shuffleArray(builtOptions)
    
    console.log('Built options:', shuffledOptions.map(opt => ({ label: opt.label, isCorrect: opt.isCorrect })))
    
    // Check multiplayer state
    const currentRoomId = roomIdRef?.current || roomId
    const currentIsMultiplayer = isMultiplayerRef?.current || isMultiplayer
    const shouldSendToServer = currentIsMultiplayer && currentRoomId && socket && socket.connected
    
    if (shouldSendToServer) {
      // Send track data to server for synchronization
      console.log('=== SENDING ROUND DATA TO SERVER ===')
      socket.emit('set-round-data', {
        roomId: currentRoomId,
        track,
        options: shuffledOptions,
        gameMode: mode
      })
      console.log('=== ROUND DATA SENT ===')
    } else if (!currentIsMultiplayer) {
      // Single player
      setCurrentTrack(track)
      setOptions(shuffledOptions)
      if (onTrackLoaded) {
        onTrackLoaded(track, shuffledOptions)
      }
    }
    
    // Return the track and options for the caller to handle
    return { track, options: shuffledOptions, mode, removedIndex: randomIndex }
  }

  const handleChoice = (idx, timePlayed, roundStartAtRef, onAnswer, isMultiplayer = false, roomId = null, socket = null) => {
    if (!currentTrack || showAnswer) return
    
    setSelectedIdx(idx)
    const chosen = options[idx]
    const correct = !!chosen?.isCorrect
    setIsCorrect(correct)
    setShowAnswer(true)
    
    const elapsedSec = typeof timePlayed === 'number' && timePlayed > 0
      ? timePlayed
      : (roundStartAtRef?.current ? (performance.now() - roundStartAtRef.current) / 1000 : 0)
    
    if (isMultiplayer && roomId && socket) {
      // Send answer to server
      socket.emit('submit-answer', {
        roomId,
        answerIndex: idx,
        timeTaken: elapsedSec
      })
    } else {
      // Single player logic
      if (correct) {
        const points = Math.max(0, 10 - Math.floor(elapsedSec))
        setScore(prev => prev + points)
      }
      if (onAnswer) {
        onAnswer(correct, elapsedSec)
      }
    }
  }

  return {
    gameMode,
    setGameMode,
    currentTrack,
    setCurrentTrack,
    options,
    setOptions,
    selectedIdx,
    setSelectedIdx,
    isCorrect,
    setIsCorrect,
    showAnswer,
    setShowAnswer,
    score,
    setScore,
    timePlayed,
    setTimePlayed,
    autoStartIn,
    setAutoStartIn,
    loadNewTrack,
    handleChoice
  }
}

