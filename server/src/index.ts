import cors from 'cors';
import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import {spawn} from 'child_process';
import {randomUUID} from 'crypto';
import type {Request, Response, NextFunction} from 'express';

const HOST = '127.0.0.1';
const PORT = 47821;
const YT_DLP_BINARY = process.env.SYD_YTDLP_BINARY || 'yt-dlp';
const COOKIES_FILE = process.env.SYD_COOKIES_FILE;
const DOWNLOADS_DIR = path.resolve(__dirname, '..', 'downloads');

type DownloadFormat = 'video' | 'audio';

interface DownloadBody {
  url?: string;
  format?: DownloadFormat;
}

interface DownloadResult {
  filePath: string;
  id: string;
}

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'www.youtu.be',
]);

const app = express();
app.use(cors());
app.use(express.json({limit: '32kb'}));

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const apiRateLimitStore = new Map<
  string,
  {count: number; windowStart: number}
>();

const apiRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const key = req.ip || 'unknown';
  const now = Date.now();
  const current = apiRateLimitStore.get(key);

  if (!current || now - current.windowStart >= RATE_LIMIT_WINDOW_MS) {
    apiRateLimitStore.set(key, {count: 1, windowStart: now});
    next();
    return;
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    res.status(429).json({
      ok: false,
      message: 'Too many requests. Please retry shortly.',
    });
    return;
  }

  current.count += 1;
  apiRateLimitStore.set(key, current);
  next();
};

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

const isSupportedYouTubeUrl = (rawUrl: string): boolean => {
  const parsed = toUrl(rawUrl);
  if (!parsed) {
    return false;
  }

  const host = parsed.hostname.toLowerCase();
  if (!YOUTUBE_HOSTS.has(host)) {
    return false;
  }

  if (host.includes('youtu.be')) {
    return parsed.pathname.length > 1;
  }

  if (parsed.pathname === '/watch') {
    return parsed.searchParams.has('v');
  }

  if (parsed.pathname.startsWith('/shorts/')) {
    return parsed.pathname.length > '/shorts/'.length;
  }

  return false;
};

const runProcess = (
  command: string,
  args: string[],
): Promise<{stdout: string; stderr: string}> =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', chunk => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', chunk => {
      stderr += chunk.toString();
    });

    child.once('error', error => {
      reject(error);
    });

    child.once('close', code => {
      if (code === 0) {
        resolve({stdout, stderr});
        return;
      }

      reject(
        new Error(
          `Command failed with exit code ${code}. ${stderr || stdout}`.trim(),
        ),
      );
    });
  });

const isYtDlpInstalled = async (): Promise<boolean> => {
  try {
    await runProcess(YT_DLP_BINARY, ['--version']);
    return true;
  } catch {
    return false;
  }
};

const findDownloadedPath = async (id: string): Promise<string | null> => {
  const files = await fs.readdir(DOWNLOADS_DIR);
  const match = files.find(file => file.startsWith(`${id}.`));
  return match ? path.join(DOWNLOADS_DIR, match) : null;
};

const downloadWithYtDlp = async (
  url: string,
  format: DownloadFormat,
): Promise<DownloadResult> => {
  await fs.mkdir(DOWNLOADS_DIR, {recursive: true});

  const id = randomUUID();
  const outputTemplate = path.join(DOWNLOADS_DIR, `${id}.%(ext)s`);

  const args = [
    '--no-playlist',
    '--restrict-filenames',
    '--print',
    'after_move:filepath',
    '-o',
    outputTemplate,
  ];

  if (COOKIES_FILE) {
    args.push('--cookies', COOKIES_FILE);
  }

  if (format === 'audio') {
    args.push('-x', '--audio-format', 'mp3');
  } else {
    args.push(
      '-f',
      'bestvideo*+bestaudio/best',
      '--merge-output-format',
      'mp4',
    );
  }

  args.push(url);

  const {stdout} = await runProcess(YT_DLP_BINARY, args);

  const stdoutLines = stdout
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .reverse();

  for (const line of stdoutLines) {
    const normalized = path.resolve(line);
    try {
      await fs.access(normalized);
      return {id, filePath: normalized};
    } catch {
      // ignore and continue
    }
  }

  const fallbackPath = await findDownloadedPath(id);
  if (!fallbackPath) {
    throw new Error('yt-dlp completed but output file could not be resolved.');
  }

  return {id, filePath: fallbackPath};
};

app.get('/health', async (_req, res) => {
  const ytDlpInstalled = await isYtDlpInstalled();

  res.json({
    ok: true,
    ytDlpInstalled,
    cookiesConfigured: Boolean(COOKIES_FILE),
  });
});

app.post('/api/download', apiRateLimiter, async (req, res) => {
  const body = req.body as DownloadBody;

  const url = body.url?.trim();
  const format = body.format;

  if (!url || (format !== 'video' && format !== 'audio')) {
    res.status(400).json({
      ok: false,
      message: 'Request must include { url, format: "video" | "audio" }.',
    });
    return;
  }

  if (!isSupportedYouTubeUrl(url)) {
    res.status(400).json({
      ok: false,
      message:
        'Only youtube.com/watch, youtube.com/shorts, and youtu.be URLs are supported.',
    });
    return;
  }

  const ytDlpInstalled = await isYtDlpInstalled();
  if (!ytDlpInstalled) {
    res.status(503).json({
      ok: false,
      message:
        'yt-dlp is not available on this machine. Install yt-dlp to enable real downloads.',
    });
    return;
  }

  try {
    const result = await downloadWithYtDlp(url, format);

    res.status(201).json({
      ok: true,
      id: result.id,
      format,
      fileName: path.basename(result.filePath),
      fileUrl: `/api/files/${result.id}`,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Download failed due to an unknown error.';

    res.status(502).json({
      ok: false,
      message,
    });
  }
});

app.get('/api/files/:id', apiRateLimiter, async (req, res) => {
  const {id} = req.params;

  if (typeof id !== 'string' || !/^[a-zA-Z0-9-]+$/.test(id)) {
    res.status(400).json({ok: false, message: 'Invalid file id.'});
    return;
  }

  try {
    await fs.mkdir(DOWNLOADS_DIR, {recursive: true});
    const filePath = await findDownloadedPath(id);

    if (!filePath) {
      res.status(404).json({ok: false, message: 'File not found.'});
      return;
    }

    res.sendFile(filePath);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to read requested file.';
    res.status(500).json({ok: false, message});
  }
});

app.listen(PORT, HOST, async () => {
  await fs.mkdir(DOWNLOADS_DIR, {recursive: true});
  console.log(`Share Your Downloads server running on http://${HOST}:${PORT}`);
});
