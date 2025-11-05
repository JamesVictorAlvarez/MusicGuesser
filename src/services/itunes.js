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


