const API_BASE = 'http://127.0.0.1:47821';
const API_URL = `${API_BASE}/api/download`;
const HEALTH_URL = `${API_BASE}/health`;
const HISTORY_KEY = 'syd.web.history';
const FORMAT_KEY = 'syd.web.format';
const MAX_HISTORY = 8;

const urlInput = document.getElementById('urlInput');
const pasteButton = document.getElementById('pasteButton');
const downloadButton = document.getElementById('downloadButton');
const driveToggle = document.getElementById('driveToggle');
const statusEl = document.getElementById('status');
const resultLink = document.getElementById('resultLink');
const historyList = document.getElementById('historyList');
const historyEmpty = document.getElementById('historyEmpty');
const clearHistory = document.getElementById('clearHistory');
const formatButtons = Array.from(document.querySelectorAll('.chip'));

let selectedFormat = localStorage.getItem(FORMAT_KEY) || 'video';
let isBusy = false;

const setStatus = (message, tone = 'info') => {
  statusEl.textContent = message;
  statusEl.dataset.tone = tone;
};

const clearResultLink = () => {
  resultLink.hidden = true;
  resultLink.replaceChildren();
};

const setResultLinks = links => {
  resultLink.hidden = false;
  resultLink.replaceChildren();
  links.forEach(({href, label}, index) => {
    if (index > 0) {
      resultLink.appendChild(document.createTextNode(' · '));
    }
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.textContent = label;
    resultLink.appendChild(anchor);
  });
};

const setBusy = busy => {
  isBusy = busy;
  [pasteButton, downloadButton, driveToggle, ...formatButtons].forEach(
    control => {
      control.disabled = busy;
    },
  );
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

const pushHistory = entry => {
  const next = [
    entry,
    ...readHistory().filter(item => item.url !== entry.url),
  ].slice(0, MAX_HISTORY);
  writeHistory(next);
  renderHistory();
};

const renderHistory = () => {
  const entries = readHistory();
  historyList.replaceChildren();
  historyEmpty.hidden = entries.length > 0;

  entries.forEach(entry => {
    const li = document.createElement('li');
    const reuse = document.createElement('button');
    reuse.type = 'button';
    reuse.className = 'reuse';
    reuse.textContent = entry.url;
    reuse.title = entry.url;
    reuse.addEventListener('click', () => {
      urlInput.value = entry.url;
      selectedFormat = entry.format === 'audio' ? 'audio' : 'video';
      syncFormatUI();
      setStatus('Loaded from recent history.', 'info');
    });

    const meta = document.createElement('span');
    meta.className = 'meta';
    meta.textContent = entry.format;

    li.append(reuse, meta);
    historyList.appendChild(li);
  });
};

const syncFormatUI = () => {
  formatButtons.forEach(button => {
    button.classList.toggle('selected', button.dataset.format === selectedFormat);
  });
  localStorage.setItem(FORMAT_KEY, selectedFormat);
};

formatButtons.forEach(button => {
  button.addEventListener('click', () => {
    selectedFormat = button.dataset.format;
    syncFormatUI();
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
      'Clipboard blocked. Paste manually with Ctrl/Cmd+V.',
      'error',
    );
  }
});

clearHistory.addEventListener('click', () => {
  writeHistory([]);
  renderHistory();
  setStatus('Recent history cleared.', 'info');
});

driveToggle.addEventListener('change', () => {
  if (driveToggle.checked) {
    refreshHealth();
  }
});

const refreshHealth = async () => {
  try {
    const response = await fetch(HEALTH_URL);
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      setStatus('Local server responded unexpectedly. Check server logs.', 'warn');
      return data;
    }

    const parts = ['Server online'];
    parts.push(data.ytDlpInstalled ? 'yt-dlp ready' : 'yt-dlp missing');
    if (data.driveConfigured) {
      parts.push('Drive configured');
      driveToggle.title = '';
    } else {
      parts.push('Drive not configured');
      if (driveToggle.checked) {
        setStatus(
          'Google Drive is not configured on the server. Download will still work; Drive upload will report a non-fatal error.',
          'warn',
        );
        return data;
      }
    }
    setStatus(`${parts.join(' · ')}. Paste a URL to download.`, 'info');
    return data;
  } catch {
    setStatus(
      'Server offline at 127.0.0.1:47821. Run `cd server && npm run dev`, then refresh.',
      'warn',
    );
    return null;
  }
};

downloadButton.addEventListener('click', async () => {
  if (isBusy) {
    return;
  }

  const url = urlInput.value.trim();
  if (!isValidYouTubeUrl(url)) {
    setStatus(
      'Enter a valid YouTube URL first (watch, shorts, or youtu.be).',
      'error',
    );
    return;
  }

  setBusy(true);
  clearResultLink();
  const uploadToDrive = driveToggle.checked;
  setStatus(
    uploadToDrive
      ? `Starting ${selectedFormat} download + Drive upload…`
      : `Starting ${selectedFormat} download…`,
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
      setStatus(
        `Backend error: ${data.message || `Request failed (${response.status}).`}`,
        'error',
      );
      return;
    }

    pushHistory({url, format: selectedFormat, at: Date.now()});

    const links = [];
    if (data.fileUrl) {
      links.push({
        href: `${API_BASE}${data.fileUrl}`,
        label: `Open ${data.fileName || 'file'}`,
      });
    }
    if (data.drive?.uploaded && data.drive.webViewLink) {
      links.push({href: data.drive.webViewLink, label: 'Open in Google Drive'});
      setStatus(`Download ready: ${data.fileName} (saved to Drive)`, 'success');
      setResultLinks(links);
      return;
    }

    if (uploadToDrive && data.drive && !data.drive.uploaded) {
      setStatus(
        `Download ready: ${data.fileName}. Drive upload failed: ${data.drive.error || 'unknown error'}`,
        'warn',
      );
      if (links.length) {
        setResultLinks(links);
      }
      return;
    }

    setStatus(`Download ready: ${data.fileName}`, 'success');
    if (links.length) {
      setResultLinks(links);
    }
  } catch {
    setStatus(
      'Server not reachable at 127.0.0.1:47821. Start it with `cd server && npm run dev`.',
      'warn',
    );
  } finally {
    setBusy(false);
  }
});

syncFormatUI();
renderHistory();
refreshHealth();
