# Evening pending — Share Your Downloads

Quick wrap-up list. Pick up here later.

**Local clone:** `/Users/shikharthakur/Desktop/Everything/Projects/ShareYourDownloads`  
**Open in Cursor:** `cursor /Users/shikharthakur/Desktop/Everything/Projects/ShareYourDownloads`  
(or File → Add Folder to Workspace → that path)

## Do tonight / next session

- [ ] Merge [PR #3](https://github.com/shikharthakur2404/ShareYourDownloads/pull/3) (Google Drive upload + polish) when ready
- [ ] One-time Google OAuth for Drive:
  - Create Google Cloud OAuth client
  - Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` (optional `GOOGLE_DRIVE_FOLDER_ID`)
  - `cd server && npm run drive:auth` if you still need a refresh token
  - README in PR #3 has the full steps
- [ ] Smoke-test Drive toggle: download once with **Save to Google Drive** on → confirm file appears in Drive
- [ ] Confirm this folder is open in Cursor (path above)

## Already done (don’t redo)

- [x] [PR #1](https://github.com/shikharthakur2404/ShareYourDownloads/pull/1) merged — MVP app + `server/` + `extension/`
- [x] Brave + Edge extension smoke tests (real yt-dlp download)
- [x] Optional Google Drive upload implemented on draft PR #3
- [x] [PR #2](https://github.com/shikharthakur2404/ShareYourDownloads/pull/2) closed — polish folded into #3
- [x] Extension popup UI polish (dark elevated theme)

## Later backlog (not blocking)

- [ ] Download history screen in the mobile app
- [ ] Multi-platform URLs (Instagram / TikTok / X) behind the same paste UX
- [ ] UX polish: one-tap defaults, clearer stub vs real errors everywhere
- [ ] Safari / App Store path (harder; separate effort)
- [ ] Consider making the GitHub repo private again if you don’t want it public

## Local run (cheat sheet)

```bash
cd /Users/shikharthakur/Desktop/Everything/Projects/ShareYourDownloads
cd server && npm i && npm run dev          # http://127.0.0.1:47821
# Brave/Edge → Load unpacked → extension/
# Optional: npm start && npm run ios|android
```
