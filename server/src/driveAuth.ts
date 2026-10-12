/**
 * One-time OAuth helper: prints a Google refresh token for Drive uploads.
 *
 * Usage:
 *   GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... npm run drive:auth
 *
 * Requires an OAuth Desktop or Web client with redirect URI:
 *   http://127.0.0.1:47822/oauth2callback
 */

import http from 'http';
import {URL} from 'url';
import {getDriveScope} from './drive';

const REDIRECT_PORT = 47822;
const REDIRECT_URI = `http://127.0.0.1:${REDIRECT_PORT}/oauth2callback`;
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

if (!clientId || !clientSecret) {
  console.error(
    'Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET before running drive:auth.',
  );
  process.exit(1);
}

const authUrl = new URL(AUTH_URL);
authUrl.searchParams.set('client_id', clientId);
authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('scope', getDriveScope());
authUrl.searchParams.set('access_type', 'offline');
authUrl.searchParams.set('prompt', 'consent');

const exchangeCode = async (code: string): Promise<void> => {
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code',
  });

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body,
  });

  const payload = (await response.json().catch(() => null)) as {
    refresh_token?: string;
    access_token?: string;
    error?: string;
    error_description?: string;
  } | null;

  if (!response.ok || !payload) {
    throw new Error(
      payload?.error_description ||
        payload?.error ||
        `Token exchange failed (HTTP ${response.status}).`,
    );
  }

  if (!payload.refresh_token) {
    throw new Error(
      'No refresh_token returned. Revoke prior grants for this client in Google Account → Security → Third-party access, then retry with prompt=consent.',
    );
  }

  console.log('\nSuccess. Add this to your environment (never commit it):\n');
  console.log(`GOOGLE_CLIENT_ID=${clientId}`);
  console.log(`GOOGLE_CLIENT_SECRET=${clientSecret}`);
  console.log(`GOOGLE_REFRESH_TOKEN=${payload.refresh_token}`);
  console.log(
    '\nOptional: GOOGLE_DRIVE_FOLDER_ID=<existing folder id>\nRestart the server after setting env vars.\n',
  );
};

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url || '/', `http://127.0.0.1:${REDIRECT_PORT}`);
    if (requestUrl.pathname !== '/oauth2callback') {
      res.writeHead(404, {'Content-Type': 'text/plain'});
      res.end('Not found');
      return;
    }

    const error = requestUrl.searchParams.get('error');
    if (error) {
      res.writeHead(400, {'Content-Type': 'text/plain'});
      res.end(`OAuth error: ${error}`);
      console.error(`OAuth error: ${error}`);
      server.close();
      process.exit(1);
    }

    const code = requestUrl.searchParams.get('code');
    if (!code) {
      res.writeHead(400, {'Content-Type': 'text/plain'});
      res.end('Missing authorization code.');
      return;
    }

    await exchangeCode(code);
    res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
    res.end(
      '<html><body><h1>ShareYourDownloads</h1><p>Authorized. You can close this tab and return to the terminal.</p></body></html>',
    );
    server.close();
    process.exit(0);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown OAuth failure.';
    res.writeHead(500, {'Content-Type': 'text/plain'});
    res.end(message);
    console.error(message);
    server.close();
    process.exit(1);
  }
});

server.listen(REDIRECT_PORT, '127.0.0.1', () => {
  console.log('Google Drive OAuth helper');
  console.log(`Redirect URI (must match Google Cloud client): ${REDIRECT_URI}`);
  console.log('\nOpen this URL in your browser:\n');
  console.log(authUrl.toString());
  console.log('\nWaiting for OAuth callback...');
});
