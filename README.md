# Share Your Downloads

Share Your Downloads is a minimal React Native app for a quick flow:

1. Paste a YouTube URL
2. Choose **Video** or **Audio**
3. Tap **Download**

## MVP Status

This repo currently ships an MVP UI and a **local stub download service**.

- URL input + paste-from-clipboard
- Video / Audio selector
- Download button with status and progress feedback
- YouTube URL validation for:
  - `youtube.com/watch?...`
  - `youtube.com/shorts/...`
  - `youtu.be/...`

## Run the app

> Make sure your React Native environment is already set up: https://reactnative.dev/docs/environment-setup

Install dependencies:

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

## Current limitations

- Real YouTube media download is **not implemented yet** in this MVP.
- The app currently records a download request through a local stub service and reports progress/status honestly.
- A real downloader engine (for example, yt-dlp integration or a backend API) still needs to be connected.

## Legal note

Downloading from YouTube may violate YouTube Terms of Service and copyright law depending on the content and jurisdiction. Use this app only for content you have rights to access offline and for personal use.

## Possible next steps (out of scope for this PR)

- Plug in a real downloader backend/service boundary already added in the app
- Add support for other social/video platforms
- Build a companion browser extension
