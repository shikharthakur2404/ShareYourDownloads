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

const setStatus = message => {
  status.textContent = message;
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
    urlInput.value = text.trim();
    setStatus('URL pasted from clipboard.');
  } catch {
    setStatus('Clipboard paste failed. Paste manually.');
  }
});

tabButton.addEventListener('click', async () => {
  try {
    const [tab] = await browserApi.tabs.query({
      active: true,
      currentWindow: true,
    });
    urlInput.value = (tab?.url || '').trim();
    setStatus(
      tab?.url ? 'Loaded current tab URL.' : 'No active tab URL available.',
    );
  } catch {
    setStatus('Could not read active tab URL.');
  }
});

downloadButton.addEventListener('click', async () => {
  if (isBusy) {
    return;
  }

  const url = getTrimmedUrl();
  if (!isValidYouTubeUrl(url)) {
    setStatus('Enter a valid YouTube URL first.');
    return;
  }

  setBusy(true);
  setStatus(`Starting ${selectedFormat} download...`);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({url, format: selectedFormat}),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.ok) {
      setStatus(data.message || `Request failed (${response.status}).`);
      return;
    }

    setStatus(`Download ready: ${data.fileName}`);
  } catch {
    setStatus('Backend not reachable at 127.0.0.1:47821. Start server first.');
  } finally {
    setBusy(false);
  }
});
