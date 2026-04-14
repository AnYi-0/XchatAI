import type { AIConfig } from '@/lib/types/xchatai';
import { requestJson } from './http-client';

export async function validateAiConfigRequest(aiConfig: AIConfig) {
  return requestJson<{ ok: true }>('/api/ai/validate', {
    method: 'POST',
    body: JSON.stringify({ aiConfig }),
  });
}
