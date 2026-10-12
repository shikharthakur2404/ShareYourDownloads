import {Platform} from 'react-native';

export type DownloadFormat = 'video' | 'audio';

export interface DownloadRequest {
  url: string;
  format: DownloadFormat;
  uploadToDrive?: boolean;
  onProgress?: (progress: number) => void;
}

export interface DriveUploadInfo {
  uploaded: boolean;
  fileId?: string;
  webViewLink?: string;
  error?: string;
}

export interface DownloadResponse {
  ok: boolean;
  isStub: boolean;
  message: string;
  requestId: string;
  fileUrl?: string;
  drive?: DriveUploadInfo;
}

const SERVER_BASE_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:47821'
    : 'http://127.0.0.1:47821';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const makeStubResponse = (message: string): DownloadResponse => ({
  ok: false,
  isStub: true,
  message,
  requestId: `stub-${Date.now()}`,
});

const makeErrorResponse = (message: string): DownloadResponse => ({
  ok: false,
  isStub: false,
  message,
  requestId: `err-${Date.now()}`,
});

interface ApiDrivePayload {
  uploaded: boolean;
  fileId?: string;
  webViewLink?: string;
  error?: string;
}

interface ApiDownloadSuccessResponse {
  ok: true;
  id: string;
  fileUrl: string;
  drive?: ApiDrivePayload;
}

interface ApiDownloadErrorResponse {
  ok: false;
  message?: string;
}

export const requestDownload = async ({
  url,
  format,
  uploadToDrive = false,
  onProgress,
}: DownloadRequest): Promise<DownloadResponse> => {
  onProgress?.(5);
  await wait(120);
  onProgress?.(20);

  const controller = new AbortController();
  // Downloads (and optional Drive upload) can take several minutes.
  const timeoutMs = uploadToDrive ? 300_000 : 180_000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${SERVER_BASE_URL}/api/download`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({url, format, uploadToDrive}),
      signal: controller.signal,
    });

    onProgress?.(70);
    const payload = (await response.json().catch(() => null)) as
      | ApiDownloadSuccessResponse
      | ApiDownloadErrorResponse
      | null;

    if (response.ok && payload?.ok && 'id' in payload) {
      onProgress?.(100);
      const drive = payload.drive
        ? {
            uploaded: payload.drive.uploaded,
            fileId: payload.drive.fileId,
            webViewLink: payload.drive.webViewLink,
            error: payload.drive.error,
          }
        : undefined;

      let message = 'Download started on local backend.';
      if (drive?.uploaded && drive.webViewLink) {
        message = 'Download ready and saved to Google Drive.';
      } else if (uploadToDrive && drive && !drive.uploaded) {
        message = `Download ready. Drive upload failed: ${
          drive.error || 'unknown error'
        }`;
      }

      return {
        ok: true,
        isStub: false,
        message,
        requestId: payload.id,
        fileUrl: `${SERVER_BASE_URL}${payload.fileUrl}`,
        drive,
      };
    }

    const failureMessage =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Backend request failed (${response.status}).`;

    // Backend responded — this is a real error, not stub/offline mode.
    return makeErrorResponse(failureMessage);
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Unable to reach local backend server.';
    return makeStubResponse(
      `${errorMessage} Start the server on ${SERVER_BASE_URL} (\`cd server && npm run dev\`) to enable real downloads.`,
    );
  } finally {
    clearTimeout(timeoutId);
  }
};
