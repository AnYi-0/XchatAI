import { generateText, streamText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { AppRouteError } from '@/lib/server/api/http-error';
import type { AIConfig, ConversationDetail, Tweet } from '@/lib/types/xchatai';

type GenerateConversationReplyParams = {
  conversation: ConversationDetail;
  prompt: string;
  aiConfig: AIConfig;
  quotedTweet: Tweet | null;
};

function parseNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function createQwenFetch(enableThinking: boolean): typeof fetch {
  return async (input, init) => {
    if (!init?.body || typeof init.body !== 'string') {
      return fetch(input, init);
    }

    try {
      const body = JSON.parse(init.body) as Record<string, unknown>;
      body.enable_thinking = enableThinking;
      return fetch(input, {
        ...init,
        body: JSON.stringify(body),
      });
    } catch {
      return fetch(input, init);
    }
  };
}

function normalizeAiProviderError(error: unknown): never {
  const statusCode =
    typeof error === 'object' && error && 'statusCode' in error && typeof error.statusCode === 'number'
      ? error.statusCode
      : 502;

  const message =
    error instanceof Error
      ? error.message
      : 'AI 提供商调用失败。';

  throw new AppRouteError(statusCode, 'AI_PROVIDER_REQUEST_FAILED', message);
}

function resolveProviderModel(aiConfig: AIConfig) {
  if (!aiConfig.apiKey.trim()) {
    throw new AppRouteError(400, 'MISSING_AI_API_KEY', 'AI API Key 不能为空。');
  }

  if (!aiConfig.model.trim()) {
    throw new AppRouteError(400, 'MISSING_AI_MODEL', 'AI 模型不能为空。');
  }

  switch (aiConfig.provider) {
    case 'claude': {
      const provider = createAnthropic({
        apiKey: aiConfig.apiKey,
        baseURL: aiConfig.baseUrl,
      });
      const providerOptions = aiConfig.enableThinking
        ? {
            anthropic: {
              thinking: {
                type: 'enabled',
                budgetTokens: Math.max(1024, parseNumber(aiConfig.thinkingBudget, 2048)),
              },
            },
          }
        : undefined;
      return {
        model: provider(aiConfig.model),
        providerOptions,
      };
    }
    case 'gemini': {
      const provider = createGoogleGenerativeAI({
        apiKey: aiConfig.apiKey,
        baseURL: aiConfig.baseUrl,
      });
      const providerOptions = aiConfig.enableThinking
        ? {
            google: {
              thinkingConfig: {
                thinkingLevel: aiConfig.thinkingLevel,
                thinkingBudget: Math.max(0, parseNumber(aiConfig.thinkingBudget, 1024)),
                includeThoughts: true,
              },
            },
          }
        : undefined;
      return {
        model: provider(aiConfig.model),
        providerOptions,
      };
    }
    case 'qwen': {
      const provider = createOpenAI({
        apiKey: aiConfig.apiKey,
        baseURL: aiConfig.baseUrl,
        name: 'qwen',
        fetch: createQwenFetch(aiConfig.enableThinking),
      });
      return {
        model: provider.chat(aiConfig.model),
        providerOptions: undefined,
      };
    }
    case 'openai':
    default: {
      const provider = createOpenAI({
        apiKey: aiConfig.apiKey,
        baseURL: aiConfig.baseUrl,
      });
      const providerOptions = aiConfig.enableThinking
        ? {
            openai: {
              reasoningEffort: 'medium',
            },
          }
        : undefined;
      return {
        model: provider.chat(aiConfig.model),
        providerOptions,
      };
    }
  }
}

function buildPrompt(params: GenerateConversationReplyParams) {
  const { conversation, prompt, quotedTweet } = params;
  const recentTweetMessages = conversation.messages
    .filter((message) => message.role === 'tweet')
    .slice(-10)
    .map((message) => ({
      id: message.tweetId ?? message.id,
      text: message.content,
      createdAt: message.createdAt,
    }));
  const recentTweets = quotedTweet
    ? [`引用推文：${quotedTweet.text}`]
    : recentTweetMessages.map((tweet, index) => `推文 ${index + 1}: ${tweet.text}`);

  return [
    `你正在模拟与 Twitter 用户 @${conversation.handle} 的对话。`,
    `用户昵称：${conversation.name}`,
    `用户简介：${conversation.bio}`,
    '',
    ...recentTweets,
    '',
    `用户问题：${prompt}`,
    '',
    '请基于以上上下文，用简洁、自然、可继续追问的中文回答。',
  ].join('\n');
}

export async function generateConversationReply(params: GenerateConversationReplyParams) {
  const { model, providerOptions } = resolveProviderModel(params.aiConfig);
  try {
    const result = await generateText({
      model,
      prompt: buildPrompt(params),
      temperature: parseNumber(params.aiConfig.temperature, 0.7),
      maxOutputTokens: Math.max(128, parseNumber(params.aiConfig.maxTokens, 2048)),
      providerOptions: providerOptions as never,
    });

    return result.text;
  } catch (error) {
    normalizeAiProviderError(error);
  }
}

export function streamConversationReply(params: GenerateConversationReplyParams) {
  const { model, providerOptions } = resolveProviderModel(params.aiConfig);

  try {
    const result = streamText({
      model,
      prompt: buildPrompt(params),
      temperature: parseNumber(params.aiConfig.temperature, 0.7),
      maxOutputTokens: Math.max(128, parseNumber(params.aiConfig.maxTokens, 2048)),
      providerOptions: providerOptions as never,
    });

    return result.textStream;
  } catch (error) {
    normalizeAiProviderError(error);
  }
}

export async function validateAiConfiguration(aiConfig: AIConfig) {
  const { model, providerOptions } = resolveProviderModel(aiConfig);
  try {
    await generateText({
      model,
      prompt: 'Reply with OK only.',
      maxOutputTokens: 16,
      temperature: 0,
      providerOptions: providerOptions as never,
    });
  } catch (error) {
    normalizeAiProviderError(error);
  }

  return { ok: true };
}
