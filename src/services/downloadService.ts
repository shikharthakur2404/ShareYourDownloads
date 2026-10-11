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
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const requestDownload = async ({
  onProgress,
}: DownloadRequest): Promise<DownloadResponse> => {
  const requestId = `stub-${Date.now()}`;

  onProgress?.(5);
  await wait(250);
  onProgress?.(20);
  await wait(300);
  onProgress?.(45);

  return {
    ok: false,
    isStub: true,
    message:
      'Download request captured, but no YouTube download engine is connected yet. Plug in yt-dlp or a backend to complete real downloads.',
    requestId,
  };
};
