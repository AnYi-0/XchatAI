import type { AIConfig, SendMessageInput, TwitterConfig } from '@/lib/types/xchatai';
import { AppRouteError } from '@/lib/server/api/http-error';

function asObject(value: unknown, errorCode: string, message: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AppRouteError(400, errorCode, message);
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown, errorCode: string, message: string) {
  if (typeof value !== 'string') {
    throw new AppRouteError(400, errorCode, message);
  }
  return value;
}

export function parseLoginPayload(body: unknown) {
  const data = asObject(body, 'INVALID_BODY', '请求体格式错误。');
  const username = asString(data.username, 'INVALID_USERNAME', '用户名格式错误。').trim();
  const password = asString(data.password, 'INVALID_PASSWORD', '密码格式错误。').trim();

  if (!username || !password) {
    throw new AppRouteError(400, 'EMPTY_CREDENTIALS', '用户名和密码不能为空。');
  }

  return { username, password };
}

function parseAiConfig(value: unknown): AIConfig {
  const data = asObject(value, 'INVALID_AI_CONFIG', 'AI 配置格式错误。');
  const provider =
    data.provider === 'claude' || data.provider === 'gemini' || data.provider === 'qwen'
      ? data.provider
      : 'openai';
  return {
    provider,
    baseUrl: asString(data.baseUrl, 'INVALID_AI_BASE_URL', 'AI Base URL 格式错误。'),
    apiKey: typeof data.apiKey === 'string' ? data.apiKey : '',
    model: asString(data.model, 'INVALID_AI_MODEL', 'AI 模型格式错误。'),
    temperature: typeof data.temperature === 'string' ? data.temperature : '0.7',
    maxTokens: typeof data.maxTokens === 'string' ? data.maxTokens : '2048',
    enableThinking: typeof data.enableThinking === 'boolean' ? data.enableThinking : false,
    thinkingBudget: typeof data.thinkingBudget === 'string' ? data.thinkingBudget : '1024',
    thinkingLevel:
      data.thinkingLevel === 'minimal' ||
      data.thinkingLevel === 'low' ||
      data.thinkingLevel === 'high'
        ? data.thinkingLevel
        : 'medium',
  };
}

function parseTwitterConfig(value: unknown): TwitterConfig {
  const data = asObject(value, 'INVALID_TWITTER_CONFIG', 'Twitter 配置格式错误。');
  return {
    bearerToken: typeof data.bearerToken === 'string' ? data.bearerToken : '',
    apiKey: typeof data.apiKey === 'string' ? data.apiKey : '',
    apiSecret: typeof data.apiSecret === 'string' ? data.apiSecret : '',
  };
}

export function parseChatPayload(body: unknown): SendMessageInput {
  const data = asObject(body, 'INVALID_BODY', '请求体格式错误。');
  const prompt = asString(data.prompt, 'INVALID_PROMPT', '消息格式错误。');
  const quotedTweetId = typeof data.quotedTweetId === 'string' ? data.quotedTweetId : null;

  return {
    prompt,
    quotedTweetId,
    aiConfig: parseAiConfig(data.aiConfig),
    twitterConfig: parseTwitterConfig(data.twitterConfig),
  };
}

export function parseTwitterValidatePayload(body: unknown) {
  const data = asObject(body, 'INVALID_BODY', '请求体格式错误。');
  return {
    twitterConfig: parseTwitterConfig(data.twitterConfig),
  };
}

export function parseAiValidatePayload(body: unknown) {
  const data = asObject(body, 'INVALID_BODY', '请求体格式错误。');
  return {
    aiConfig: parseAiConfig(data.aiConfig),
  };
}

export function parseTwitterPreviewPayload(body: unknown) {
  const data = asObject(body, 'INVALID_BODY', '请求体格式错误。');
  const username = asString(data.username, 'INVALID_USERNAME', 'Twitter 用户名格式错误。')
    .trim()
    .replace(/^@/, '');
  const maxResults =
    typeof data.maxResults === 'number' && Number.isFinite(data.maxResults)
      ? Math.max(5, Math.min(50, Math.floor(data.maxResults)))
      : 10;

  if (!username) {
    throw new AppRouteError(400, 'EMPTY_USERNAME', 'Twitter 用户名不能为空。');
  }

  return {
    username,
    maxResults,
    twitterConfig: parseTwitterConfig(data.twitterConfig),
  };
}

export function parsePaginationParams(searchParams: URLSearchParams, defaults?: { offset?: number; limit?: number }) {
  const offsetRaw = searchParams.get('offset');
  const limitRaw = searchParams.get('limit');
  const offset = offsetRaw ? Number(offsetRaw) : defaults?.offset ?? 0;
  const limit = limitRaw ? Number(limitRaw) : defaults?.limit ?? 15;

  if (!Number.isFinite(offset) || offset < 0) {
    throw new AppRouteError(400, 'INVALID_OFFSET', '分页 offset 参数错误。');
  }

  if (!Number.isFinite(limit) || limit < 1) {
    throw new AppRouteError(400, 'INVALID_LIMIT', '分页 limit 参数错误。');
  }

  return {
    offset: Math.floor(offset),
    limit: Math.floor(limit),
  };
}

export function parseConfigSavePayload(body: unknown) {
  const data = asObject(body, 'INVALID_BODY', '请求体格式错误。');
  return {
    aiConfig: parseAiConfig(data.aiConfig),
    twitterConfig: parseTwitterConfig(data.twitterConfig),
  };
}

export function parseCreateConversationPayload(body: unknown) {
  const data = asObject(body, 'INVALID_BODY', '请求体格式错误。');
  const username = asString(data.username, 'INVALID_USERNAME', 'Twitter 用户名格式错误。')
    .trim()
    .replace(/^@/, '');

  if (!username) {
    throw new AppRouteError(400, 'EMPTY_USERNAME', 'Twitter 用户名不能为空。');
  }

  return { username };
}
