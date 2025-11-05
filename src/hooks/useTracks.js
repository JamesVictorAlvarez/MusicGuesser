import { useState } from 'react'
import { getRandomTracks } from '../services/spotify'

export function useTracks() {
  const [tracks, setTracks] = useState([])
  const [loading, setLoading] = useState(false)

  const loadTracks = async (genre = 'any', type = 'any') => {
    setLoading(true)
    try {
      const fetchedTracks = await getRandomTracks(50, genre, 'any', type)
      const tracksWithPreview = fetchedTracks.filter(track => track.preview_url)
      console.log(`Loaded ${fetchedTracks.length} tracks, ${tracksWithPreview.length} with preview URLs`)
      
      if (tracksWithPreview.length === 0 && fetchedTracks.length > 0) {
        console.warn('Tracks loaded but none have preview URLs. This might be a region/content availability issue.')
      }
      
      setTracks(tracksWithPreview)
      return tracksWithPreview
    } catch (error) {
      console.error('Error loading tracks:', error)
      setTracks([])
      return []
    } finally {
      setLoading(false)
    }
  }

  return {
    tracks,
    setTracks,
    loading,
    setLoading,
    loadTracks
  }
}

