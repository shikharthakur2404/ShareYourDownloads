/* eslint-env browser */

const browserApi = window.browser ?? window.chrome;
const API_URL = 'http://127.0.0.1:47821/api/download';
const HEALTH_URL = 'http://127.0.0.1:47821/health';
const HISTORY_KEY = 'syd.extension.history';
const FORMAT_KEY = 'syd.extension.format';
const MAX_HISTORY = 6;

const urlInput = document.getElementById('urlInput');
const status = document.getElementById('status');
const driveLink = document.getElementById('driveLink');
const pasteButton = document.getElementById('pasteButton');
const tabButton = document.getElementById('tabButton');
const downloadButton = document.getElementById('downloadButton');
const driveToggle = document.getElementById('driveToggle');
const clearHistoryButton = document.getElementById('clearHistory');
const historyList = document.getElementById('historyList');
const historyEmpty = document.getElementById('historyEmpty');
const formatButtons = Array.from(document.querySelectorAll('.toggle button'));

let selectedFormat = localStorage.getItem(FORMAT_KEY) || 'video';
let isBusy = false;

const setStatus = (message, tone = 'info') => {
  status.textContent = message;
  status.dataset.tone = tone;
};

const clearDriveLink = () => {
  driveLink.hidden = true;
  driveLink.textContent = '';
};

const setDriveLink = (href, label) => {
  driveLink.hidden = false;
  driveLink.replaceChildren();
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  anchor.textContent = label;
  driveLink.appendChild(anchor);
};

const setBusy = busy => {
  isBusy = busy;
  [
    pasteButton,
    tabButton,
    downloadButton,
    driveToggle,
    clearHistoryButton,
    ...formatButtons,
  ].forEach(control => {
    control.disabled = busy;
  });
};

const isValidYouTubeUrl = rawUrl => {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return false;
  }

  let parsed;
  try {
    parsed = new URL(
      /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`,
    );
  } catch {
    return false;
  }

  const host = parsed.hostname.toLowerCase();
  const path = parsed.pathname;

  if (host === 'youtu.be' || host === 'www.youtu.be') {
    return path.length > 1;
  }

  const isYoutubeHost =
    host === 'youtube.com' ||
    host === 'www.youtube.com' ||
    host === 'm.youtube.com';

  if (!isYoutubeHost) {
    return false;
  }

  if (path === '/watch') {
    return parsed.searchParams.has('v');
  }

  if (path.startsWith('/shorts/')) {
    return path.length > '/shorts/'.length;
  }

  return false;
};

const getTrimmedUrl = () => urlInput.value.trim();

const refreshDriveAvailability = async () => {
  try {
    const response = await fetch(HEALTH_URL);
    const data = await response.json().catch(() => ({}));
    if (data.driveConfigured) {
      driveToggle.disabled = false;
      driveToggle.title = '';
      return;
    }
  } catch {
    // Server offline — leave toggle usable; download path already reports offline.
  }

  if (driveToggle.checked) {
    setStatus(
      'Google Drive is not configured on the server. Download will still work; Drive upload will report a non-fatal error.',
      'warn',
    );
  }
};

const readHistory = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
};

const writeHistory = entries => {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY)));
};

const syncFormatUI = () => {
  formatButtons.forEach(option => {
    option.classList.toggle(
      'selected',
      option.dataset.format === selectedFormat,
    );
  });
  localStorage.setItem(FORMAT_KEY, selectedFormat);
};

const renderHistory = () => {
  const entries = readHistory();
  historyList.replaceChildren();
  historyEmpty.hidden = entries.length > 0;

  entries.forEach(entry => {
    const li = document.createElement('li');
    const reuse = document.createElement('button');
    reuse.type = 'button';
    reuse.className = 'history-item';
    reuse.textContent = entry.url;
    reuse.title = entry.url;
    reuse.addEventListener('click', () => {
      urlInput.value = entry.url;
      selectedFormat = entry.format === 'audio' ? 'audio' : 'video';
      syncFormatUI();
      setStatus('Loaded from recent history.', 'info');
    });
    const meta = document.createElement('span');
    meta.className = 'history-meta';
    meta.textContent = entry.format;
    li.append(reuse, meta);
    historyList.appendChild(li);
  });
};

const pushHistory = entry => {
  const next = [
    entry,
    ...readHistory().filter(item => item.url !== entry.url),
  ].slice(0, MAX_HISTORY);
  writeHistory(next);
  renderHistory();
};

formatButtons.forEach(button => {
  button.addEventListener('click', () => {
    selectedFormat = button.dataset.format;
    syncFormatUI();
  });
});

clearHistoryButton.addEventListener('click', () => {
  writeHistory([]);
  renderHistory();
  setStatus('Recent history cleared.', 'info');
});

driveToggle.addEventListener('change', () => {
  if (driveToggle.checked) {
    refreshDriveAvailability();
  }
});

pasteButton.addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText();
    const trimmed = text.trim();
    if (!trimmed) {
      setStatus('Clipboard is empty. Paste a URL manually.', 'warn');
      return;
    }
    urlInput.value = trimmed;
    setStatus(
      isValidYouTubeUrl(trimmed)
        ? 'URL pasted from clipboard.'
        : 'Pasted text is not a supported YouTube URL.',
      isValidYouTubeUrl(trimmed) ? 'info' : 'warn',
    );
  } catch {
    setStatus(
      'Clipboard paste blocked. Allow clipboard access for this extension, or paste manually (Ctrl/Cmd+V).',
      'error',
    );
  }
});

tabButton.addEventListener('click', async () => {
  try {
    const [tab] = await browserApi.tabs.query({
      active: true,
      currentWindow: true,
    });
    const tabUrl = (tab?.url || '').trim();
    urlInput.value = tabUrl;
    if (!tabUrl) {
      setStatus('No active tab URL available.', 'warn');
      return;
    }
    setStatus(
      isValidYouTubeUrl(tabUrl)
        ? 'Loaded current tab URL.'
        : 'Tab URL loaded, but it is not a supported YouTube link.',
      isValidYouTubeUrl(tabUrl) ? 'info' : 'warn',
    );
  } catch {
    setStatus('Could not read active tab URL.', 'error');
  }
});

downloadButton.addEventListener('click', async () => {
  if (isBusy) {
    return;
  }

  const url = getTrimmedUrl();
  if (!isValidYouTubeUrl(url)) {
    setStatus(
      'Enter a valid YouTube URL first (watch, shorts, or youtu.be).',
      'error',
    );
    return;
  }

  setBusy(true);
  clearDriveLink();
  const uploadToDrive = driveToggle.checked;
  setStatus(
    uploadToDrive
      ? `Starting ${selectedFormat} download + Drive upload...`
      : `Starting ${selectedFormat} download...`,
    'info',
  );

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        url,
        format: selectedFormat,
        uploadToDrive,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.ok) {
      const detail = data.message || `Request failed (${response.status}).`;
      setStatus(`Backend error: ${detail}`, 'error');
      return;
    }

    pushHistory({url, format: selectedFormat, at: Date.now()});

    if (data.drive?.uploaded && data.drive.webViewLink) {
      setStatus(`Download ready: ${data.fileName} (saved to Drive)`, 'success');
      setDriveLink(data.drive.webViewLink, 'Open in Google Drive');
      return;
    }

    if (uploadToDrive && data.drive && !data.drive.uploaded) {
      setStatus(
        `Download ready: ${data.fileName}. Drive upload failed: ${data.drive.error || 'unknown error'}`,
        'warn',
      );
      return;
    }

    setStatus(`Download ready: ${data.fileName}`, 'success');
  } catch {
    setStatus(
      'Stub / offline: backend not reachable at 127.0.0.1:47821. Start the server (`cd server && npm run dev`), then retry.',
      'warn',
    );
  } finally {
    setBusy(false);
  }
});

syncFormatUI();
renderHistory();
refreshDriveAvailability();
