/* eslint-env browser */

const browserApi = window.browser ?? window.chrome;
const API_URL = 'http://127.0.0.1:47821/api/download';

const urlInput = document.getElementById('urlInput');
const status = document.getElementById('status');
const pasteButton = document.getElementById('pasteButton');
const tabButton = document.getElementById('tabButton');
const downloadButton = document.getElementById('downloadButton');
const formatButtons = Array.from(document.querySelectorAll('.toggle button'));

let selectedFormat = 'video';
let isBusy = false;

const setStatus = (message, tone = 'info') => {
  status.textContent = message;
  status.dataset.tone = tone;
};

const setBusy = busy => {
  isBusy = busy;
  [pasteButton, tabButton, downloadButton, ...formatButtons].forEach(button => {
    button.disabled = busy;
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

formatButtons.forEach(button => {
  button.addEventListener('click', () => {
    selectedFormat = button.dataset.format;
    formatButtons.forEach(option => {
      option.classList.toggle('selected', option === button);
    });
  });
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
  setStatus(`Starting ${selectedFormat} download...`, 'info');

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({url, format: selectedFormat}),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.ok) {
      const detail =
        data.message || `Request failed (${response.status}).`;
      setStatus(`Backend error: ${detail}`, 'error');
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
