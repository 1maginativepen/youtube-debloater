// YT Cleaner - Popup Script

const checkboxIds = ['blockShorts', 'blockRecommendations', 'blockAds'];
const rowMap = {
  blockShorts: 'row-shorts',
  blockRecommendations: 'row-recs',
  blockAds: 'row-ads',
};

function updateActiveCount() {
  const count = checkboxIds.filter(id => document.getElementById(id).checked).length;
  document.getElementById('activeCount').textContent = count;

  const dot = document.getElementById('statusDot');
  dot.style.background = count > 0 ? 'var(--green)' : '#666';
  dot.style.boxShadow = count > 0 ? '0 0 8px var(--green)' : 'none';
}

function updateRowStyle(id) {
  const checked = document.getElementById(id).checked;
  const row = document.getElementById(rowMap[id]);
  if (checked) row.classList.add('active');
  else row.classList.remove('active');
}

function showToast(msg = 'Settings saved!') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1800);
}

function saveSettings() {
  const settings = {};
  checkboxIds.forEach(id => {
    settings[id] = document.getElementById(id).checked;
    updateRowStyle(id);
  });
  updateActiveCount();

  chrome.storage.sync.set(settings, () => {
    showToast('Settings saved!');

    // Notify active YouTube tabs
    chrome.tabs.query({ url: '*://*.youtube.com/*' }, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          type: 'SETTINGS_UPDATED',
          settings,
        }).catch(() => {}); // ignore tabs that can't receive messages
      });
    });
  });
}

// Load saved settings on popup open
chrome.storage.sync.get(['blockShorts', 'blockRecommendations', 'blockAds'], (result) => {
  checkboxIds.forEach(id => {
    const el = document.getElementById(id);
    // Default all to true if not set
    el.checked = result[id] !== false;
    updateRowStyle(id);
  });
  updateActiveCount();
});

// Attach change listeners
checkboxIds.forEach(id => {
  document.getElementById(id).addEventListener('change', saveSettings);
});

// Reload current tab button
document.getElementById('reloadBtn').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.reload(tabs[0].id);
      showToast('Tab reloaded!');
      setTimeout(() => window.close(), 700);
    }
  });
});
