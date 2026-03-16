// netlify/functions/spotify-search.js
import { getSpotifyToken } from "./spotify-token.js";
import fetch from "node-fetch";

// ✅ RATE LIMITING: Track requests per IP
const rateLimitMap = new Map();
const RATE_LIMIT = 100; // requests per hour per IP
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// ✅ REQUEST QUEUE: Prevent API burst overload
const requestQueue = [];
let processingQueue = false;
const MAX_CONCURRENT_REQUESTS = 5;
let activeRequests = 0;

/**
 * Check if IP is within rate limit
 */
function checkRateLimit(ip) {
  const now = Date.now();
  const userRequests = rateLimitMap.get(ip) || [];
  
  // Remove requests outside the time window
  const validRequests = userRequests.filter(time => (now - time) < RATE_WINDOW_MS);
  
  if (validRequests.length >= RATE_LIMIT) {
    const oldestRequest = Math.min(...validRequests);
    const resetTime = oldestRequest + RATE_WINDOW_MS;
    const minutesUntilReset = Math.ceil((resetTime - now) / 60000);
    
    return {
      allowed: false,
      remaining: 0,
      resetIn: minutesUntilReset,
      message: `Rate limit exceeded. Try again in ${minutesUntilReset} minutes.`
    };
  }
  
  // Add current request
  validRequests.push(now);
  rateLimitMap.set(ip, validRequests);
  
  return {
    allowed: true,
    remaining: RATE_LIMIT - validRequests.length,
    resetIn: null
  };
}

/**
 * Process queued requests with concurrency control
 */
async function processQueue() {
  if (processingQueue) return;
  processingQueue = true;

  while (requestQueue.length > 0 && activeRequests < MAX_CONCURRENT_REQUESTS) {
    const { resolve, reject, fn } = requestQueue.shift();
    activeRequests++;
    
    fn()
      .then(resolve)
      .catch(reject)
      .finally(() => {
        activeRequests--;
        if (requestQueue.length > 0) {
          processQueue();
        }
      });
  }
  
  processingQueue = false;
}

/**
 * Add request to queue
 */
function queueRequest(fn) {
  return new Promise((resolve, reject) => {
    requestQueue.push({ fn, resolve, reject });
    processQueue();
  });
}

/**
 * Main handler with rate limiting
 */
export async function handler(event) {
  console.log('🎵 spotify-search function called');
  
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // ✅ RATE LIMITING CHECK
  const clientIp = event.headers['x-forwarded-for']?.split(',')[0] || 
                   event.headers['client-ip'] || 
                   'unknown';
  
  const rateLimitCheck = checkRateLimit(clientIp);
  
  if (!rateLimitCheck.allowed) {
    console.log(`⚠️ Rate limit exceeded for IP: ${clientIp}`);
    return {
      statusCode: 429, // Too Many Requests
      headers: {
        ...headers,
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': rateLimitCheck.resetIn.toString()
      },
      body: JSON.stringify({
        error: 'Rate limit exceeded',
        message: rateLimitCheck.message,
        resetInMinutes: rateLimitCheck.resetIn
      })
    };
  }

  // Get query parameters
  const params = event.queryStringParameters || {};
  const q = String(params.q || "").trim();
  const limit = Math.max(1, Math.min(parseInt(params.limit || "6"), 50));

  // Validate query
  if (!q) {
    console.log('❌ No query provided');
    return { 
      statusCode: 400, 
      headers: {
        ...headers,
        'X-RateLimit-Remaining': rateLimitCheck.remaining.toString()
      },
      body: JSON.stringify({ 
        error: "Missing 'q' parameter",
        message: "Please provide a search query"
      }) 
    };
  }

  // Validate query length
  if (q.length > 200) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: "Query too long",
        message: "Search query must be less than 200 characters"
      })
    };
  }

  try {
    console.log(`🔍 Searching for: "${q}" with limit: ${limit}`);
    
    // ✅ QUEUE REQUEST to prevent burst overload
    const results = await queueRequest(async () => {
      // Get Spotify access token
      console.log('📡 Getting Spotify token...');
      const token = await getSpotifyToken();
      console.log('✅ Got token');

      // Prepare search endpoints
      const endpoints = [
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=${limit}`,
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=playlist&limit=${Math.min(limit, 10)}`
      ];

      console.log('🔍 Fetching from Spotify API...');
      
      // Fetch with timeout
      const fetchWithTimeout = (url, options, timeout = 8000) => {
        return Promise.race([
          fetch(url, options),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), timeout)
          )
        ]);
      };

      const [trackResp, playlistResp] = await Promise.all(
        endpoints.map(url => 
          fetchWithTimeout(url, {
            headers: { Authorization: `Bearer ${token}` }
          })
        )
      );

      console.log('Track response status:', trackResp.status);
      console.log('Playlist response status:', playlistResp.status);

      // Handle non-200 responses
      if (!trackResp.ok || !playlistResp.ok) {
        throw new Error(`Spotify API error: Track ${trackResp.status}, Playlist ${playlistResp.status}`);
      }

      const trackData = await trackResp.json().catch(() => ({ tracks: { items: [] } }));
      const playlistData = await playlistResp.json().catch(() => ({ playlists: { items: [] } }));

      // ✅ IMPROVED: Filter null items and handle missing properties safely
      const tracks = (trackData.tracks?.items || [])
        .filter(track => track && track.name && track.id) // Remove invalid items
        .map(track => ({
          id: track.id,
          title: track.name,
          name: track.name,
          artist: track.artists?.[0]?.name || "Unknown Artist",
          artists: track.artists?.map(a => a.name).filter(Boolean) || [],
          album: track.album?.name || "Unknown Album",
          albumArt: track.album?.images?.[0]?.url || "",
          previewUrl: track.preview_url || "",
          preview_url: track.preview_url || "",
          spotifyUrl: track.external_urls?.spotify || "",
          external_urls: track.external_urls || {},
          duration_ms: track.duration_ms || 0
        }));

      // ✅ IMPROVED: Filter null playlists and validate data
      const playlists = (playlistData.playlists?.items || [])
        .filter(pl => pl && pl.name && pl.id) // Remove invalid items
        .map(pl => ({
          id: pl.id,
          name: pl.name || "Untitled Playlist",
          description: pl.description || "",
          owner: pl.owner?.display_name || "Unknown",
          image: pl.images?.[0]?.url || "",
          tracks_total: pl.tracks?.total || 0,
          spotifyUrl: pl.external_urls?.spotify || "",
          external_urls: pl.external_urls || {}
        }));

      console.log(`✅ Found ${tracks.length} tracks and ${playlists.length} playlists`);

      return { tracks, playlists };
    });

    // Return successful response
    return { 
      statusCode: 200, 
      headers: {
        ...headers,
        'X-RateLimit-Remaining': rateLimitCheck.remaining.toString(),
        'X-Search-Query': q,
        'X-Results-Count': (results.tracks.length + results.playlists.length).toString()
      },
      body: JSON.stringify({ 
        success: true,
        query: q,
        tracks: results.tracks, 
        playlists: results.playlists,
        total: {
          tracks: results.tracks.length,
          playlists: results.playlists.length
        },
        rateLimit: {
          remaining: rateLimitCheck.remaining,
          limit: RATE_LIMIT
        }
      }) 
    };

  } catch (err) {
    console.error('❌ Error in spotify-search:', err);
    console.error('Error stack:', err.stack);
    
    // Determine error type and status code
    let statusCode = 500;
    let errorMessage = 'An unexpected error occurred';
    
    if (err.message.includes('timeout')) {
      statusCode = 504; // Gateway Timeout
      errorMessage = 'Request timed out. Please try again.';
    } else if (err.message.includes('credentials')) {
      statusCode = 503; // Service Unavailable
      errorMessage = 'Music service temporarily unavailable';
    } else if (err.message.includes('Rate limit')) {
      statusCode = 429; // Too Many Requests
      errorMessage = err.message;
    }
    
    return { 
      statusCode,
      headers: {
        ...headers,
        'X-RateLimit-Remaining': rateLimitCheck.remaining.toString()
      },
      body: JSON.stringify({ 
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? err.message : undefined,
        query: q
      }) 
    };
  }
}

// ✅ CLEANUP: Remove old rate limit entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [ip, requests] of rateLimitMap.entries()) {
    const validRequests = requests.filter(time => (now - time) < RATE_WINDOW_MS);
    if (validRequests.length === 0) {
      rateLimitMap.delete(ip);
    } else {
      rateLimitMap.set(ip, validRequests);
    }
  }
  console.log(`🧹 Rate limit cleanup: ${rateLimitMap.size} IPs tracked`);
}, RATE_WINDOW_MS);