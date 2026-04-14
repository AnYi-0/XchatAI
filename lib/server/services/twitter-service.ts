import { previewTwitterUserTimeline, validateTwitterCredentials } from '@/lib/server/providers/twitter-provider';
import type { TwitterConfig } from '@/lib/types/xchatai';

export async function validateTwitterConfig(config: TwitterConfig) {
  return validateTwitterCredentials(config);
}

export async function previewTwitterUser(params: {
  username: string;
  maxResults?: number;
  twitterConfig: TwitterConfig;
}) {
  return previewTwitterUserTimeline(params);
}
