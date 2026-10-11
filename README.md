# Share Your Downloads

Share Your Downloads is a minimal project for a simple flow:

1. Paste a YouTube URL
2. Choose **Video** or **Audio**
3. Start the download request

The repo includes:
- React Native mobile app (MVP UI)
- Local Node/TypeScript backend (`server/`) that runs yt-dlp
- MV3 browser extension (`extension/`) that calls the same backend

## Mobile app (React Native)

The app keeps the lightweight MVP UI:
- URL input + paste-from-clipboard
- Video/Audio selector
- Download action with status/progress
- YouTube URL validation (`youtube.com/watch`, `youtube.com/shorts`, `youtu.be`)

### Run mobile app

> Ensure the React Native environment is already configured: https://reactnative.dev/docs/environment-setup

Install root dependencies:

```bash
npm install
```

Start Metro:

```bash
npm start
```

Run Android:

```bash
npm run android
```

Run iOS:

```bash
npm run ios
```

## Local backend server (`server/`)

The backend listens on `http://127.0.0.1:47821` and exposes:
- `GET /health`
- `POST /api/download` with body `{ "url": string, "format": "video" | "audio" }`
- `GET /api/files/:id`

### Backend setup

```bash
cd server
npm install
npm run dev
```

Optional env vars:
- `SYD_COOKIES_FILE` — path to an exported cookies file used by yt-dlp
- `SYD_YTDLP_BINARY` — custom yt-dlp binary name/path

### yt-dlp requirement

Install yt-dlp on your machine and ensure `yt-dlp` is on PATH.
If yt-dlp is unavailable (or backend is unreachable), the mobile app falls back to an honest stub response (`isStub: true`) and does not claim real downloads are working.

### Android emulator host note

When the mobile app runs on Android emulator, `127.0.0.1` inside the app points to the emulator itself. The app therefore calls backend at:
- `http://10.0.2.2:47821` (Android emulator)
- `http://127.0.0.1:47821` (iOS simulator)

## Browser extension (`extension/`)

The MV3 extension provides:
- Paste URL from clipboard
- Use active tab URL
- Video/Audio choice
- Download trigger via the same local backend API

### Load extension (Chrome)

1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select `/home/runner/work/ShareYourDownloads/ShareYourDownloads/extension`

### Load extension (Firefox)

1. Go to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select `/home/runner/work/ShareYourDownloads/ShareYourDownloads/extension/manifest.json`

## Current limitations

- Real YouTube downloads depend on local backend + local yt-dlp availability.
- Cloud/shared IP environments may hit YouTube anti-bot checks.
- Optional cookies file can improve local success rates; no credential scraping or DRM bypass is implemented.

## Legal note

Downloading from YouTube may violate YouTube Terms of Service and copyright law depending on content and jurisdiction. Use this project only for content you have rights to access offline and for personal use.
