// iTunes Search API (no auth) - provides 30s previews

// Map iTunes song result to our common track shape
function mapITunesToTrack(item) {
	return {
		id: String(item.trackId),
		name: item.trackName,
		artists: [{ name: item.artistName }],
		preview_url: item.previewUrl, // 30s mp3
		album: {
			images: [{ url: item.artworkUrl100?.replace('100x100', '300x300') || item.artworkUrl100 }]
		}
	};
}

// Fetch songs from iTunes by a generic term/genre
export async function getITunesTracksByTerm(term, limit = 50, country = 'US') {
	try {
		const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=${limit}&country=${country}`;
		const res = await fetch(url);
		if (!res.ok) {
			console.error('iTunes API error:', res.status);
			return [];
		}
		const data = await res.json();
		const items = Array.isArray(data.results) ? data.results : [];
		return items
			.filter(item => !!item.previewUrl)
			.map(mapITunesToTrack);
	} catch (err) {
		console.error('Error fetching iTunes tracks:', err);
		return [];
	}
}

// Try multiple popular terms to get a diverse list
export async function getITunesRandomTracks(limit = 50, preferredTerm) {
	const terms = preferredTerm && preferredTerm !== 'any'
		? [preferredTerm]
		: ['pop', 'rock', 'hip hop', 'indie', 'electronic', 'r&b', 'dance', 'latin', 'country', 'jazz'];
	for (const term of terms) {
		const tracks = await getITunesTracksByTerm(term, limit);
		if (tracks.length > 0) {
			console.log(`Using iTunes fallback with term "${term}": ${tracks.length} tracks with previews`);
			return tracks;
		}
	}
	return [];
}

// Search for tracks by playlist name (uses playlist name as search term)
export async function getITunesTracksByPlaylist(playlistName, limit = 50) {
	try {
		// Use playlist name as search term to find related tracks
		const url = `https://itunes.apple.com/search?term=${encodeURIComponent(playlistName)}&entity=song&limit=${limit}&country=US`;
		const res = await fetch(url);
		if (!res.ok) {
			console.error('iTunes API error:', res.status);
			return [];
		}
		const data = await res.json();
		const items = Array.isArray(data.results) ? data.results : [];
		return items
			.filter(item => !!item.previewUrl)
			.map(mapITunesToTrack);
	} catch (err) {
		console.error('Error fetching iTunes tracks by playlist:', err);
		return [];
	}
}

// Get album artwork for a genre by searching iTunes
export async function getITunesAlbumArtworkForGenre(genre) {
	try {
		const searchTerms = {
			'pop': 'pop music',
			'rock': 'rock music',
			'hip-hop': 'hip hop',
			'indie': 'indie music',
			'electronic': 'electronic music',
			'r-n-b': 'r&b',
			'dance': 'dance music',
			'latin': 'latin music',
			'country': 'country music',
			'jazz': 'jazz music',
			'k-pop': 'k-pop',
			'j-pop': 'j-pop',
			'opm': 'philippine pop',
			'metal': 'metal music',
		};
		
		const searchTerm = searchTerms[genre] || genre;
		const url = `https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&entity=album&limit=10&country=US`;
		const res = await fetch(url);
		
		if (!res.ok) {
			console.error('iTunes API error for artwork:', res.status);
			return null;
		}
		
		const data = await res.json();
		const albums = Array.isArray(data.results) ? data.results : [];
		
		// Find first album with artwork
		for (const album of albums) {
			if (album.artworkUrl100) {
				// Return higher resolution artwork (replace 100x100 with larger size)
				return album.artworkUrl100.replace('100x100', '600x600');
			}
		}
		
		return null;
	} catch (err) {
		console.error('Error fetching iTunes album artwork:', err);
		return null;
	}
}


