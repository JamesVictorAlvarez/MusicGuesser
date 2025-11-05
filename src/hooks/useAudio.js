import { useRef, useEffect } from 'react'

export function useAudio() {
  const audioRef = useRef(null)
  const roundStartAtRef = useRef(null)
  const countdownIntervalRef = useRef(null)
  const autoStartTimeoutRef = useRef(null)
  const roundAutoEndTimeoutRef = useRef(null)

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      clearInterval(countdownIntervalRef.current)
      clearTimeout(autoStartTimeoutRef.current)
      clearTimeout(roundAutoEndTimeoutRef.current)
    }
  }, [])

  const startAudioPlayback = (onTimeout) => {
    if (!audioRef.current) return
    audioRef.current.currentTime = 0
    audioRef.current.play()
    roundStartAtRef.current = performance.now()
    
    // Auto end round at 10s if no answer
    clearTimeout(roundAutoEndTimeoutRef.current)
    roundAutoEndTimeoutRef.current = setTimeout(() => {
      if (onTimeout) {
        onTimeout()
      }
    }, 10000)
  }

  const startAutoPlayCountdown = (seconds, setAutoStartIn, onComplete) => {
    if (setAutoStartIn) {
      setAutoStartIn(seconds)
    }
    clearInterval(countdownIntervalRef.current)
    clearTimeout(autoStartTimeoutRef.current)
    
    countdownIntervalRef.current = setInterval(() => {
      if (setAutoStartIn) {
        setAutoStartIn(prev => {
          if (prev === null) return null
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current)
            return 0
          }
          return prev - 1
        })
      }
    }, 1000)
    
    autoStartTimeoutRef.current = setTimeout(() => {
      if (setAutoStartIn) {
        setAutoStartIn(0)
      }
      clearInterval(countdownIntervalRef.current)
      if (onComplete) {
        onComplete()
      } else {
        startAudioPlayback()
      }
    }, seconds * 1000)
  }

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    clearInterval(countdownIntervalRef.current)
    clearTimeout(autoStartTimeoutRef.current)
    clearTimeout(roundAutoEndTimeoutRef.current)
  }

  const getElapsedTime = () => {
    if (roundStartAtRef.current) {
      return (performance.now() - roundStartAtRef.current) / 1000
    }
    return 0
  }

  return {
    audioRef,
    roundStartAtRef,
    startAudioPlayback,
    startAutoPlayCountdown,
    stopAudio,
    getElapsedTime,
    clearTimers: () => {
      clearInterval(countdownIntervalRef.current)
      clearTimeout(autoStartTimeoutRef.current)
      clearTimeout(roundAutoEndTimeoutRef.current)
    }
  }
}

