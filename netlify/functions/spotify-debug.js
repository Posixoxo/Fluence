// netlify/functions/spotify-debug.js
import { getSpotifyToken } from "./spotify-token.js";

/**
 * Debug endpoint to test Spotify integration
 * Access at: /.netlify/functions/spotify-debug
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

  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    checks: {}
  };

  // ✅ CHECK 1: Environment Variables
  diagnostics.checks.envVars = {
    clientIdExists: !!process.env.SPOTIFY_CLIENT_ID,
    clientSecretExists: !!process.env.SPOTIFY_CLIENT_SECRET,
    clientIdLength: process.env.SPOTIFY_CLIENT_ID?.length || 0,
    clientSecretLength: process.env.SPOTIFY_CLIENT_SECRET?.length || 0
  };

  // ✅ CHECK 2: Token Fetch
  try {
    console.log('🔍 Debug: Attempting to fetch Spotify token...');
    const startTime = Date.now();
    const token = await getSpotifyToken();
    const fetchTime = Date.now() - startTime;

    diagnostics.checks.token = {
      success: true,
      tokenLength: token ? token.length : 0,
      fetchTimeMs: fetchTime,
      hasToken: !!token,
      tokenPrefix: token ? token.substring(0, 10) + '...' : null
    };

    // ✅ CHECK 3: Test API Call
    try {
      console.log('🔍 Debug: Testing Spotify API call...');
      const testResponse = await fetch('https://api.spotify.com/v1/search?q=test&type=track&limit=1', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      diagnostics.checks.apiTest = {
        success: testResponse.ok,
        status: testResponse.status,
        statusText: testResponse.statusText,
        headers: {
          rateLimit: testResponse.headers.get('x-ratelimit-limit'),
          rateLimitRemaining: testResponse.headers.get('x-ratelimit-remaining')
        }
      };

      if (testResponse.ok) {
        const data = await testResponse.json();
        diagnostics.checks.apiTest.dataReceived = !!data.tracks;
        diagnostics.checks.apiTest.tracksCount = data.tracks?.items?.length || 0;
      } else {
        const errorText = await testResponse.text();
        diagnostics.checks.apiTest.error = errorText;
      }

    } catch (apiError) {
      diagnostics.checks.apiTest = {
        success: false,
        error: apiError.message,
        stack: apiError.stack
      };
    }

  } catch (tokenError) {
    console.error('❌ Debug: Token fetch failed:', tokenError);
    diagnostics.checks.token = {
      success: false,
      error: tokenError.message,
      stack: tokenError.stack
    };
  }

  // ✅ OVERALL STATUS
  const allChecks = Object.values(diagnostics.checks);
  const passedChecks = allChecks.filter(check => check.success !== false).length;
  const totalChecks = allChecks.length;

  diagnostics.overall = {
    status: passedChecks === totalChecks ? 'HEALTHY' : 'ISSUES_DETECTED',
    passedChecks,
    totalChecks,
    healthPercentage: Math.round((passedChecks / totalChecks) * 100)
  };

  // ✅ RECOMMENDATIONS
  diagnostics.recommendations = [];

  if (!diagnostics.checks.envVars.clientIdExists) {
    diagnostics.recommendations.push('Set SPOTIFY_CLIENT_ID in Netlify environment variables');
  }
  if (!diagnostics.checks.envVars.clientSecretExists) {
    diagnostics.recommendations.push('Set SPOTIFY_CLIENT_SECRET in Netlify environment variables');
  }
  if (diagnostics.checks.token?.success === false) {
    diagnostics.recommendations.push('Check if Spotify credentials are valid');
  }
  if (diagnostics.checks.apiTest?.success === false) {
    diagnostics.recommendations.push('Verify network connectivity to Spotify API');
  }

  const statusCode = diagnostics.overall.status === 'HEALTHY' ? 200 : 503;

  return {
    statusCode,
    headers,
    body: JSON.stringify(diagnostics, null, 2)
  };
}