import fs from 'fs/promises';
import path from 'path';

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DRIVE_FILES_URL = 'https://www.googleapis.com/upload/drive/v3/files';
const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';
const DEFAULT_FOLDER_NAME = 'ShareYourDownloads';

export interface DriveConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  folderId?: string;
}

export interface DriveUploadSuccess {
  uploaded: true;
  fileId: string;
  webViewLink: string;
  folderId: string;
}

export interface DriveUploadFailure {
  uploaded: false;
  error: string;
}

export type DriveUploadResult = DriveUploadSuccess | DriveUploadFailure;

let cachedFolderId: string | null = null;
let cachedAccessToken: {token: string; expiresAtMs: number} | null = null;

export const getDriveScope = (): string => DRIVE_SCOPE;

export const readDriveConfig = (): DriveConfig | null => {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN?.trim();
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim();

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  return {
    clientId,
    clientSecret,
    refreshToken,
    folderId: folderId || undefined,
  };
};

export const isDriveConfigured = (): boolean => readDriveConfig() !== null;

const getAccessToken = async (config: DriveConfig): Promise<string> => {
  const now = Date.now();
  if (cachedAccessToken && cachedAccessToken.expiresAtMs > now + 60_000) {
    return cachedAccessToken.token;
  }

  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: config.refreshToken,
    grant_type: 'refresh_token',
  });

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body,
  });

  const payload = (await response.json().catch(() => null)) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  } | null;

  if (!response.ok || !payload?.access_token) {
    const detail =
      payload?.error_description ||
      payload?.error ||
      `HTTP ${response.status}`;
    throw new Error(`Failed to refresh Google access token: ${detail}`);
  }

  const expiresInSec =
    typeof payload.expires_in === 'number' && payload.expires_in > 0
      ? payload.expires_in
      : 3600;

  cachedAccessToken = {
    token: payload.access_token,
    expiresAtMs: now + expiresInSec * 1000,
  };

  return payload.access_token;
};

const guessMimeType = (fileName: string): string => {
  const ext = path.extname(fileName).toLowerCase();
  switch (ext) {
    case '.mp4':
      return 'video/mp4';
    case '.webm':
      return 'video/webm';
    case '.mkv':
      return 'video/x-matroska';
    case '.mp3':
      return 'audio/mpeg';
    case '.m4a':
      return 'audio/mp4';
    case '.wav':
      return 'audio/wav';
    case '.opus':
      return 'audio/opus';
    default:
      return 'application/octet-stream';
  }
};

const findOrCreateFolder = async (
  accessToken: string,
  preferredFolderId?: string,
): Promise<string> => {
  if (preferredFolderId) {
    return preferredFolderId;
  }

  if (cachedFolderId) {
    return cachedFolderId;
  }

  const query = encodeURIComponent(
    `name='${DEFAULT_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
  );
  const listResponse = await fetch(
    `${DRIVE_API_URL}?q=${query}&spaces=drive&fields=files(id,name)&pageSize=1`,
    {
      headers: {Authorization: `Bearer ${accessToken}`},
    },
  );

  const listPayload = (await listResponse.json().catch(() => null)) as {
    files?: Array<{id: string}>;
    error?: {message?: string};
  } | null;

  if (!listResponse.ok) {
    throw new Error(
      listPayload?.error?.message ||
        `Failed to look up Drive folder (HTTP ${listResponse.status}).`,
    );
  }

  const existingId = listPayload?.files?.[0]?.id;
  if (existingId) {
    cachedFolderId = existingId;
    return existingId;
  }

  const createResponse = await fetch(DRIVE_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: DEFAULT_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  const createPayload = (await createResponse.json().catch(() => null)) as {
    id?: string;
    error?: {message?: string};
  } | null;

  if (!createResponse.ok || !createPayload?.id) {
    throw new Error(
      createPayload?.error?.message ||
        `Failed to create Drive folder (HTTP ${createResponse.status}).`,
    );
  }

  cachedFolderId = createPayload.id;
  return createPayload.id;
};

/**
 * Upload a local file to the user's Google Drive (ShareYourDownloads folder
 * or GOOGLE_DRIVE_FOLDER_ID). Never throws for caller convenience — returns
 * a structured failure so download success stays non-fatal.
 */
export const uploadFileToDrive = async (
  filePath: string,
): Promise<DriveUploadResult> => {
  const config = readDriveConfig();
  if (!config) {
    return {
      uploaded: false,
      error:
        'Google Drive is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN (see README).',
    };
  }

  try {
    const accessToken = await getAccessToken(config);
    const folderId = await findOrCreateFolder(accessToken, config.folderId);
    const fileName = path.basename(filePath);
    const mimeType = guessMimeType(fileName);
    const fileBuffer = await fs.readFile(filePath);

    const boundary = `syd_${Date.now().toString(16)}`;
    const metadata = JSON.stringify({
      name: fileName,
      parents: [folderId],
    });

    const preamble = Buffer.from(
      `--${boundary}\r\n` +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        `${metadata}\r\n` +
        `--${boundary}\r\n` +
        `Content-Type: ${mimeType}\r\n\r\n`,
      'utf8',
    );
    const epilogue = Buffer.from(`\r\n--${boundary}--`, 'utf8');
    const body = Buffer.concat([preamble, fileBuffer, epilogue]);

    const uploadResponse = await fetch(
      `${DRIVE_FILES_URL}?uploadType=multipart&fields=id,webViewLink,name`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
          'Content-Length': String(body.length),
        },
        body,
      },
    );

    const uploadPayload = (await uploadResponse.json().catch(() => null)) as {
      id?: string;
      webViewLink?: string;
      error?: {message?: string};
    } | null;

    if (!uploadResponse.ok || !uploadPayload?.id) {
      throw new Error(
        uploadPayload?.error?.message ||
          `Drive upload failed (HTTP ${uploadResponse.status}).`,
      );
    }

    return {
      uploaded: true,
      fileId: uploadPayload.id,
      webViewLink:
        uploadPayload.webViewLink ||
        `https://drive.google.com/file/d/${uploadPayload.id}/view`,
      folderId,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown Drive upload error.';
    return {uploaded: false, error: message};
  }
};
