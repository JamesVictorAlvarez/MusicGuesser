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

    const data = await response.json();
    
    if (data.access_token) {
      accessToken = data.access_token;
      tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Refresh 1 min before expiry
      return accessToken;
    }
    
    throw new Error('Failed to get access token');
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
export async function getRandomTracks(limit = 50) {
  const token = await getAccessToken();
  
  if (!token) {
    return getMockTracks();
  }

  // Get popular tracks by searching for common terms
  const searchTerms = ['year:2020-2024', 'popular', 'top'];
  const randomTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];
  
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(randomTerm)}&type=track&limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    const data = await response.json();
    return data.tracks?.items || [];
  } catch (error) {
    console.error('Error getting random tracks:', error);
    return getMockTracks();
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

