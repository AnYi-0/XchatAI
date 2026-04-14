import { AppRouteError } from '@/lib/server/api/http-error';
import { loadTwitterAppCredentials, saveTwitterBearerToken } from '@/lib/server/services/secure-config-service';
import type { Tweet, TwitterConfig, TwitterPreviewResult, TwitterUserProfile } from '@/lib/types/xchatai';

const X_API_BASE_URL = 'https://api.x.com/2';
const X_OAUTH_BASE_URL = 'https://api.x.com/oauth2/token';

type XApiErrorPayload = {
  errors?: Array<{ detail?: string; title?: string; message?: string }>;
  title?: string;
  detail?: string;
};

type XUserLookupResponse = {
  data?: {
    id: string;
    name: string;
    username: string;
    description?: string;
    profile_image_url?: string;
    verified?: boolean;
  };
} & XApiErrorPayload;

type XUserTweetsResponse = {
  data?: Array<{
    id: string;
    text: string;
    created_at?: string;
  }>;
} & XApiErrorPayload;

async function generateBearerTokenFromAppCredentials() {
  const { apiKey, apiSecret } = await loadTwitterAppCredentials();
  if (!apiKey.trim() || !apiSecret.trim()) {
    return null;
  }

  const basicAuth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
  const response = await fetch(X_OAUTH_BASE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      Accept: 'application/json',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => null)) as
    | { token_type?: string; access_token?: string; errors?: Array<{ detail?: string; message?: string }> }
    | null;

  if (!response.ok || !payload?.access_token) {
    const message =
      payload?.errors?.[0]?.detail ||
      payload?.errors?.[0]?.message ||
      '无法通过 API Key / API Secret 换取 Twitter Bearer Token。';
    throw new AppRouteError(response.status || 502, 'TWITTER_TOKEN_EXCHANGE_FAILED', message);
  }

  await saveTwitterBearerToken(payload.access_token);
  return payload.access_token;
}

async function getBearerToken(config: TwitterConfig) {
  const token = config.bearerToken.trim();
  if (token) return token;

  const generated = await generateBearerTokenFromAppCredentials();
  if (generated) return generated;

  throw new AppRouteError(400, 'MISSING_TWITTER_TOKEN', '缺少 Twitter Bearer Token。');
}

async function requestXApi<T>(path: string, config: TwitterConfig, params?: Record<string, string>) {
  let bearerToken = await getBearerToken(config);
  const url = new URL(`${X_API_BASE_URL}${path}`);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  let response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  let payload = (await response.json().catch(() => null)) as T & XApiErrorPayload | null;

  if (response.status === 401) {
    const regenerated = await generateBearerTokenFromAppCredentials();
    if (regenerated && regenerated !== bearerToken) {
      bearerToken = regenerated;
      response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${bearerToken}`,
          Accept: 'application/json',
        },
        cache: 'no-store',
      });
      payload = (await response.json().catch(() => null)) as T & XApiErrorPayload | null;
    }
  }

  if (!response.ok || !payload) {
    const message =
      payload?.errors?.[0]?.detail ||
      payload?.errors?.[0]?.message ||
      payload?.detail ||
      payload?.title ||
      '调用 Twitter/X API 失败。';

    throw new AppRouteError(response.status || 502, 'TWITTER_API_REQUEST_FAILED', message);
  }

  return payload;
}

export async function getTwitterUserByUsername(username: string, config: TwitterConfig): Promise<TwitterUserProfile> {
  const payload = await requestXApi<XUserLookupResponse>(
    `/users/by/username/${encodeURIComponent(username)}`,
    config,
    {
      'user.fields': 'description,profile_image_url,verified',
    },
  );

  if (!payload.data) {
    throw new AppRouteError(404, 'TWITTER_USER_NOT_FOUND', '未找到对应的 Twitter 用户。');
  }

  return {
    id: payload.data.id,
    name: payload.data.name,
    username: payload.data.username,
    description: payload.data.description ?? '',
    avatarUrl: payload.data.profile_image_url,
    verified: payload.data.verified,
  };
}

export async function getTwitterUserTweets(userId: string, config: TwitterConfig, maxResults = 10): Promise<Tweet[]> {
  const payload = await requestXApi<XUserTweetsResponse>(`/users/${encodeURIComponent(userId)}/tweets`, config, {
    max_results: String(Math.max(5, Math.min(50, maxResults))),
    exclude: 'retweets,replies',
    'tweet.fields': 'created_at',
  });

  return (payload.data ?? []).map((tweet) => ({
    id: tweet.id,
    text: tweet.text,
    createdAt: tweet.created_at ?? new Date().toISOString(),
  }));
}

export async function previewTwitterUserTimeline(params: {
  username: string;
  maxResults?: number;
  twitterConfig: TwitterConfig;
}): Promise<TwitterPreviewResult> {
  const profile = await getTwitterUserByUsername(params.username, params.twitterConfig);
  const tweets = await getTwitterUserTweets(profile.id, params.twitterConfig, params.maxResults ?? 10);
  return { profile, tweets };
}

export async function validateTwitterCredentials(config: TwitterConfig) {
  await getTwitterUserByUsername('xdevelopers', config);
  return { ok: true };
}
