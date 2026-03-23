// COMPLETE MULTI-PLATFORM SCRIPT.JS - FINAL FIXED VERSION
// Platforms: Spotify + YouTube + SoundCloud
// Features: Tab switching without re-fetch, image badges, enhanced search

document.addEventListener('DOMContentLoaded', () => {
  // BACKEND URL
  const BACKEND = '/.netlify/functions';
  const isBrowsePage = /browse\.html$/i.test(window.location.pathname) || /browse/i.test(window.location.pathname);
  
  console.log('🔧 Backend URL:', BACKEND);
  console.log('🌐 Environment:', window.location.hostname);
  console.log('📄 Is Browse Page:', isBrowsePage);

  // PLATFORM SELECTION STATE
  let selectedPlatform = 'all'; // 'spotify', 'youtube', 'soundcloud', or 'all'
  window.selectedPlatform = selectedPlatform;

  //  CACHED SEARCH RESULTS (prevents re-fetching)
  let cachedSearchResults = {
    query: '',
    spotifyData: { tracks: [], playlists: [] },
    youtubeData: { playlists: [], videos: [] },
    soundcloudData: []
  };

  /* GLOBAL ERROR BOUNDARY */
  window.addEventListener('error', (event) => {
    console.error('🔴 Global Error:', event.error);
    showGlobalError('An unexpected error occurred. Please refresh the page.');
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('🔴 Unhandled Promise Rejection:', event.reason);
    showGlobalError('A connection error occurred. Please check your internet and try again.');
  });

  function showGlobalError(message) {
    const errorBanner = document.createElement('div');
    errorBanner.id = 'global-error-banner';
    errorBanner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, #ff6b6b, #ee5a6f);
      color: white;
      padding: 15px 20px;
      text-align: center;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      animation: slideDown 0.3s ease;
    `;
    errorBanner.innerHTML = `
      <strong>⚠️ ${message}</strong>
      <button onclick="this.parentElement.remove()" style="margin-left: 20px; background: rgba(255,255,255,0.2); border: none; padding: 8px 15px; border-radius: 5px; color: white; cursor: pointer;">Dismiss</button>
    `;
    
    const existing = document.getElementById('global-error-banner');
    if (existing) existing.remove();
    
    document.body.prepend(errorBanner);
    setTimeout(() => errorBanner.remove(), 10000);
  }

  /* IN-MEMORY STATE */
  const appState = {
    darkMode: false,
    selectedMood: null,
    rateLimitInfo: { remaining: 100, resetIn: null }
  };

  /* LOADING STATE MANAGER */
  function showLoading(containerId, message = 'Loading...') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = `
      <div style="text-align:center; padding:40px 20px;">
        <div class="spinner"></div>
        <p style="margin-top: 15px; color: var(--text-secondary); font-size: 16px;">${message}</p>
      </div>
    `;
  }

  function showError(containerId, message, retryCallback = null) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const retryButton = retryCallback ? `
      <button onclick="(${retryCallback.toString()})()" style="
        margin-top: 20px;
        padding: 12px 24px;
        background: linear-gradient(135deg, #1DB954, #1ed760);
        color: white;
        border: none;
        border-radius: 25px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(29, 185, 84, 0.3);
        transition: transform 0.2s ease;
      " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
        🔄 Try Again
      </button>
    ` : '';
    
    container.innerHTML = `
      <div style="text-align:center; padding:40px 20px;">
        <div style="font-size: 48px; margin-bottom: 15px;">⚠️</div>
        <p style="color: #ff6b6b; font-size: 18px; margin-bottom: 10px; font-weight: 600;">${message}</p>
        ${retryButton}
      </div>
    `;
  }

  /* NAV / MOBILE MENU */
  (function() {
    const container = document.getElementById('mobile-nav-container');
    const openBtn = document.getElementById('menu-open-btn');
    const closeBtn = document.getElementById('menu-close-btn');

    if (!container || !openBtn || !closeBtn) return;

    function openNav() {
      container.classList.add('open');
      document.body.classList.add('nav-open');
    }

    function closeNav() {
      container.classList.remove('open');
      document.body.classList.remove('nav-open');
    }

    openBtn.addEventListener('click', openNav);
    closeBtn.addEventListener('click', closeNav);

    container.addEventListener('click', (e) => {
      if (e.target === container) closeNav();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && container.classList.contains('open')) {
        closeNav();
      }
    });
  })();

/* DARK MODE */
const toggleButton = document.getElementById('dark-mode-toggle');
const themeIcon = document.getElementById('theme-icon');
const body = document.body;
const localStorageKey = 'moodify-dark-mode';

// Define your paths here for easy maintenance
const moonIcon = 'Images/moon-icon.png';
const sunIcon = 'Images/sun-icon.png';

const applyTheme = (isLightModeString) => {
  const isLightMode = isLightModeString === 'true';
  
  if (isLightMode) {
    body.classList.add('light-mode');
    if (themeIcon) themeIcon.src = moonIcon;
  } else {
    body.classList.remove('light-mode');
    if (themeIcon) themeIcon.src = sunIcon;
  }
  
  if (typeof appState !== 'undefined') {
    appState.darkMode = !isLightMode;
  }
};

// Initial Load
try {
  const savedTheme = localStorage.getItem(localStorageKey);
  if (savedTheme !== null) {
    applyTheme(savedTheme);
  }
} catch (e) {
  console.log('localStorage not available');
}

if (toggleButton && themeIcon) {
  toggleButton.addEventListener('click', () => {
    body.classList.toggle('light-mode');
    const isLightMode = body.classList.contains('light-mode');
    
    try {
      localStorage.setItem(localStorageKey, isLightMode);
    } catch (e) {
      console.log('localStorage error');
    }

    // Update the image source based on the new mode
    themeIcon.src = isLightMode ? moonIcon : sunIcon;
    
    if (typeof appState !== 'undefined') {
      appState.darkMode = !isLightMode;
    }
  });
}


/**
 * ARTIST GRID SYSTEM
 * Handles: Spotify API, Local Fallbacks, Randomization, and Auto-Rotation
 */
const artistState = {
    artists: [],
    // Local images here. The app will use these if Spotify is offline.
    localFallbacks: [
    { name: "Davido", image: "Images/David.jpg" },
    { name: "Asake", image: "Images/Asake.jpg" },
    { name: "Burna Boy", image: "Images/Burna.jpg" },
    { name: "Tems", image: "Images/Tems.jpg" },
    { name: "Wizkid", image: "Images/Wizkid.jpg" },
    { name: "Ayra Starr", image: "Images/Ayra.jpg" },
    { name: "Rema", image: "Images/Rema.jpg" },
    { name: "Adele", image: "Images/Adele.jpg" },
    { name: "Ariana Grande", image: "Images/Ariana Grande.jpg" },
    { name: "BB King", image: "Images/BB king.jpg" },
    { name: "Beyonce", image: "Images/Beyonce.jpg" },
    { name: "Billie Eilish", image: "Images/Billie Ellish.jpg" },
    { name: "Bob Marley", image: "Images/Bob Marley.jpg" },
    { name: "Daft Punk", image: "Images/Daft Punk.jpg" },
    { name: "Dua Lipa", image: "Images/Dua Lipa.jpg" },
    { name: "Eminem", image: "Images/Eminem.jpg" },
    { name: "Imagine Dragons", image: "Images/Imagine Dragons.jpg" },
    { name: "J Balvin", image: "Images/JBalvin.jpg" },
    { name: "John Legend", image: "Images/John Legend.jpg" },
    { name: "Justin Bieber", image: "Images/Justin Beiber.jpg" },
    { name: "Kamasi", image: "Images/Kamasi.jpg" },
    { name: "Kendrick Lamar", image: "Images/Kendrick Lamar.jpg" },
    { name: "Luke Bryan", image: "Images/Luke Bryan.jpg" },
    { name: "Michael Jackson", image: "Images/Michael Jackson.jpg" },
    { name: "Nathaniel Bassey", image: "Images/Nathaniel Bassey.jpg" },
    { name: "Nicki Minaj", image: "Images/Nicki Minaj.jpg" },
    { name: "Pharrell", image: "Images/Pharell.jpg" },
    { name: "Shakira", image: "Images/Shakira.jpg" },
    { name: "Shawn Mendes", image: "Images/Shawn Mendes.jpg" },
    { name: "Tasha Cobbs", image: "Images/Tasha Cobbs.jpg" },
    { name: "The Chainsmokers", image: "Images/The Chainsmokers.jpg" },
    { name: "The Rolling Stones", image: "Images/The Rolling Stones.jpg" },
    { name: "The Weeknd", image: "Images/The Weekend.jpg" },
    { name: "Tycho", image: "Images/Tychomusic.jpg" },
        // Add as many as you have...
    ],
    currentIndex: 0,
    visibleCount: 4,
    interval: 10000
};

// 1. Fetch data from Netlify Function
async function fetchArtists() {
    try {
        const response = await fetch('/.netlify/functions/get-spotify-data');
        if (!response.ok) throw new Error("API Offline");

        const data = await response.json();

        if (data && data.length > 0) {
            // SUCCESS: Use Spotify Data
            artistState.artists = data.sort(() => Math.random() - 0.5);
            console.log("✅ Using Live Spotify Data");
        } else {
            throw new Error("Empty Data");
        }
    } catch (err) {
        // FAIL: Use Local Images
        console.warn("⚠️ Using Local Fallback Images:", err.message);
        artistState.artists = artistState.localFallbacks.sort(() => Math.random() - 0.5);
    }
    renderArtistGrid();
}

// 2. Render the grid to HTML
function renderArtistGrid() {
    const container = document.getElementById('artist-grid');
    if (!container || artistState.artists.length === 0) return;

    const displayList = [];
    for (let i = 0; i < artistState.visibleCount; i++) {
        const idx = (artistState.currentIndex + i) % artistState.artists.length;
        displayList.push(artistState.artists[idx]);
    }

    container.innerHTML = displayList.map((artist, i) => `
        <button class="artist-button fade-in" style="animation-delay: ${i * 0.1}s">
            <div class="butt-img">
                <img src="${artist.image}" alt="${artist.name}" class="img-1" 
                     onerror="this.src='Images/default-artist.png'; this.onerror=null;">
                <p>${artist.name}</p>
            </div>
        </button>
    `).join('');
}

// 3. Rotation Logic
function rotateArtists() {
    if (artistState.artists.length > 0) {
        artistState.currentIndex = (artistState.currentIndex + 1) % artistState.artists.length;
        renderArtistGrid();
    }
}

// 4. Initialize
(function init() {
    fetchArtists();
    setInterval(rotateArtists, artistState.interval);
})();
  

  /* LOCAL PLAYLISTS (fallback) */
  const playlists = [
    { id: 1, title: "Sunday Chill", description: "Relax with soft vibes and mellow beats.", cover: "Images/covers/chill.jpg", tags: ["chill"], time: ["weekend"], energy: ["low"], spotify: "", apple: "", audiomack: "" },
    { id: 2, title: "Study Vibes", description: "Focus with lo-fi and instrumental beats.", cover: "Images/covers/study.jpg", tags: ["chill","study"], time: ["night","morning"], energy: ["low"], spotify: "", apple: "", audiomack: "" },
    { id: 3, title: "Workout Hype", description: "Get moving with high-energy tracks.", cover: "Images/covers/workout.jpg", tags: ["workout"], time: ["morning"], energy: ["hype"], spotify: "", apple: "", audiomack: "" },
    { id: 4, title: "90s Throwback", description: "All your favorite 90s bangers in one spot.", cover: "Images/covers/90s.jpg", tags: ["90s"], time: ["weekend"], energy: ["medium"], spotify: "", apple: "", audiomack: "" },
    { id: 5, title: "Heartbreak Slow", description: "Emotional slow-tempo songs.", cover: "Images/covers/heartbreak.jpg", tags: ["heartbreak"], time: ["night"], energy: ["low"], spotify: "", apple: "", audiomack: "" }
  ];

  /* UTILITY FUNCTIONS */
  function isValidUrl(url) {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /*  ENHANCED showPlaylists with IMAGE BADGES (no audio controls) */
  function showPlaylists(list) {
    const container = document.getElementById('playlist-container');
    if (!container) return;
    container.innerHTML = '';
    
    if (!list || list.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:40px; grid-column: 1 / -1;">
          <p style="font-size:18px; color: var(--text-secondary);">No playlists found. Try a different search!</p>
        </div>
      `;
      return;
    }
    
    list.forEach(p => {
      const card = document.createElement('div');
      card.className = 'playlist-card';
      
      // Determine platform and badge IMAGE
      const platform = p.platform || 'spotify';
      const platformBadges = {
        spotify: { img: 'Images/spotify.svg', color: '#1DB954', name: 'Spotify' },
        youtube: { img: 'Images/YT.png', color: '#FF0000', name: 'YouTube' },
        soundcloud: { img: 'Images/soundcloud.png', color: '#FF5500', name: 'SoundCloud' }
      };
      const badge = platformBadges[platform] || platformBadges.spotify;
      
      const url = p.url || p.spotify || p.apple || p.audiomack || p.spotifyUrl || '';
      
      card.innerHTML = `
        <div style="position:relative;">
          <div class="platform-badge-small" style="position:absolute;top:8px;right:8px;background:${badge.color};width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;padding:6px;z-index:2;box-shadow:0 4px 12px rgba(0,0,0,0.5);">
            <img src="${badge.img}" alt="${badge.name}" style="width:100%;height:100%;object-fit:contain;">
          </div>
          <img src="${p.cover || 'Images/default-cover.png'}" alt="${escapeHtml(p.title || '')}" 
               onerror="this.src='Images/default-cover.png'">
        </div>
        <h3>${escapeHtml(p.title || 'Untitled')}</h3>
        <p>${escapeHtml(p.description || 'No description')}</p>
        <div class="platform-links">
          ${url && isValidUrl(url) ? `<a href="${url}" target="_blank" rel="noopener noreferrer" style="margin-top:12px;display:inline-block;padding:10px 20px;background:${badge.color};color:white;text-decoration:none;border-radius:8px;font-weight:600;transition:transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">Open on ${badge.name}</a>` : ''}
        </div>
      `;
      
      if (url && isValidUrl(url)) {
        card.dataset.openUrl = url;
      }
      
      container.appendChild(card);
    });

    container.querySelectorAll('.playlist-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const tag = e.target.tagName.toLowerCase();
        if (tag === 'a' || e.target.closest('a')) {
          return;
        }
        
        const urlToOpen = card.dataset.openUrl;
        if (!urlToOpen || !isValidUrl(urlToOpen)) return;
        
        window.open(urlToOpen, '_blank', 'noopener,noreferrer');
      });
    });
  }

  /* MOOD HELPERS */
  function clearMoodClasses() {
    body.classList.remove('mood-happy','mood-chill','mood-workout','mood-heartbreak');
  }
  
  function setMoodBackground(mood) {
    clearMoodClasses();
    if (!mood) return;
    body.classList.add(`mood-${mood}`);
  }
  
  function setMoodBackgroundFromPlaylist(playlist) {
    if (!playlist || !playlist.tags) return;
    const known = ['chill','happy','workout','heartbreak'];
    const found = playlist.tags.find(t => known.includes(t));
    setMoodBackground(found);
  }

  /* MOOD MAPPING */
  const MOOD_KEYWORDS = {
    chill: ['chill', 'lo-fi', 'lofi', 'study', 'sleep', 'instrumental', 'jazz', 'classical', 'r & b', 'r&b', 'soul'],
    happy: ['happy', 'party', 'pop', 'afro', 'summer', 'dance'],
    workout: ['workout', 'hype', 'gym', 'energetic', 'high'],
    heartbreak: ['sad', 'heart', 'heartbreak', 'emo', 'love', 'romantic', 'moody']
  };

  function mapToKnownMood(raw, energy = '') {
    if (!raw) {
      if (/(hype|high|energetic|party)/i.test(energy)) return 'workout';
      return 'chill';
    }
    
    const r = (raw || '').toString().toLowerCase();
    
    for (const [mood, keywords] of Object.entries(MOOD_KEYWORDS)) {
      if (keywords.some(keyword => r.includes(keyword))) {
        return mood;
      }
    }
    
    if (/(hype|high|energetic|party)/i.test(energy)) return 'workout';
    return 'happy';
  }

  /* VISUALIZER & SOFT PULSE */
  const visualizer = document.getElementById('visualizer');
  let visualizerTimeout = null;
  let bodyPulseTimeout = null;

  function animateVisualizer(duration = 1400) {
    if (!isBrowsePage) return;
    
    if (!visualizer) {
      triggerSoftPulse(duration);
      return;
    }
    
    visualizer.classList.add('active');
    
    if (visualizerTimeout) clearTimeout(visualizerTimeout);
    visualizerTimeout = setTimeout(() => {
      visualizer.classList.remove('active');
      visualizerTimeout = null;
    }, duration);
    
    triggerSoftPulse(duration);
  }

  function triggerSoftPulse(duration = 1400) {
    if (!isBrowsePage) return;
    
    body.classList.add('mood-pulse');
    
    if (bodyPulseTimeout) clearTimeout(bodyPulseTimeout);
    bodyPulseTimeout = setTimeout(() => {
      body.classList.remove('mood-pulse');
      bodyPulseTimeout = null;
    }, duration + 200);
  }

  /* SCROLL TO RESULTS (Browse page only) */
  function scrollToResults() {
    if (!isBrowsePage) return;
    
    const container = document.getElementById('playlist-container');
    if (container && container.children.length > 0) {
      setTimeout(() => {
        container.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start'
        });
      }, 300);
    }
  }

  /* ENHANCED FETCH WITH RETRY LOGIC */
  async function fetchWithRetry(url, options = {}, retries = 2) {
    for (let i = 0; i <= retries; i++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers
          }
        });
        
        if (response.status === 429) {
          const resetIn = response.headers.get('X-RateLimit-Reset');
          throw new Error(`RATE_LIMIT:${resetIn || 60}`);
        }
        
        if (response.ok) {
          const remaining = response.headers.get('X-RateLimit-Remaining');
          if (remaining) {
            appState.rateLimitInfo.remaining = parseInt(remaining);
          }
          return response;
        }
        
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Client error: ${response.status}`);
        }
        
        if (i === retries) {
          throw new Error(`Server error after ${retries + 1} attempts: ${response.status}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
        
      } catch (error) {
        if (error.message.startsWith('RATE_LIMIT:')) {
          const resetMinutes = error.message.split(':')[1];
          showGlobalError(`Rate limit exceeded. Please wait ${resetMinutes} minutes before searching again.`);
          throw error;
        }
        
        if (i === retries) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
      }
    }
  }

  /* SEARCH YOUTUBE (optimized query) */
  async function searchYouTube(query, limit = 6) {
    try {
      // Optimize query for music playlists
      const optimizedQuery = `${query} music playlist`;
      const searchUrl = `${BACKEND}/youtube-search?q=${encodeURIComponent(optimizedQuery)}&limit=${limit}`;
      console.log('🔍 Searching YouTube:', searchUrl);
      
      const response = await fetchWithRetry(searchUrl, {}, 2);
      const data = await response.json();
      
      console.log('YouTube response:', data);
      
      if (!data.success) {
        console.warn('YouTube search failed:', data.error);
        return { playlists: [], videos: [] };
      }
      
      return {
        playlists: data.playlists || [],
        videos: data.videos || []
      };
    } catch (err) {
      console.error('YouTube search error:', err);
      return { playlists: [], videos: [] };
    }
  }

  /* SEARCH SOUNDCLOUD (optimized query) */
  async function searchSoundCloud(query, limit = 6) {
    try {
      // Optimize query for music
      const optimizedQuery = `${query} music`;
      const searchUrl = `${BACKEND}/soundcloud-search?q=${encodeURIComponent(optimizedQuery)}&limit=${limit}`;
      console.log('🔍 Searching SoundCloud:', searchUrl);
      
      const response = await fetchWithRetry(searchUrl, {}, 2);
      const data = await response.json();
      
      console.log('SoundCloud response:', data);
      
      if (!data.success) {
        console.warn('SoundCloud search failed:', data.error);
        return [];
      }
      
      return data.tracks || [];
    } catch (err) {
      console.error('SoundCloud search error:', err);
      return [];
    }
  }

  /* MULTI-PLATFORM SEARCH (OPTIMIZED - no re-fetch on tab switch) */
  const searchResultsEl = document.getElementById('search-results') || document.querySelector('.search-results');
  const searchButton = document.getElementById('searchButton');
  const searchInput = document.getElementById('searchInput');

  function detectMoodFromQuery(query) {
    if (!query) return null;
    const q = query.toLowerCase();
    
    for (const [mood, keywords] of Object.entries(MOOD_KEYWORDS)) {
      if (keywords.some(keyword => q.includes(keyword))) {
        return mood;
      }
    }
    
    return null;
  }

  //  OPTIMIZED: Searches only once, caches results
  async function searchSpotify(query) {
    const resultsContainer = searchResultsEl;
    if (!resultsContainer) {
      console.error("❌ 'search-results' element not found.");
      return;
    }

    if (searchButton) searchButton.disabled = true;
    if (searchInput) searchInput.disabled = true;

    const detected = detectMoodFromQuery(query);
    if (detected && isBrowsePage) setMoodBackground(detected);

    const platform = window.selectedPlatform || 'all';
    
    const searchText = platform === 'all' ? 'all platforms' : 
                      platform === 'spotify' ? 'Spotify' : 
                      platform === 'youtube' ? 'YouTube' : 
                      platform === 'soundcloud' ? 'SoundCloud' : 'all platforms';
    
    showLoading('search-results', `🎧 Searching ${searchText} for "${escapeHtml(query)}"...`);
    animateVisualizer(1800);

    try {
      let spotifyResults = { tracks: [], playlists: [] };
      let youtubeResults = { playlists: [], videos: [] };
      let soundcloudResults = [];

      // Search Spotify with optimized query
      if (platform === 'all' || platform === 'spotify') {
        try {
          const optimizedQuery = `${query} playlist`;
          const searchUrl = `${BACKEND}/spotify-search?q=${encodeURIComponent(optimizedQuery)}&limit=6`;
          const response = await fetchWithRetry(searchUrl, {}, 2);
          const data = await response.json();
          spotifyResults = {
            tracks: data.tracks || [],
            playlists: data.playlists || []
          };
        } catch (err) {
          console.error('Spotify search failed:', err);
        }
      }

      // Search YouTube
      if (platform === 'all' || platform === 'youtube') {
        youtubeResults = await searchYouTube(query, 6);
      }

      // Search SoundCloud
      if (platform === 'all' || platform === 'soundcloud') {
        soundcloudResults = await searchSoundCloud(query, 6);
      }

      //  CACHE RESULTS
      cachedSearchResults = {
        query: query,
        spotifyData: spotifyResults,
        youtubeData: youtubeResults,
        soundcloudData: soundcloudResults
      };

      const totalResults = 
        spotifyResults.tracks.length + 
        spotifyResults.playlists.length + 
        youtubeResults.playlists.length + 
        youtubeResults.videos.length +
        soundcloudResults.length;

      if (totalResults === 0) {
        showError('search-results', 
          `No results found for "${escapeHtml(query)}". Try different keywords!`,
          () => searchSpotify(query)
        );
        return;
      }

      renderMultiPlatformResults(spotifyResults, youtubeResults, soundcloudResults, query);

      if (!detected) {
        const fallbackMood = mapToKnownMood(query);
        if (isBrowsePage) setMoodBackground(fallbackMood);
      }

      animateVisualizer(1000);
      
    } catch (error) {
      console.error("Multi-platform search error:", error);
      
      if (error.message.startsWith('RATE_LIMIT:')) {
        resultsContainer.innerHTML = '';
        return;
      }
      
      showError('search-results',
        'Unable to search. Please check your connection.',
        () => searchSpotify(query)
      );
    } finally {
      if (searchButton) searchButton.disabled = false;
      if (searchInput) searchInput.disabled = false;
    }
  }

  //  RENDER RESULTS (with IMAGE badges, optimized rendering)
  function renderMultiPlatformResults(spotifyData, youtubeData, soundcloudData, query) {
    const resultsContainer = searchResultsEl;
    if (!resultsContainer) return;

    const platform = window.selectedPlatform || 'all';
    const spotifyCount = (spotifyData.tracks?.length || 0) + (spotifyData.playlists?.length || 0);
    const youtubeCount = (youtubeData.playlists?.length || 0) + (youtubeData.videos?.length || 0);
    const soundcloudCount = soundcloudData?.length || 0;
    const totalCount = spotifyCount + youtubeCount + soundcloudCount;

    let html = `<div class="results-inner" style="max-width:900px;margin:18px auto;">`;

    //  PLATFORM FILTER BUTTONS with IMAGES
    html += `
      <div class="platform-filters" style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap;justify-content:center;">
        <button class="platform-filter-btn ${platform === 'all' ? 'active' : ''}" onclick="window.selectPlatform('all')" style="display:flex;align-items:center;gap:8px;">
          All (${totalCount})
        </button>
        ${spotifyCount > 0 ? `
          <button class="platform-filter-btn ${platform === 'spotify' ? 'active' : ''}" onclick="window.selectPlatform('spotify')" style="display:flex;align-items:center;gap:8px;">
            <img src="Images/spotify.svg" alt="Spotify" style="width:20px;height:20px;"> Spotify (${spotifyCount})
          </button>
        ` : ''}
        ${youtubeCount > 0 ? `
          <button class="platform-filter-btn ${platform === 'youtube' ? 'active' : ''}" onclick="window.selectPlatform('youtube')" style="display:flex;align-items:center;gap:8px;">
            <img src="Images/YT.png" alt="YouTube" style="width:20px;height:20px;"> YouTube (${youtubeCount})
          </button>
        ` : ''}
        ${soundcloudCount > 0 ? `
          <button class="platform-filter-btn ${platform === 'soundcloud' ? 'active' : ''}" onclick="window.selectPlatform('soundcloud')" style="display:flex;align-items:center;gap:8px;">
            <img src="Images/soundcloud.png" alt="SoundCloud" style="width:20px;height:20px;"> SoundCloud (${soundcloudCount})
          </button>
        ` : ''}
      </div>
    `;

    // Spotify Playlists
    if (spotifyData.playlists && spotifyData.playlists.length && (platform === 'all' || platform === 'spotify')) {
      html += `<div class="results-playlists" style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin-bottom:14px;">`;
      spotifyData.playlists.forEach(pl => {
        const url = pl.spotifyUrl || (pl.external_urls && pl.external_urls.spotify) || '#';
        const validUrl = isValidUrl(url) ? url : '#';
        
        html += `
          <div class="result-playlist-card" style="width:200px; background:rgba(255,255,255,0.05); backdrop-filter:blur(10px); border:1px solid rgba(255,255,255,0.1); padding:12px; border-radius:16px; transition:transform 0.2s ease; position:relative;">
            <div class="platform-badge" style="position:absolute;top:10px;right:10px;background:#1DB954;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;padding:4px;z-index:2;box-shadow:0 4px 12px rgba(0,0,0,0.5);">
              <img src="Images/spotify.svg" alt="Spotify" style="width:100%;height:100%;object-fit:contain;">
            </div>
            <div style="position:relative;">
              <img src="${pl.image || 'Images/default-cover.png'}" alt="${escapeHtml(pl.name)}" 
                   style="width:100%; height:160px; object-fit:cover; border-radius:12px; box-shadow:0 8px 20px rgba(0,0,0,0.4);"
                   onerror="this.src='Images/default-cover.png'">
            </div>
            <div style="text-align:left; padding-top:12px;">
              <h4 style="margin:0; font-size:15px; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(pl.name)}</h4>
              <p style="font-size:12px; color:#aaa; margin:4px 0 12px;">${escapeHtml(pl.owner || 'Spotify')} • ${pl.tracks_total || 0} tracks</p>
              <a href="${validUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration:none; color:#1DB954; font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:1px;">Listen Now →</a>
            </div>
          </div>
        `;
      });
      html += `</div>`;
    }

    // YouTube Playlists
    if (youtubeData.playlists && youtubeData.playlists.length && (platform === 'all' || platform === 'youtube')) {
      html += `<div class="results-playlists" style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin-bottom:14px;">`;
      youtubeData.playlists.forEach(pl => {
        const validUrl = isValidUrl(pl.url) ? pl.url : '#';
        
        html += `
          <div class="result-playlist-card" style="width:200px; background:rgba(255,255,255,0.05); backdrop-filter:blur(10px); border:1px solid rgba(255,255,255,0.1); padding:12px; border-radius:16px; transition:transform 0.2s ease; position:relative;">
            <div class="platform-badge" style="position:absolute;top:10px;right:10px;background:#FF0000;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;padding:4px;z-index:2;box-shadow:0 4px 12px rgba(0,0,0,0.5);">
              <img src="Images/YT.png" alt="YouTube" style="width:100%;height:100%;object-fit:contain;">
            </div>
            <div style="position:relative;">
              <img src="${pl.thumbnail || 'Images/default-cover.png'}" alt="${escapeHtml(pl.title)}" 
                   style="width:100%; height:160px; object-fit:cover; border-radius:12px; box-shadow:0 8px 20px rgba(0,0,0,0.4);"
                   onerror="this.src='Images/default-cover.png'">
            </div>
            <div style="text-align:left; padding-top:12px;">
              <h4 style="margin:0; font-size:15px; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(pl.title)}</h4>
              <p style="font-size:12px; color:#aaa; margin:4px 0 12px;">${escapeHtml(pl.channelTitle || 'YouTube')}</p>
              <a href="${validUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration:none; color:#FF0000; font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:1px;">Watch Now →</a>
            </div>
          </div>
        `;
      });
      html += `</div>`;
    }

    // SoundCloud Tracks
    if (soundcloudData && soundcloudData.length && (platform === 'all' || platform === 'soundcloud')) {
      html += `<div class="results-playlists" style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin-bottom:14px;">`;
      soundcloudData.forEach(track => {
        const validUrl = isValidUrl(track.url) ? track.url : '#';
        
        html += `
          <div class="result-playlist-card" style="width:200px; background:rgba(255,255,255,0.05); backdrop-filter:blur(10px); border:1px solid rgba(255,255,255,0.1); padding:12px; border-radius:16px; transition:transform 0.2s ease; position:relative;">
            <div class="platform-badge" style="position:absolute;top:10px;right:10px;background:#FF5500;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;padding:4px;z-index:2;box-shadow:0 4px 12px rgba(0,0,0,0.5);">
              <img src="Images/soundcloud.png" alt="SoundCloud" style="width:100%;height:100%;object-fit:contain;">
            </div>
            <div style="position:relative;">
              <img src="${track.thumbnail || 'Images/default-cover.png'}" alt="${escapeHtml(track.title)}" 
                   style="width:100%; height:160px; object-fit:cover; border-radius:12px; box-shadow:0 8px 20px rgba(0,0,0,0.4);"
                   onerror="this.src='Images/default-cover.png'">
            </div>
            <div style="text-align:left; padding-top:12px;">
              <h4 style="margin:0; font-size:15px; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(track.title)}</h4>
              <p style="font-size:12px; color:#aaa; margin:4px 0 12px;">${escapeHtml(track.artist || 'SoundCloud')}</p>
              <a href="${validUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration:none; color:#FF5500; font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:1px;">Listen Now →</a>
            </div>
          </div>
        `;
      });
      html += `</div>`;
    }

    // Spotify Tracks
    if (spotifyData.tracks && spotifyData.tracks.length && (platform === 'all' || platform === 'spotify')) {
      html += `<div class="results-tracks" style="display:flex;flex-direction:column;gap:12px;">`;
      spotifyData.tracks.forEach((track) => {
        const img = track.albumArt || 'Images/default-cover.png';
        const title = escapeHtml(track.title || track.name || 'Unknown Track');
        const artist = escapeHtml(track.artist || (track.artists && track.artists.join(', ')) || 'Unknown Artist');
        const album = escapeHtml(track.album || '');
        const preview = track.previewUrl || track.preview_url || '';
        const spotifyUrl = track.spotifyUrl || (track.external_urls && track.external_urls.spotify) || '#';
        const validSpotifyUrl = isValidUrl(spotifyUrl) ? spotifyUrl : '#';

        const playerHtml = preview
          ? `<audio controls preload="none" src="${preview}" style="width:100%;margin-top:8px;"></audio>`
          : `<a href="${validSpotifyUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin-top:8px;padding:8px 10px;border-radius:8px;background:#1DB954;color:#fff;text-decoration:none;font-weight:600;">Play on Spotify</a>`;

        html += `
          <div class="result-track" style="display:flex;gap:12px;align-items:center;padding:10px;background:var(--focus-ring);border-radius:10px; margin: 0 20px; position:relative;">
            <div class="platform-badge" style="position:absolute;top:10px;right:10px;background:#1DB954;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;padding:4px;z-index:2;">
              <img src="Images/spotify.svg" alt="Spotify" style="width:100%;height:100%;object-fit:contain;">
            </div>
            <img src="${img}" alt="${title}" style="width:68px;height:68px;object-fit:cover;border-radius:6px;" onerror="this.src='Images/default-cover.png'">
            <div style="flex:1;">
              <div style="display:flex;justify-content:space-between;align-items:start;gap:8px;">
                <div>
                  <p style="margin:0;font-weight:700;">${title}</p>
                  <p style="margin:4px 0 0;color:#ccc;font-size:14px;">${artist}${album ? ' — ' + album : ''}</p>
                </div>
              </div>
              ${playerHtml}
            </div>
          </div>
        `;
      });
      html += `</div>`;
    }

    // YouTube Videos
    if (youtubeData.videos && youtubeData.videos.length && (platform === 'all' || platform === 'youtube')) {
      html += `<div class="results-tracks" style="display:flex;flex-direction:column;gap:12px;">`;
      youtubeData.videos.forEach((video) => {
        const img = video.thumbnail || 'Images/default-cover.png';
        const title = escapeHtml(video.title || 'Unknown Video');
        const channel = escapeHtml(video.channelTitle || 'YouTube');
        const videoUrl = video.url || '#';
        const validUrl = isValidUrl(videoUrl) ? videoUrl : '#';

        html += `
          <div class="result-track" style="display:flex;gap:12px;align-items:center;padding:10px;background:var(--focus-ring);border-radius:10px; margin: 0 20px; position:relative;">
            <div class="platform-badge" style="position:absolute;top:10px;right:10px;background:#FF0000;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;padding:4px;z-index:2;">
              <img src="Images/YT.png" alt="YouTube" style="width:100%;height:100%;object-fit:contain;">
            </div>
            <img src="${img}" alt="${title}" style="width:68px;height:68px;object-fit:cover;border-radius:6px;" onerror="this.src='Images/default-cover.png'">
            <div style="flex:1;">
              <div style="display:flex;justify-content:space-between;align-items:start;gap:8px;">
                <div>
                  <p style="margin:0;font-weight:700;">${title}</p>
                  <p style="margin:4px 0 0;color:#ccc;font-size:14px;">${channel}</p>
                </div>
              </div>
              <a href="${validUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin-top:8px;padding:8px 10px;border-radius:8px;background:#FF0000;color:#fff;text-decoration:none;font-weight:600;">Watch on YouTube</a>
            </div>
          </div>
        `;
      });
      html += `</div>`;
    }

    html += `</div>`;
    resultsContainer.innerHTML = html;
  }

  //  OPTIMIZED: Tab switching without re-fetching
  window.selectPlatform = function(platform) {
    window.selectedPlatform = platform;
    console.log('Platform selected:', platform);
    
    //  USE CACHED RESULTS - no API call!
    if (cachedSearchResults.query && searchInput && searchInput.value.trim() === cachedSearchResults.query) {
      console.log('🚀 Using cached results - no API call needed!');
      renderMultiPlatformResults(
        cachedSearchResults.spotifyData,
        cachedSearchResults.youtubeData,
        cachedSearchResults.soundcloudData,
        cachedSearchResults.query
      );
    } else if (searchInput && searchInput.value.trim()) {
      // Only re-search if query changed
      searchSpotify(searchInput.value.trim());
    }
  };

  /* DEBOUNCED SEARCH INPUT */
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }
  
  if (searchButton && searchInput) {
    searchButton.addEventListener('click', () => {
      const query = searchInput.value.trim();
      if (query) searchSpotify(query);
    });
    
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const query = searchInput.value.trim();
        if (query) searchSpotify(query);
      }
    });
    
    // Live search as user types (debounced)
    const debouncedSearch = debounce((query) => {
      if (query && query.length > 2) searchSpotify(query);
    }, 800);
    
    searchInput.addEventListener('input', (e) => {
      debouncedSearch(e.target.value.trim());
    });
  }

  /* FETCH PLAYLIST (Multi-platform, optimized) - FIXED: Fetches ALL platforms */
  async function fetchSpotifyPlaylist(query, limit = 6) {
    const platform = window.selectedPlatform || 'all';
    
    try {
      let spotifyResults = [];
      let youtubeResults = [];
      let soundcloudResults = [];
      
      //  FIX: Fetch from ALL platforms simultaneously, don't stop early
      const promises = [];
      
      // Search Spotify with optimized query
      if (platform === 'all' || platform === 'spotify') {
        promises.push(
          (async () => {
            try {
              const optimizedQuery = `${query} playlist`;
              const searchUrl = `${BACKEND}/spotify-search?q=${encodeURIComponent(optimizedQuery)}&limit=${limit}`;
              const res = await fetchWithRetry(searchUrl, {}, 2);
              const data = await res.json();
              
              if (data.playlists && data.playlists.length) {
                spotifyResults.push(...data.playlists.map(pl => ({
                  cover: pl.image || '',
                  title: pl.name || '',
                  description: pl.description || `${pl.owner || 'Spotify'} • ${pl.tracks_total || 0} tracks`,
                  url: pl.external_urls?.spotify || pl.spotifyUrl || '',
                  spotify: pl.external_urls?.spotify || pl.spotifyUrl || '',
                  tags: [],
                  platform: 'spotify'
                })));
              }
              
              if (Array.isArray(data.tracks) && data.tracks.length) {
                spotifyResults.push(...data.tracks.slice(0, 3).map(t => ({
                  cover: t.albumArt || '',
                  title: t.title || t.name || '',
                  description: (t.artist ? t.artist : (t.artists && t.artists.join(', '))) || '',
                  url: t.spotifyUrl || '',
                  spotify: t.previewUrl || t.spotifyUrl || '',
                  tags: [],
                  platform: 'spotify'
                })));
              }
            } catch (err) {
              console.error('Spotify fetch error:', err);
            }
          })()
        );
      }
      
      // Search YouTube with optimized query
      if (platform === 'all' || platform === 'youtube') {
        promises.push(
          (async () => {
            const youtubeData = await searchYouTube(query, limit);
            
            if (youtubeData.playlists && youtubeData.playlists.length) {
              youtubeResults.push(...youtubeData.playlists.map(pl => ({
                cover: pl.thumbnail || '',
                title: pl.title || '',
                description: pl.channelTitle || '',
                url: pl.url || '',
                spotify: '',
                tags: [],
                platform: 'youtube'
              })));
            }
            
            if (youtubeData.videos && youtubeData.videos.length) {
              youtubeResults.push(...youtubeData.videos.slice(0, 3).map(v => ({
                cover: v.thumbnail || '',
                title: v.title || '',
                description: v.channelTitle || '',
                url: v.url || '',
                spotify: '',
                tags: [],
                platform: 'youtube'
              })));
            }
          })()
        );
      }
      
      // Search SoundCloud with optimized query
      if (platform === 'all' || platform === 'soundcloud') {
        promises.push(
          (async () => {
            const soundcloudData = await searchSoundCloud(query, limit);
            
            if (soundcloudData && soundcloudData.length) {
              soundcloudResults.push(...soundcloudData.map(t => ({
                cover: t.thumbnail || '',
                title: t.title || '',
                description: t.artist || '',
                url: t.url || '',
                spotify: '',
                tags: [],
                platform: 'soundcloud'
              })));
            }
          })()
        );
      }
      
      //  Wait for ALL platforms to finish
      await Promise.all(promises);
      
      //  Mix results from all platforms
      const allResults = [
        ...spotifyResults,
        ...youtubeResults,
        ...soundcloudResults
      ];
      
      console.log('✅ Multi-platform results:', {
        spotify: spotifyResults.length,
        youtube: youtubeResults.length,
        soundcloud: soundcloudResults.length,
        total: allResults.length
      });
      
      return allResults;
    } catch (err) {
      console.error('Multi-platform fetch error:', err);
      return [];
    }
  }

  /* PLAYLIST DISPLAY HANDLER  */
  const playlistContainerEl = document.getElementById('playlist-container');

  async function handlePlaylistDisplay(matches) {
    if (!matches || !matches.length) {
      if (playlistContainerEl) {
        showError('playlist-container', 
          'No playlists found for this vibe. Try adjusting your preferences!',
          null
        );
      }
      return;
    }
    
    animateVisualizer(1600);
    
    if (matches[0] && matches[0].tags && matches[0].tags.length) {
      setMoodBackgroundFromPlaylist(matches[0]);
    } else {
      const inferred = mapToKnownMood(matches[0].title || matches[0].description || '');
      setMoodBackground(inferred);
    }
    
    if (playlistContainerEl) {
      showPlaylists(matches);
      // ✅ SCROLL TO RESULTS
      scrollToResults();
    }
  }

  /* RANDOM VIBE BUTTON */
  const randomBtnEl = document.getElementById('randomVibeBtn');
  const timeOptions = ['morning', 'afternoon', 'evening', 'night', 'weekend'];
  const energyOptions = ['low', 'medium', 'hype', 'high'];
  const moodOptions = ['happy', 'sad', 'chill', 'heartbreak', 'workout', 'afro', 'pop', 'hip-hop'];

  if (randomBtnEl) {
    randomBtnEl.addEventListener('click', async (e) => {
      e.preventDefault();
      
      randomBtnEl.disabled = true;
      randomBtnEl.textContent = '🎲 Generating...';
      
      try {
        animateVisualizer(1600);

        const randomTime = timeOptions[Math.floor(Math.random() * timeOptions.length)];
        const randomEnergy = energyOptions[Math.floor(Math.random() * energyOptions.length)];
        const randomMoodRaw = moodOptions[Math.floor(Math.random() * moodOptions.length)];

        const mapped = mapToKnownMood(randomMoodRaw, randomEnergy);
        if (isBrowsePage) setMoodBackground(mapped);

        const query = `${randomMoodRaw} ${randomTime} ${randomEnergy}`;
        
        if (playlistContainerEl) {
          showLoading('playlist-container', `🎲 Feeling ${escapeHtml(randomMoodRaw)}? Let's find your vibe...`);
        }
        
        const found = await fetchSpotifyPlaylist(query, 8);
        await handlePlaylistDisplay(found);
        
      } catch (error) {
        console.error('Random vibe error:', error);
        if (playlistContainerEl) {
          showError('playlist-container',
            'Failed to generate random vibe. Please try again.',
            () => randomBtnEl.click()
          );
        }
      } finally {
        randomBtnEl.disabled = false;
        randomBtnEl.textContent = '🎲 Random Vibe';
      }
    });
  }

  /* BUILD MY VIBE BUTTON */
  const buildBtnEl = document.getElementById('buildVibeBtn');

  if (buildBtnEl) {
    buildBtnEl.addEventListener('click', async (e) => {
      e.preventDefault();
      
      buildBtnEl.disabled = true;
      buildBtnEl.textContent = 'Building...';
      
      try {
        animateVisualizer(1600);

        const time = document.getElementById('timeOfDay')?.value || '';
        const energy = document.getElementById('energy')?.value || '';
        const moodRaw = document.getElementById('vibeMood')?.value || '';

        const normalized = mapToKnownMood(moodRaw, energy);
        if (isBrowsePage) setMoodBackground(normalized);

        const query = [moodRaw, time, energy].filter(Boolean).join(' ') || 'vibe mix';
        
        if (playlistContainerEl) {
          showLoading('playlist-container', `🎧 Building your vibe for "${escapeHtml(query)}"...`);
        }
        
        const found = await fetchSpotifyPlaylist(query, 8);
        await handlePlaylistDisplay(found);
        
      } catch (error) {
        console.error('Build vibe error:', error);
        if (playlistContainerEl) {
          showError('playlist-container',
            'Failed to build vibe. Please try again.',
            () => buildBtnEl.click()
          );
        }
      } finally {
        buildBtnEl.disabled = false;
        buildBtnEl.textContent = 'Build My Vibe';
      }
    });
  }

  /* STORE MOOD BUTTON CLICK */
  document.querySelectorAll('.mood-button').forEach(button => {
    button.addEventListener('click', () => {
      const mood = button.getAttribute('data-mood');
      appState.selectedMood = mood;
      
      try {
        localStorage.setItem('selectedMood', mood);
      } catch (e) {
        console.log('localStorage not available, using session state');
      }
      
      window.location.href = 'PickAPlatform.html';
    });
  });

  console.log('✅ Moodify initialized successfully!');
  console.log('📊 Rate Limit Info:', appState.rateLimitInfo);
  console.log('🎵 Selected Platform:', window.selectedPlatform);

}); // end DOMContentLoaded