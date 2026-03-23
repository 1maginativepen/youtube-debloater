// YT Cleaner - Content Script
// Runs on all YouTube pages and removes unwanted elements

const SELECTORS = {
  // Shorts
  shorts: [
    'ytd-reel-shelf-renderer',           // Shorts shelf on home/search
    'ytd-guide-entry-renderer a[href="/shorts"]', // Shorts in sidebar nav
    'ytd-mini-guide-entry-renderer a[href="/shorts"]',
    '[title="Shorts"]',
    'ytd-rich-shelf-renderer[is-shorts]',
    '#endpoint[href="/shorts"]',
    'a[href^="/shorts"]',                 // Any Shorts links
  ],

  // Video recommendations (sidebar + end-screen + autoplay)
  recommendations: [
    '#secondary',                          // Right sidebar recommendations
    '#related',                            // Related videos panel
    '.ytp-endscreen-content',             // End screen cards
    'ytd-compact-video-renderer',         // Compact video items in sidebar
    'ytd-watch-next-secondary-results-renderer', // Watch next results
    '.ytp-ce-element',                    // End cards overlay
    'ytd-endscreen-element-renderer',     // End screen elements
    '.videowall-endscreen',               // Video wall endscreen
  ],

  // Ads
  ads: [
    '.ad-showing .video-ads',            // Video ad container
    'ytd-ad-slot-renderer',             // Ad slot
    'ytd-in-feed-ad-layout-renderer',   // In-feed ad
    'ytd-banner-promo-renderer',        // Banner promo
    '.ytd-display-ad-renderer',         // Display ads
    '#masthead-ad',                      // Top banner ad
    'ytd-statement-banner-renderer',    // Statement banner
    '.ytp-ad-overlay-container',        // Ad overlay
    'ytd-action-companion-ad-renderer', // Action companion
    'ytd-companion-slot-renderer',      // Companion slot
    'ytd-promoted-sparkles-web-renderer',
    'ytd-promoted-video-renderer',
    'ytd-search-pyv-renderer',          // Search ads
    '.ytp-ad-message-container',        // Ad message
    'yt-mealbar-promo-renderer',        // Mealbar promo
  ],
};

let settings = {
  blockShorts: true,
  blockRecommendations: true,
  blockAds: true,
};

// Load settings from storage
function loadSettings(callback) {
  chrome.storage.sync.get(['blockShorts', 'blockRecommendations', 'blockAds'], (result) => {
    settings.blockShorts = result.blockShorts !== false;
    settings.blockRecommendations = result.blockRecommendations !== false;
    settings.blockAds = result.blockAds !== false;
    if (callback) callback();
  });
}

// Hide elements by selector list
function hideElements(selectorList) {
  selectorList.forEach(sel => {
    try {
      document.querySelectorAll(sel).forEach(el => {
        el.style.setProperty('display', 'none', 'important');
        el.setAttribute('data-yt-cleaner-hidden', 'true');
      });
    } catch (e) {}
  });
}

// Skip video ads - click skip button and mute if ad is playing
function skipVideoAds() {
  if (!settings.blockAds) return;

  // Click skip ad button
  const skipBtn = document.querySelector('.ytp-skip-ad-button, .ytp-ad-skip-button, [class*="skip-ad"]');
  if (skipBtn) {
    skipBtn.click();
    return;
  }

  // If ad is playing, seek to end
  const video = document.querySelector('video');
  const adContainer = document.querySelector('.ad-showing');
  if (video && adContainer) {
    video.muted = false;
    if (video.duration && isFinite(video.duration)) {
      video.currentTime = video.duration;
    }
  }
}

// Main cleanup function
function clean() {
  const activeSelectors = [];

  if (settings.blockShorts) {
    activeSelectors.push(...SELECTORS.shorts);
  }
  if (settings.blockRecommendations) {
    activeSelectors.push(...SELECTORS.recommendations);
  }
  if (settings.blockAds) {
    activeSelectors.push(...SELECTORS.ads);
    skipVideoAds();
  }

  if (activeSelectors.length > 0) {
    hideElements(activeSelectors);
  }
}

// Inject CSS for faster blocking before DOM is painted
function injectCSS() {
  const style = document.createElement('style');
  style.id = 'yt-cleaner-styles';

  const rules = [];

  if (settings.blockShorts) {
    rules.push(
      'ytd-reel-shelf-renderer { display: none !important; }',
      'ytd-rich-shelf-renderer[is-shorts] { display: none !important; }',
      'a[href^="/shorts"] { display: none !important; }',
      '[title="Shorts"] { display: none !important; }'
    );
  }

  if (settings.blockRecommendations) {
    rules.push(
      '#secondary { display: none !important; }',
      '#related { display: none !important; }',
      '.ytp-endscreen-content { display: none !important; }',
      '.ytp-ce-element { display: none !important; }',
      'ytd-endscreen-element-renderer { display: none !important; }'
    );
  }

  if (settings.blockAds) {
    rules.push(
      'ytd-ad-slot-renderer { display: none !important; }',
      'ytd-in-feed-ad-layout-renderer { display: none !important; }',
      '#masthead-ad { display: none !important; }',
      'ytd-banner-promo-renderer { display: none !important; }',
      '.ytp-ad-overlay-container { display: none !important; }',
      'ytd-statement-banner-renderer { display: none !important; }',
      'ytd-promoted-video-renderer { display: none !important; }',
      '.ytp-ad-message-container { display: none !important; }'
    );
  }

  style.textContent = rules.join('\n');

  // Replace existing style if present
  const existing = document.getElementById('yt-cleaner-styles');
  if (existing) existing.remove();

  document.documentElement.appendChild(style);
}

// Watch for DOM mutations (YouTube is a SPA)
let observer;
function startObserver() {
  if (observer) observer.disconnect();

  observer = new MutationObserver(() => {
    clean();
  });

  observer.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true,
  });

  // Also poll for video ads every 500ms
  setInterval(skipVideoAds, 500);
}

// Listen for settings changes from popup
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'SETTINGS_UPDATED') {
    settings = { ...settings, ...msg.settings };
    injectCSS();
    clean();
  }
});

// Init
loadSettings(() => {
  injectCSS();

  if (document.body) {
    clean();
    startObserver();
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      clean();
      startObserver();
    });
  }
});
