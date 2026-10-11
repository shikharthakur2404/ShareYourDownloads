import {Platform} from 'react-native';

export type DownloadFormat = 'video' | 'audio';

export interface DownloadRequest {
  url: string;
  format: DownloadFormat;
  onProgress?: (progress: number) => void;
}

export interface DownloadResponse {
  ok: boolean;
  isStub: boolean;
  message: string;
  requestId: string;
  fileUrl?: string;
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

interface ApiDownloadSuccessResponse {
  ok: true;
  id: string;
  fileUrl: string;
}

interface ApiDownloadErrorResponse {
  ok: false;
  message?: string;
}

export const requestDownload = async ({
  url,
  format,
  onProgress,
}: DownloadRequest): Promise<DownloadResponse> => {
  onProgress?.(5);
  await wait(120);
  onProgress?.(20);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(`${SERVER_BASE_URL}/api/download`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({url, format}),
      signal: controller.signal,
    });

    onProgress?.(70);
    const payload = (await response.json().catch(() => null)) as
      | ApiDownloadSuccessResponse
      | ApiDownloadErrorResponse
      | null;

    if (response.ok && payload?.ok && 'id' in payload) {
      onProgress?.(100);
      return {
        ok: true,
        isStub: false,
        message: 'Download started on local backend.',
        requestId: payload.id,
        fileUrl: `${SERVER_BASE_URL}${payload.fileUrl}`,
      };
    }

    const failureMessage =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Backend request failed (${response.status}).`;

    return makeStubResponse(
      `${failureMessage} Running in stub mode until backend + yt-dlp are available.`,
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Unable to reach local backend server.';
    return makeStubResponse(
      `${errorMessage} Start server on ${SERVER_BASE_URL} to enable real downloads.`,
    );
  } finally {
    clearTimeout(timeoutId);
  }
};
