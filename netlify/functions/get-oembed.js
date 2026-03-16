// netlify/functions/get-oembed.js
// ✅ FIXED: Changed from CommonJS to ESM (export instead of exports)

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const url = event.queryStringParameters?.url;

  if (!url) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Missing url parameter' }),
    };
  }

  try {
    console.log('📡 Fetching oEmbed for:', url);

    let oembedUrl;

    // Spotify
    if (url.includes('spotify.com')) {
      oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
    }
    // YouTube
    else if (url.includes('youtube.com') || url.includes('youtu.be')) {
      oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    }
    // SoundCloud
    else if (url.includes('soundcloud.com')) {
      oembedUrl = `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url)}`;
    }
    // Apple Music (limited support)
    else if (url.includes('music.apple.com')) {
      // Apple Music doesn't have oEmbed, return basic info
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          platform: 'apple',
          title: 'Apple Music Playlist',
          thumbnail: null,
          embedHTML: null,
          sourceURL: url,
        }),
      };
    }
    else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Unsupported platform' }),
      };
    }

    const response = await fetch(oembedUrl);

    if (!response.ok) {
      throw new Error(`oEmbed request failed: ${response.status}`);
    }

    const data = await response.json();

    // Detect platform from URL
    let platform = 'other';
    if (url.includes('spotify.com')) platform = 'spotify';
    else if (url.includes('youtube.com') || url.includes('youtu.be')) platform = 'youtube';
    else if (url.includes('soundcloud.com')) platform = 'soundcloud';

    const result = {
      platform,
      title: data.title || '',
      thumbnail: data.thumbnail_url || null,
      embedHTML: data.html || null,
      sourceURL: url,
      author: data.author_name || data.provider_name,
    };

    console.log('✅ oEmbed data retrieved');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result),
    };

  } catch (error) {
    console.error('❌ oEmbed error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch oEmbed data',
        details: error.message,
      }),
    };
  }
}