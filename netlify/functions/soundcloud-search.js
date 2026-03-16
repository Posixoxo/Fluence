// Netlify Function for searching SoundCloud tracks

export async function handler(event) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Get query parameter
    const query = event.queryStringParameters?.q;
    const limit = parseInt(event.queryStringParameters?.limit || '6');

    // Validate query
    if (!query || query.trim().length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Missing or empty query parameter "q"',
          tracks: []
        })
      };
    }

    console.log('🔍 SoundCloud search:', query, 'limit:', limit);

    // SoundCloud public search URL
    // Note: We're using a workaround since SoundCloud deprecated their public API
    // This uses the website's search which returns tracks
    const searchUrl = `https://soundcloud.com/search?q=${encodeURIComponent(query)}`;

    // Since we can't actually scrape SoundCloud without an API key,
    // and their public API is deprecated, we'll return a curated list
    // based on the query keywords or return the search URL

    // For now, return the search URL for the user to visit
    // You can replace this with actual SoundCloud API if you have credentials
    
    const mockResults = [
      {
        title: `${query} - SoundCloud Mix`,
        artist: 'SoundCloud',
        url: searchUrl,
        thumbnail: 'https://a-v2.sndcdn.com/assets/images/sc-icons/ios-a62dfc8f.png',
        platform: 'soundcloud'
      }
    ];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        tracks: mockResults,
        message: 'SoundCloud search - click to browse on SoundCloud',
        searchUrl: searchUrl
      })
    };

  } catch (error) {
    console.error('❌ SoundCloud search error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to search SoundCloud',
        tracks: []
      })
    };
  }
}