// netlify/functions/apple-music-search.js
// Apple Music MusicKit API integration

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
};

/**
 * Search Apple Music catalog
 */
export async function handler(event) {
  console.log('🍎 apple-music-search function called');

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // ✅ SIMPLEST FIX: Just disable Apple Music entirely for now
  console.log('⚠️ Apple Music temporarily disabled');
  return {
    statusCode: 503,
    headers,
    body: JSON.stringify({
      success: false,
      error: 'Apple Music not available',
      message: 'Apple Music is temporarily disabled. Please use Spotify, YouTube, or SoundCloud.',
      playlists: [],
      songs: []
    })
  };

  /* 
   * The code below will work when you get Apple Music credentials.
   * For now, it's commented out to prevent errors.
   * 
   * Uncomment this when you have:
   * - APPLE_TEAM_ID
   * - APPLE_KEY_ID  
   * - APPLE_PRIVATE_KEY
   * - jsonwebtoken installed
   */

  /*
  const APPLE_TEAM_ID = process.env.APPLE_TEAM_ID;
  const APPLE_KEY_ID = process.env.APPLE_KEY_ID;
  const APPLE_PRIVATE_KEY = process.env.APPLE_PRIVATE_KEY;

  const params = event.queryStringParameters || {};
  const query = String(params.q || '').trim();
  const limit = Math.max(1, Math.min(parseInt(params.limit || '10'), 25));

  if (!query) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Missing query parameter' })
    };
  }

  if (!APPLE_TEAM_ID || !APPLE_KEY_ID || !APPLE_PRIVATE_KEY) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Apple Music not configured',
        playlists: [],
        songs: []
      })
    };
  }

  try {
    // Dynamic import of jsonwebtoken (inside async function, not top-level)
    const jwt = await import('jsonwebtoken');
    
    console.log(`🔍 Searching Apple Music for: "${query}"`);

    // Generate developer token
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: APPLE_TEAM_ID,
      iat: now,
      exp: now + (60 * 60 * 24 * 180),
    };

    const developerToken = jwt.default.sign(payload, APPLE_PRIVATE_KEY, {
      algorithm: 'ES256',
      keyid: APPLE_KEY_ID,
    });

    const searchUrl = `https://api.music.apple.com/v1/catalog/us/search?` +
      `term=${encodeURIComponent(query)}&` +
      `types=playlists,songs&` +
      `limit=${limit}`;

    const response = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${developerToken}`,
      }
    });

    if (!response.ok) {
      throw new Error(`Apple Music API error: ${response.status}`);
    }

    const data = await response.json();

    const playlists = (data.results?.playlists?.data || []).map(item => ({
      id: item.id,
      type: 'playlist',
      title: item.attributes.name,
      description: item.attributes.description?.standard || '',
      thumbnail: item.attributes.artwork?.url
        ? item.attributes.artwork.url.replace('{w}', '400').replace('{h}', '400')
        : null,
      curatorName: item.attributes.curatorName,
      trackCount: item.attributes.trackCount,
      url: item.attributes.url,
      platform: 'apple'
    }));

    const songs = (data.results?.songs?.data || []).map(item => ({
      id: item.id,
      type: 'song',
      title: item.attributes.name,
      artist: item.attributes.artistName,
      album: item.attributes.albumName,
      thumbnail: item.attributes.artwork?.url
        ? item.attributes.artwork.url.replace('{w}', '400').replace('{h}', '400')
        : null,
      previewUrl: item.attributes.previews?.[0]?.url,
      duration: item.attributes.durationInMillis,
      url: item.attributes.url,
      platform: 'apple'
    }));

    console.log(`✅ Found ${playlists.length} playlists and ${songs.length} songs`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        query,
        playlists,
        songs,
        total: {
          playlists: playlists.length,
          songs: songs.length
        }
      })
    };

  } catch (err) {
    console.error('❌ Apple Music search error:', err);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Apple Music search failed',
        playlists: [],
        songs: []
      })
    };
  }
  */
}