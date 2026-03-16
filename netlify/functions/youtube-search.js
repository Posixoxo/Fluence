// ✅ FIXED: youtube-search.js

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const query = event.queryStringParameters?.q;
    const limit = parseInt(event.queryStringParameters?.limit || '10');

    if (!query?.trim()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Missing query',
          videos: [],
          playlists: []
        })
      };
    }

    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
      console.error('❌ No YouTube key');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Add YOUTUBE_API_KEY to .env',
          videos: [],
          playlists: []
        })
      };
    }

    console.log('▶️ YouTube search:', query);

    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video,playlist&maxResults=${limit}&key=${apiKey}`;
    
    const response = await Promise.race([
      fetch(searchUrl),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
    ]);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    const items = data.items || [];

    const videos = items
      .filter(i => i.id.kind === 'youtube#video')
      .map(i => ({
        title: i.snippet.title,
        channelTitle: i.snippet.channelTitle,
        thumbnail: i.snippet.thumbnails?.medium?.url || '',
        url: `https://www.youtube.com/watch?v=${i.id.videoId}`,
        embedUrl: `https://www.youtube.com/embed/${i.id.videoId}`
      }));

    const playlists = items
      .filter(i => i.id.kind === 'youtube#playlist')
      .map(i => ({
        title: i.snippet.title,
        channelTitle: i.snippet.channelTitle,
        thumbnail: i.snippet.thumbnails?.medium?.url || '',
        url: `https://www.youtube.com/playlist?list=${i.id.playlistId}`,
        embedUrl: `https://www.youtube.com/embed/videoseries?list=${i.id.playlistId}`
      }));

    console.log(`✅ ${videos.length} videos, ${playlists.length} playlists`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        videos,
        playlists
      })
    };

  } catch (error) {
    console.error('❌ YouTube error:', error.message);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        videos: [],
        playlists: []
      })
    };
  }
}