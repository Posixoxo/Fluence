import fetch from "node-fetch";

let spotifyToken = null;
let tokenExpiresAt = 0;
let tokenRefreshInProgress = false;

const wait = ms => new Promise(r => setTimeout(r, ms));

/**
 * Get Spotify access token with caching and retry logic
 * @returns {Promise<string>} Access token
 */
export async function getSpotifyToken() {
  // Return cached token if still valid (with 2-minute buffer)
  if (spotifyToken && Date.now() < (tokenExpiresAt - 120000)) {
    return spotifyToken;
  }

  // Prevent multiple simultaneous token refresh requests
  if (tokenRefreshInProgress) {
    // Wait for the in-progress request to complete
    while (tokenRefreshInProgress) {
      await wait(100);
    }
    // Return the newly refreshed token
    if (spotifyToken && Date.now() < tokenExpiresAt) {
      return spotifyToken;
    }
  }

  tokenRefreshInProgress = true;

  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("Missing Spotify credentials. Please set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in Netlify environment variables.");
    }

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    // Retry up to 3 times with exponential backoff
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        console.log(`🔑 Fetching Spotify token (attempt ${attempt + 1}/3)...`);

        const resp = await fetch("https://accounts.spotify.com/api/token", {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: "grant_type=client_credentials",
          timeout: 10000 // 10 second timeout
        });

        if (!resp.ok) {
          const errorText = await resp.text();
          throw new Error(`Spotify token request failed: ${resp.status} ${errorText}`);
        }

        const data = await resp.json();

        if (!data.access_token) {
          throw new Error("Invalid token response: missing access_token");
        }

        // Cache token with expiration (subtract 60s for buffer)
        spotifyToken = data.access_token;
        tokenExpiresAt = Date.now() + ((data.expires_in || 3600) - 60) * 1000;

        console.log(`✅ Spotify token acquired, expires in ${data.expires_in}s`);
        return spotifyToken;

      } catch (err) {
        console.error(`❌ Token fetch attempt ${attempt + 1} failed:`, err.message);

        // Don't retry on auth errors (400, 401, 403)
        if (err.message.includes('400') || err.message.includes('401') || err.message.includes('403')) {
          throw new Error(`Authentication failed: ${err.message}. Check your Spotify credentials.`);
        }

        // If this was the last attempt, throw the error
        if (attempt === 2) {
          throw new Error(`Failed to get Spotify token after 3 attempts: ${err.message}`);
        }

        // Wait before retrying (exponential backoff: 700ms, 1400ms)
        const backoffMs = 700 * (attempt + 1);
        console.log(`⏳ Retrying in ${backoffMs}ms...`);
        await wait(backoffMs);
      }
    }
  } finally {
    tokenRefreshInProgress = false;
  }
}

/**
 * Handler for direct token endpoint (for debugging)
 */
export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const token = await getSpotifyToken();
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        hasToken: !!token,
        tokenLength: token.length,
        expiresIn: Math.floor((tokenExpiresAt - Date.now()) / 1000)
      })
    };
  } catch (err) {
    console.error('Token endpoint error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: err.message
      })
    };
  }
}