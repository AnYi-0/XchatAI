import type { TwitterConfig, TwitterPreviewResult } from '@/lib/types/xchatai';
import { requestJson } from './http-client';

export async function validateTwitterConfigRequest(twitterConfig: TwitterConfig) {
  return requestJson<{ ok: true }>('/api/twitter/validate', {
    method: 'POST',
    body: JSON.stringify({ twitterConfig }),
  });
}

export async function previewTwitterUserRequest(params: {
  username: string;
  maxResults?: number;
  twitterConfig: TwitterConfig;
}) {
  return requestJson<TwitterPreviewResult>('/api/twitter/preview', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}
