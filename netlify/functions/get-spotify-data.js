exports.handler = async (event) => {
  try {
    const client_id = process.env.SPOTIFY_CLIENT_ID;
    const client_secret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!client_id || !client_secret) {
        throw new Error("Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET in .env file.");
    }

    const authString = Buffer.from(client_id + ':' + client_secret).toString('base64');

    // 1. Get Token from authentic Spotify endpoint
    const authResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + authString
      },
      body: 'grant_type=client_credentials'
    });

    if (!authResponse.ok) {
        const errText = await authResponse.text();
        throw new Error(`Spotify Auth failed: ${authResponse.status} - ${errText}`);
    }

    const authData = await authResponse.json();
    const token = authData.access_token;

    // 2. Randomized Global Search
    // We use a vowel search with a random offset to guarantee a huge mix of genres
    const randomOffset = Math.floor(Math.random() * 500);
    const searchUrl = `https://api.spotify.com/v1/search?q=a&type=artist&limit=50&offset=${randomOffset}`;
    
    const response = await fetch(searchUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
         const errText = await response.text();
         throw new Error(`Spotify Search failed: ${response.status} - ${errText}`);
    }
    
    const searchData = await response.json();

    if (!searchData.artists || !searchData.artists.items || searchData.artists.items.length === 0) {
        return { statusCode: 200, body: JSON.stringify([]) };
    }

    // Filter to only include artists that actually have profile pictures
    const validArtists = searchData.artists.items.filter(artist => artist.images && artist.images.length > 0);

    const artists = validArtists.map(artist => ({
      name: artist.name,
      image: artist.images[0].url
    }));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(artists)
    };
  } catch (error) {
    console.error("🔴 Netlify Function Error:", error.message);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};