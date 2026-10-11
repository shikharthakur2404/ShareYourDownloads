const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
]);
const YOUTU_BE_HOSTS = new Set(['youtu.be', 'www.youtu.be']);

const toUrl = (rawUrl: string): URL | null => {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return null;
  }

  const candidate = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    return new URL(candidate);
  } catch {
    return null;
  }
};

export const isValidYouTubeUrl = (rawUrl: string): boolean => {
  const parsed = toUrl(rawUrl);
  if (!parsed) {
    return false;
  }

  const host = parsed.hostname.toLowerCase();
  const path = parsed.pathname;

  if (YOUTU_BE_HOSTS.has(host)) {
    return path.length > 1;
  }

  if (!YOUTUBE_HOSTS.has(host)) {
    return false;
  }

  if (path.startsWith('/shorts/')) {
    return path.length > '/shorts/'.length;
  }

  if (path === '/watch') {
    return parsed.searchParams.has('v');
  }

  return false;
};

export const getYouTubeUrlError = (rawUrl: string): string | null => {
  if (isValidYouTubeUrl(rawUrl)) {
    return null;
  }

  return 'Enter a valid YouTube URL (youtube.com/watch, youtube.com/shorts, or youtu.be).';
};
