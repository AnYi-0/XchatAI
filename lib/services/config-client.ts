import type { AIConfig, ServerConfigSnapshot, TwitterConfig } from '@/lib/types/xchatai';
import { requestJson } from './http-client';

export async function fetchServerConfigRequest() {
  return requestJson<ServerConfigSnapshot>('/api/config');
}

export async function saveServerConfigRequest(payload: {
  aiConfig: AIConfig;
  twitterConfig: TwitterConfig;
}) {
  return requestJson<ServerConfigSnapshot>('/api/config', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
