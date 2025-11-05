// Spotify API Service
// Note: Spotify Web API requires authentication
// For production, you'll need to implement OAuth flow
// For development, you can use a client credentials flow or temporary access token

const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || '';
const SPOTIFY_CLIENT_SECRET = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET || '';

let accessToken = null;
let tokenExpiry = null;

// Get access token using Client Credentials flow
async function getAccessToken() {
  // If we have a valid token, return it
  if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
    return accessToken;
  }

  // If no credentials provided, use a mock token (for demo purposes)
  // In production, you MUST implement proper OAuth flow
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    console.warn('Spotify credentials not set. Using demo mode with mock data.');
    console.log('Client ID exists:', !!SPOTIFY_CLIENT_ID);
    return null;
  }

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)
      },
      body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Spotify API error:', response.status, errorData);
      throw new Error(`Failed to get access token: ${response.status} ${errorData.error_description || errorData.error || 'Unknown error'}`);
    }

    const data = await response.json();
    
    if (data.access_token) {
      accessToken = data.access_token;
      tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Refresh 1 min before expiry
      console.log('Successfully obtained Spotify access token');
      return accessToken;
    }
    
    throw new Error('Failed to get access token: No token in response');
  } catch (error) {
    console.error('Error getting access token:', error);
    return null;
  }
}

// Search for tracks
export async function searchTracks(query, limit = 20) {
  const token = await getAccessToken();
  
  if (!token) {
    // Return mock data for demo
    return getMockTracks();
  }

  try {
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    const data = await response.json();
    return data.tracks?.items || [];
  } catch (error) {
    console.error('Error searching tracks:', error);
    return [];
  }
}

// Get random popular tracks
export async function getRandomTracks(limit = 50, genre = 'any', year = 'any', type = 'any') {
  const token = await getAccessToken();
  
  if (!token) {
    console.log('No token available, returning mock tracks');
    return getMockTracks();
  }

  // If a specific genre is selected, try Spotify recommendations first
  const effectiveSeed = (type && type !== 'any') ? type : genre;
  if (effectiveSeed && effectiveSeed !== 'any') {
    try {
      const recRes = await fetch(
        `https://api.spotify.com/v1/recommendations?limit=${limit}&market=US&seed_genres=${encodeURIComponent(effectiveSeed)}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      if (recRes.ok) {
        const recData = await recRes.json();
        const tracks = recData.tracks || [];
        const withPreview = tracks.filter(t => t.preview_url);
        if (withPreview.length > 0) {
          console.log(`Recommendations for genre "${genre}": ${withPreview.length} tracks with previews`);
          return withPreview;
        }
      } else {
        const errorData = await recRes.json().catch(() => ({}));
        console.error('Spotify recommendations error:', recRes.status, errorData);
      }
    } catch (e) {
      console.error('Error fetching recommendations:', e);
    }
  }

  // Build search strategies (honor year and type/genre when possible)
  const qPartsBase = [];
  if (year && year !== 'any') {
    if (/^\d{4}$/.test(year)) {
      qPartsBase.push(`year:${year}`)
    } else if (/^\d{4}s$/.test(year)) {
      // e.g., 2010s -> 2010-2019
      const start = parseInt(year.slice(0,4), 10);
      qPartsBase.push(`year:${start}-${start+9}`)
    } else if (/^\d{4}-\d{4}$/.test(year)) {
      qPartsBase.push(`year:${year}`)
    }
  }
  const typeOrGenre = (effectiveSeed && effectiveSeed !== 'any') ? `genre:${effectiveSeed}` : '';
  const searchStrategies = [
    { query: [...qPartsBase, typeOrGenre || 'tag:new'].filter(Boolean).join(' '), name: 'targeted' },
    { query: [...qPartsBase, 'tag:hipster'].filter(Boolean).join(' '), name: 'hipster' },
    { query: [...qPartsBase, 'tag:2010s'].filter(Boolean).join(' '), name: '2010s' },
    { query: [...qPartsBase, 'genre:pop'].filter(Boolean).join(' '), name: 'pop' },
    { query: [...qPartsBase, 'genre:rock'].filter(Boolean).join(' '), name: 'rock' },
    { query: [...qPartsBase, 'genre:indie'].filter(Boolean).join(' '), name: 'indie' },
    { query: [...qPartsBase, 'year:2020-2024'].filter(Boolean).join(' '), name: 'recent' },
  ];

  // Try each strategy until we get tracks with previews
  for (const strategy of searchStrategies) {
    try {
      const response = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(strategy.query)}&type=track&limit=${limit}&market=US`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`Spotify search error (${strategy.name}):`, response.status, errorData);
        continue; // Try next strategy
      }

      const data = await response.json();
      const tracks = data.tracks?.items || [];
      
      if (tracks.length > 0) {
        console.log(`Found ${tracks.length} tracks using ${strategy.name} strategy`);
        const tracksWithPreview = tracks.filter(track => track.preview_url);
        console.log(`${tracksWithPreview.length} tracks have preview URLs`);
        
        if (tracksWithPreview.length > 0) {
          return tracksWithPreview;
        }
      }
    } catch (error) {
      console.error(`Error searching tracks (${strategy.name}):`, error);
      continue; // Try next strategy
    }
  }

  // If all strategies failed, try iTunes fallback
  try {
    const { getITunesRandomTracks } = await import('./itunes');
    const termForITunes = [
      (effectiveSeed && effectiveSeed !== 'any') ? effectiveSeed : '',
      (year && year !== 'any') ? year : ''
    ].filter(Boolean).join(' ');
    const itunesTracks = await getITunesRandomTracks(limit, termForITunes || undefined);
    if (itunesTracks.length > 0) {
      console.warn('Using iTunes fallback (Spotify previews unavailable)');
      return itunesTracks;
    }
  } catch (e) {
    console.error('iTunes fallback failed:', e);
  }

  // If everything failed, return mock data
  console.warn('All strategies failed, returning mock tracks');
  return getMockTracks();
}

// Get Spotify's official available genre seeds
export async function getAvailableGenres() {
  const token = await getAccessToken();
  if (!token) return [];
  try {
    const res = await fetch('https://api.spotify.com/v1/recommendations/available-genre-seeds', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('Error fetching genre seeds:', res.status, err);
      return [];
    }
    const data = await res.json();
    return Array.isArray(data.genres) ? data.genres : [];
  } catch (e) {
    console.error('Error fetching genre seeds:', e);
    return [];
  }
}

// Get playlist cover for a genre by searching for featured playlists
export async function getPlaylistCoverForGenre(genre) {
  const token = await getAccessToken();
  if (!token) return null;
  
  try {
    // Search for playlists with genre name
    const searchTerms = {
      'pop': 'top hits pop',
      'rock': 'rock classics',
      'hip-hop': 'hip hop hits',
      'indie': 'indie music',
      'electronic': 'electronic dance',
      'r-n-b': 'r&b hits',
      'dance': 'dance hits',
      'latin': 'latin music',
      'country': 'country hits',
      'jazz': 'jazz classics',
      'k-pop': 'k-pop',
      'j-pop': 'j-pop',
      'opm': 'philippine pop',
      'metal': 'metal music',
      'soul': 'soul music',
      'funk': 'funk music',
      'blues': 'blues classics',
      'reggae': 'reggae music'
    };
    
    const searchTerm = searchTerms[genre] || genre;
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchTerm)}&type=playlist&limit=5`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const playlists = data.playlists?.items || [];
    
    // Find first playlist with cover image
    for (const playlist of playlists) {
      if (playlist.images && playlist.images.length > 0) {
        return playlist.images[0].url;
      }
    }
    
    return null;
  } catch (e) {
    console.error('Error fetching playlist cover:', e);
    return null;
  }
}

// Mock data for demo purposes (when API credentials not available)
function getMockTracks() {
  return [
    {
      id: '1',
      name: 'Blinding Lights',
      artists: [{ name: 'The Weeknd' }],
      preview_url: 'https://p.scdn.co/mp3-preview/1f8c8e8c8e8c8e8c8e8c8e8c8e8c8e8c8e8c8e8c',
      album: { images: [{ url: 'https://via.placeholder.com/300' }] }
    },
    {
      id: '2',
      name: 'Shape of You',
      artists: [{ name: 'Ed Sheeran' }],
      preview_url: 'https://p.scdn.co/mp3-preview/2f8c8e8c8e8c8e8c8e8c8e8c8e8c8e8c8e8c8e8c',
      album: { images: [{ url: 'https://via.placeholder.com/300' }] }
    },
    {
      id: '3',
      name: 'Someone Like You',
      artists: [{ name: 'Adele' }],
      preview_url: 'https://p.scdn.co/mp3-preview/3f8c8e8c8e8c8e8c8e8c8e8c8e8c8e8c8e8c8e8c',
      album: { images: [{ url: 'https://via.placeholder.com/300' }] }
    },
    {
      id: '4',
      name: 'Uptown Funk',
      artists: [{ name: 'Bruno Mars' }],
      preview_url: 'https://p.scdn.co/mp3-preview/4f8c8e8c8e8c8e8c8e8c8e8c8e8c8e8c8e8c8e8c',
      album: { images: [{ url: 'https://via.placeholder.com/300' }] }
    },
    {
      id: '5',
      name: 'Despacito',
      artists: [{ name: 'Luis Fonsi' }],
      preview_url: 'https://p.scdn.co/mp3-preview/5f8c8e8c8e8c8e8c8e8c8e8c8e8c8e8c8e8c8e8c',
      album: { images: [{ url: 'https://via.placeholder.com/300' }] }
    }
  ];
}

