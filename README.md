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
- Optional **Save to Google Drive** toggle (off by default)
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
- `GET /health` — includes `ytDlpInstalled`, `cookiesConfigured`, `driveConfigured`
- `POST /api/download` with body `{ "url": string, "format": "video" | "audio", "uploadToDrive"?: boolean }`
- `GET /api/files/:id`
- `POST /api/files/:id/drive` — optional follow-up upload of an already-downloaded file

When `uploadToDrive` is true (or after `POST .../drive`), a successful download still returns `ok: true` even if Drive upload fails. Drive outcome is in `drive: { uploaded, fileId?, webViewLink?, error? }`.

### Backend setup

```bash
cd server
npm install
npm run dev
```

Optional env vars (see also `server/.env.example`):
- `SYD_COOKIES_FILE` — path to an exported cookies file used by yt-dlp
- `SYD_YTDLP_BINARY` — custom yt-dlp binary name/path
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REFRESH_TOKEN` — enable optional Drive upload
- `GOOGLE_DRIVE_FOLDER_ID` — optional existing folder; otherwise a `ShareYourDownloads` folder is created in My Drive

### Optional: Google Drive upload

Feature is **off by default** until Google OAuth env vars are set. Upload runs **server-side** after yt-dlp finishes (same file served by `/api/files/:id`). Scope used: `drive.file` only. No credential scraping — standard Google OAuth.

1. Create a Google Cloud project and enable the **Google Drive API**.
2. Configure OAuth consent (External or Internal) and create an OAuth client:
   - **Desktop app**, or **Web application** with redirect URI `http://127.0.0.1:47822/oauth2callback`
3. Copy the client ID and secret, then run the one-time helper:

```bash
cd server
GOOGLE_CLIENT_ID=your-id GOOGLE_CLIENT_SECRET=your-secret npm run drive:auth
```

4. Open the printed URL, approve access, and copy the printed `GOOGLE_REFRESH_TOKEN` into your environment (never commit secrets).
5. Restart the server with the three Google env vars set. Confirm `GET /health` shows `"driveConfigured": true`.
6. In the extension or mobile app, enable **Save to Google Drive**, then download. On success the response includes `drive.webViewLink`.

If Drive is not configured or upload fails, the local download still succeeds and clients surface a non-fatal Drive error/status.

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
- Optional **Save to Google Drive** toggle (off by default)
- Download trigger via the same local backend API

Load the **unpacked** `extension/` folder from this repo (relative path: `extension/`). All Chromium browsers below use the same **Load unpacked** flow.

### Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `extension/` folder in this repo

### Brave

1. Open `brave://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `extension/` folder in this repo

### Microsoft Edge

1. Open `edge://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `extension/` folder in this repo

### Firefox (temporary)

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on…**
3. Select `extension/manifest.json` in this repo

### Safari

Safari Web Extensions are **out of scope** for this project. Safari does not support loading an unpacked MV3 extension the same way Chromium browsers do (Xcode / Apple Developer packaging is required). Use Chrome, Brave, Edge, or Firefox for local testing.

## Current limitations

- Real YouTube downloads depend on local backend + local yt-dlp availability.
- Cloud/shared IP environments may hit YouTube anti-bot checks.
- Optional cookies file can improve local success rates; no credential scraping or DRM bypass is implemented.
- Status messages distinguish **stub mode** (backend offline / unreachable) from **real backend errors** (yt-dlp missing, download failed, etc.).
- Google Drive upload is optional and requires local OAuth env configuration; Instagram/TikTok are out of scope for this release.

## Legal note

Downloading from YouTube may violate YouTube Terms of Service and copyright law depending on content and jurisdiction. Use this project only for content you have rights to access offline and for personal use.
