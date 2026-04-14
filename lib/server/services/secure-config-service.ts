import fs from 'node:fs/promises';
import path from 'node:path';
import { AppRouteError } from '@/lib/server/api/http-error';
import type { AIConfig, AIProvider, ConfigSecretStatus, ServerConfigSnapshot, TwitterConfig } from '@/lib/types/xchatai';

const ENV_FILE_PATH = path.join(process.cwd(), '.env');

const ENV_KEYS = {
  aiProvider: 'XCHATAI_AI_PROVIDER',
  aiBaseUrl: 'XCHATAI_AI_BASE_URL',
  aiApiKey: 'XCHATAI_AI_API_KEY',
  aiModel: 'XCHATAI_AI_MODEL',
  aiTemperature: 'XCHATAI_AI_TEMPERATURE',
  aiMaxTokens: 'XCHATAI_AI_MAX_TOKENS',
  aiEnableThinking: 'XCHATAI_AI_ENABLE_THINKING',
  aiThinkingBudget: 'XCHATAI_AI_THINKING_BUDGET',
  aiThinkingLevel: 'XCHATAI_AI_THINKING_LEVEL',
  twitterBearerToken: 'XCHATAI_TWITTER_BEARER_TOKEN',
  twitterApiKeyLegacy: 'XCHATAI_TWITTER_API_KEY',
  twitterApiSecretLegacy: 'XCHATAI_TWITTER_API_SECRET',
} as const;

const DEFAULT_AI_CONFIG: AIConfig = {
  provider: 'openai',
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4.1-mini',
  temperature: '0.7',
  maxTokens: '2048',
  enableThinking: false,
  thinkingBudget: '1024',
  thinkingLevel: 'medium',
};

function parseEnvValue(raw: string) {
  const value = raw.trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    try {
      return JSON.parse(value.replace(/^'/, '"').replace(/'$/, '"')) as string;
    } catch {
      return value.slice(1, -1);
    }
  }
  return value;
}

function serializeEnvValue(value: string) {
  return JSON.stringify(value ?? '');
}

async function readEnvFile() {
  try {
    return await fs.readFile(ENV_FILE_PATH, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return '';
    }
    throw error;
  }
}

async function writeEnvValues(updates: Record<string, string>) {
  const existing = await readEnvFile();
  const lines = existing ? existing.split(/\r?\n/) : [];
  const written = new Set<string>();

  const nextLines = lines
    .filter((line) => line.length > 0)
    .map((line) => {
      const match = /^([A-Z0-9_]+)=(.*)$/.exec(line);
      if (!match) return line;

      const [, key] = match;
      if (!(key in updates)) return line;
      written.add(key);
      return `${key}=${serializeEnvValue(updates[key])}`;
    });

  for (const [key, value] of Object.entries(updates)) {
    if (!written.has(key)) {
      nextLines.push(`${key}=${serializeEnvValue(value)}`);
    }
  }

  await fs.writeFile(ENV_FILE_PATH, `${nextLines.filter(Boolean).join('\n')}\n`, 'utf8');
}

async function readEnvMap() {
  const content = await readEnvFile();
  const map: Record<string, string> = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1);
    map[key] = parseEnvValue(value);
  }

  return map;
}

function normalizeBoolean(value: string | undefined, fallback: boolean) {
  if (!value) return fallback;
  return value === 'true';
}

export async function loadFullServerConfig() {
  const env = await readEnvMap();
  const rawProvider = env[ENV_KEYS.aiProvider];
  const rawThinkingLevel = env[ENV_KEYS.aiThinkingLevel];
  const provider: AIProvider =
    rawProvider === 'claude' || rawProvider === 'gemini' || rawProvider === 'qwen' || rawProvider === 'openai'
      ? rawProvider
      : 'openai';
  const thinkingLevel: AIConfig['thinkingLevel'] =
    rawThinkingLevel === 'minimal' || rawThinkingLevel === 'low' || rawThinkingLevel === 'high' || rawThinkingLevel === 'medium'
      ? rawThinkingLevel
      : DEFAULT_AI_CONFIG.thinkingLevel;

  const aiConfig: AIConfig = {
    provider,
    baseUrl: env[ENV_KEYS.aiBaseUrl] || DEFAULT_AI_CONFIG.baseUrl,
    apiKey: env[ENV_KEYS.aiApiKey] || '',
    model: env[ENV_KEYS.aiModel] || DEFAULT_AI_CONFIG.model,
    temperature: env[ENV_KEYS.aiTemperature] || DEFAULT_AI_CONFIG.temperature,
    maxTokens: env[ENV_KEYS.aiMaxTokens] || DEFAULT_AI_CONFIG.maxTokens,
    enableThinking: normalizeBoolean(env[ENV_KEYS.aiEnableThinking], DEFAULT_AI_CONFIG.enableThinking),
    thinkingBudget: env[ENV_KEYS.aiThinkingBudget] || DEFAULT_AI_CONFIG.thinkingBudget,
    thinkingLevel,
  };

  const twitterConfig: TwitterConfig = {
    bearerToken: env[ENV_KEYS.twitterBearerToken] || '',
    apiKey: env[ENV_KEYS.twitterApiKeyLegacy] || '',
    apiSecret: env[ENV_KEYS.twitterApiSecretLegacy] || '',
  };

  return { aiConfig, twitterConfig };
}

export async function loadTwitterAppCredentials() {
  const env = await readEnvMap();
  const apiKey = env[ENV_KEYS.twitterApiKeyLegacy] || '';
  const apiSecret = env[ENV_KEYS.twitterApiSecretLegacy] || '';
  return {
    apiKey,
    apiSecret,
  };
}

export async function loadServerConfigSnapshot(): Promise<ServerConfigSnapshot> {
  const { aiConfig, twitterConfig } = await loadFullServerConfig();
  const secretStatus: ConfigSecretStatus = {
    aiApiKeySet: Boolean(aiConfig.apiKey.trim()),
    twitterBearerTokenSet: Boolean(twitterConfig.bearerToken.trim()),
    twitterApiKeySet: false,
    twitterApiSecretSet: false,
    twitterAccessTokenSet: false,
    twitterAccessSecretSet: false,
  };

  return {
    aiConfig: {
      provider: aiConfig.provider,
      baseUrl: aiConfig.baseUrl,
      model: aiConfig.model,
      temperature: aiConfig.temperature,
      maxTokens: aiConfig.maxTokens,
      enableThinking: aiConfig.enableThinking,
      thinkingBudget: aiConfig.thinkingBudget,
      thinkingLevel: aiConfig.thinkingLevel,
    },
    twitterConfig: {
    },
    secretStatus,
  };
}

export async function saveServerConfig(input: { aiConfig: AIConfig; twitterConfig: TwitterConfig }) {
  const current = await loadFullServerConfig();

  const nextAiConfig: AIConfig = {
    ...current.aiConfig,
    provider: input.aiConfig.provider,
    baseUrl: input.aiConfig.baseUrl,
    model: input.aiConfig.model,
    temperature: input.aiConfig.temperature,
    maxTokens: input.aiConfig.maxTokens,
    enableThinking: input.aiConfig.enableThinking,
    thinkingBudget: input.aiConfig.thinkingBudget,
    thinkingLevel: input.aiConfig.thinkingLevel,
    apiKey: input.aiConfig.apiKey.trim() ? input.aiConfig.apiKey : current.aiConfig.apiKey,
  };

  const nextTwitterConfig: TwitterConfig = {
    ...current.twitterConfig,
    bearerToken: input.twitterConfig.bearerToken.trim()
      ? input.twitterConfig.bearerToken
      : current.twitterConfig.bearerToken,
    apiKey: input.twitterConfig.apiKey.trim() ? input.twitterConfig.apiKey : current.twitterConfig.apiKey,
    apiSecret: input.twitterConfig.apiSecret.trim() ? input.twitterConfig.apiSecret : current.twitterConfig.apiSecret,
  };

  await writeEnvValues({
    [ENV_KEYS.aiProvider]: nextAiConfig.provider,
    [ENV_KEYS.aiBaseUrl]: nextAiConfig.baseUrl,
    [ENV_KEYS.aiApiKey]: nextAiConfig.apiKey,
    [ENV_KEYS.aiModel]: nextAiConfig.model,
    [ENV_KEYS.aiTemperature]: nextAiConfig.temperature,
    [ENV_KEYS.aiMaxTokens]: nextAiConfig.maxTokens,
    [ENV_KEYS.aiEnableThinking]: String(nextAiConfig.enableThinking),
    [ENV_KEYS.aiThinkingBudget]: nextAiConfig.thinkingBudget,
    [ENV_KEYS.aiThinkingLevel]: nextAiConfig.thinkingLevel,
    [ENV_KEYS.twitterBearerToken]: nextTwitterConfig.bearerToken,
    [ENV_KEYS.twitterApiKeyLegacy]: nextTwitterConfig.apiKey,
    [ENV_KEYS.twitterApiSecretLegacy]: nextTwitterConfig.apiSecret,
  });

  return loadServerConfigSnapshot();
}

export async function saveTwitterBearerToken(bearerToken: string) {
  await writeEnvValues({
    [ENV_KEYS.twitterBearerToken]: bearerToken,
  });
}

export async function resolveMergedAiConfig(input?: AIConfig) {
  const current = await loadFullServerConfig();
  if (!input) return current.aiConfig;

  return {
    ...current.aiConfig,
    ...input,
    apiKey: input.apiKey.trim() ? input.apiKey : current.aiConfig.apiKey,
  };
}

export async function resolveMergedTwitterConfig(input?: TwitterConfig) {
  const current = await loadFullServerConfig();
  if (!input) return current.twitterConfig;

  return {
    ...current.twitterConfig,
    ...input,
    bearerToken: input.bearerToken.trim() ? input.bearerToken : current.twitterConfig.bearerToken,
    apiKey: input.apiKey.trim() ? input.apiKey : current.twitterConfig.apiKey,
    apiSecret: input.apiSecret.trim() ? input.apiSecret : current.twitterConfig.apiSecret,
  };
}

export async function assertServerConfigReady() {
  const { aiConfig, twitterConfig } = await loadFullServerConfig();
  if (!aiConfig.apiKey.trim()) {
    throw new AppRouteError(400, 'MISSING_AI_API_KEY', '服务端未配置 AI API Key。');
  }
  if (!twitterConfig.bearerToken.trim()) {
    throw new AppRouteError(400, 'MISSING_TWITTER_CREDENTIALS', '服务端未配置 Twitter 凭据。');
  }
}
