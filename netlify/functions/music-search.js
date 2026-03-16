// netlify/functions/music-search.js
// Unified search across all platforms: Spotify, YouTube, Apple Music, SoundCloud

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
};

/**
 * Search all music platforms simultaneously
 * Returns combined results from Spotify, YouTube, Apple Music
 */
export async function handler(event) {
  console.log('🎵 music-search: Unified search across all platforms');

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const params = event.queryStringParameters || {};
  const query = String(params.q || '').trim();
  const limit = Math.max(1, Math.min(parseInt(params.limit || '6'), 50));
  const platform = params.platform || 'all'; // all, spotify, youtube, apple

  if (!query) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Missing query parameter' })
    };
  }

  try {
    console.log(`🔍 Searching all platforms for: "${query}"`);

    // Determine which platforms to search
    const searchSpotify = platform === 'all' || platform === 'spotify';
    const searchYouTube = platform === 'all' || platform === 'youtube';
    const searchApple = platform === 'all' || platform === 'apple';

    const searches = [];

    // Spotify search
    if (searchSpotify) {
      searches.push(
        fetch(`${event.headers.origin || 'https://fluence.netlify.app'}/.netlify/functions/spotify-search?q=${encodeURIComponent(query)}&limit=${limit}`)
          .then(r => r.json())
          .catch(() => ({ tracks: [], playlists: [] }))
      );
    }

    // YouTube search
    if (searchYouTube) {
      searches.push(
        fetch(`${event.headers.origin || 'https://fluence.netlify.app'}/.netlify/functions/youtube-search?q=${encodeURIComponent(query)}&limit=${limit}`)
          .then(r => r.json())
          .catch(() => ({ playlists: [], videos: [] }))
      );
    }

    // Apple Music search
    if (searchApple) {
      searches.push(
        fetch(`${event.headers.origin || 'https://fluence.netlify.app'}/.netlify/functions/apple-music-search?q=${encodeURIComponent(query)}&limit=${limit}`)
          .then(r => r.json())
          .catch(() => ({ playlists: [], songs: [] }))
      );
    }

    // Wait for all searches to complete
    const results = await Promise.all(searches);

    // Combine results
    let allPlaylists = [];
    let allTracks = [];

    results.forEach(result => {
      // Spotify results
      if (result.tracks) {
        allTracks.push(...result.tracks.map(t => ({ ...t, source: 'spotify' })));
      }
      if (result.playlists && result.success) {
        allPlaylists.push(...result.playlists.map(p => ({ ...p, source: 'spotify' })));
      }

      // YouTube results
      if (result.videos) {
        allTracks.push(...result.videos.map(v => ({ ...v, source: 'youtube' })));
      }
      if (result.playlists && result.success) {
        allPlaylists.push(...result.playlists.map(p => ({ ...p, source: 'youtube' })));
      }

      // Apple Music results
      if (result.songs) {
        allTracks.push(...result.songs.map(s => ({ ...s, source: 'apple' })));
      }
      if (result.playlists && result.success) {
        allPlaylists.push(...result.playlists.map(p => ({ ...p, source: 'apple' })));
      }
    });

    console.log(`✅ Combined: ${allTracks.length} tracks, ${allPlaylists.length} playlists`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        query,
        tracks: allTracks,
        playlists: allPlaylists,
        total: {
          tracks: allTracks.length,
          playlists: allPlaylists.length
        },
        platforms: {
          spotify: searchSpotify,
          youtube: searchYouTube,
          apple: searchApple
        }
      })
    };

  } catch (err) {
    console.error('❌ Unified search error:', err);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Search failed',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      })
    };
  }
}