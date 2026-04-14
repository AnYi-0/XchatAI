'use client';

import { create } from 'zustand';
import type { AIConfig, AIProvider, ConfigSecretStatus, ServerConfigSnapshot, TwitterConfig } from '@/lib/types/xchatai';

export const AI_PROVIDER_PRESETS: Record<
  AIProvider,
  Pick<AIConfig, 'provider' | 'baseUrl' | 'model' | 'enableThinking' | 'thinkingBudget' | 'thinkingLevel'>
> = {
  openai: {
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4.1-mini',
    enableThinking: false,
    thinkingBudget: '1024',
    thinkingLevel: 'medium',
  },
  claude: {
    provider: 'claude',
    baseUrl: 'https://api.anthropic.com/v1',
    model: 'claude-3-7-sonnet-latest',
    enableThinking: false,
    thinkingBudget: '2048',
    thinkingLevel: 'medium',
  },
  gemini: {
    provider: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    model: 'gemini-2.5-flash',
    enableThinking: false,
    thinkingBudget: '1024',
    thinkingLevel: 'medium',
  },
  qwen: {
    provider: 'qwen',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-plus',
    enableThinking: false,
    thinkingBudget: '1024',
    thinkingLevel: 'medium',
  },
};

export const DEFAULT_AI_CONFIG: AIConfig = {
  ...AI_PROVIDER_PRESETS.openai,
  apiKey: '',
  temperature: '0.7',
  maxTokens: '2048',
};

export const DEFAULT_TWITTER_CONFIG: TwitterConfig = {
  bearerToken: '',
  apiKey: '',
  apiSecret: '',
};

type ConfigState = {
  aiConfig: AIConfig;
  twitterConfig: TwitterConfig;
  hasHydrated: boolean;
  secretStatus: ConfigSecretStatus;
  setAiConfig: (patch: Partial<AIConfig>) => void;
  setTwitterConfig: (patch: Partial<TwitterConfig>) => void;
  setHasHydrated: (hasHydrated: boolean) => void;
  applyServerConfig: (snapshot: ServerConfigSnapshot) => void;
};

const EMPTY_SECRET_STATUS: ConfigSecretStatus = {
  aiApiKeySet: false,
  twitterBearerTokenSet: false,
  twitterApiKeySet: false,
  twitterApiSecretSet: false,
  twitterAccessTokenSet: false,
  twitterAccessSecretSet: false,
};

export const useConfigStore = create<ConfigState>((set) => ({
  aiConfig: DEFAULT_AI_CONFIG,
  twitterConfig: DEFAULT_TWITTER_CONFIG,
  hasHydrated: false,
  secretStatus: EMPTY_SECRET_STATUS,
  setAiConfig: (patch) =>
    set((state) => ({
      aiConfig: { ...state.aiConfig, ...patch },
    })),
  setTwitterConfig: (patch) =>
    set((state) => ({
      twitterConfig: { ...state.twitterConfig, ...patch },
    })),
  setHasHydrated: (hasHydrated) => set({ hasHydrated }),
  applyServerConfig: (snapshot) =>
    set((state) => ({
      hasHydrated: true,
      secretStatus: snapshot.secretStatus,
      aiConfig: {
        ...state.aiConfig,
        ...snapshot.aiConfig,
        apiKey: '',
      },
      twitterConfig: {
        ...state.twitterConfig,
        ...snapshot.twitterConfig,
        bearerToken: '',
        apiKey: '',
        apiSecret: '',
        accessToken: '',
        accessSecret: '',
      },
    })),
}));
