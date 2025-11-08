import { useState } from 'react'
import { getITunesRandomTracks, getITunesTracksByPlaylist } from '../services/itunes'

export function useTracks() {
  const [tracks, setTracks] = useState([])
  const [loading, setLoading] = useState(false)

  const loadTracks = async (genre = 'any', type = 'any', playlistName = null) => {
    setLoading(true)
    try {
      let fetchedTracks = []
      
      // If playlist name is provided, search by playlist
      if (playlistName && playlistName.trim()) {
        fetchedTracks = await getITunesTracksByPlaylist(playlistName.trim(), 50)
        console.log(`Loaded ${fetchedTracks.length} tracks from playlist "${playlistName}"`)
      } else {
        // Use iTunes Search API (free, no auth required, 30s previews)
        const preferredTerm = (type && type !== 'any') ? type : (genre && genre !== 'any') ? genre : undefined
        fetchedTracks = await getITunesRandomTracks(50, preferredTerm)
        console.log(`Loaded ${fetchedTracks.length} tracks from iTunes, ${fetchedTracks.length} with preview URLs`)
      }
      
      const tracksWithPreview = fetchedTracks.filter(track => track.preview_url)
      
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

