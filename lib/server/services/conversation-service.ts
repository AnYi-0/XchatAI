import { AppRouteError } from '@/lib/server/api/http-error';
import {
  appendMessagesToConversation,
  deleteStoredConversation,
  getStoredConversationDetail,
  listStoredConversations,
  upsertConversationFromTwitterPreview,
} from '@/lib/server/storage/conversation-file-store';
import { loadFullServerConfig } from '@/lib/server/services/secure-config-service';
import { getConversationAiReply, streamConversationAiReply } from '@/lib/server/services/ai-service';
import { previewTwitterUser } from '@/lib/server/services/twitter-service';
import type { ChatMessage, ChatResponseData, SendMessageInput } from '@/lib/types/xchatai';

export async function listConversations(params?: { offset?: number; limit?: number }) {
  return listStoredConversations(params);
}

export async function getConversationDetail(
  conversationId: string,
  params?: { offset?: number; limit?: number },
) {
  return getStoredConversationDetail(conversationId, params);
}

export async function createConversationFromTwitterUsername(username: string) {
  const { twitterConfig } = await loadFullServerConfig();
  const preview = await previewTwitterUser({
    username,
    maxResults: 50,
    twitterConfig,
  });

  await upsertConversationFromTwitterPreview(preview);
  return getConversationDetail(preview.profile.id, { offset: 0, limit: 100 });
}

export async function deleteConversation(conversationId: string) {
  return deleteStoredConversation(conversationId);
}

export async function sendConversationMessage(conversationId: string, input: SendMessageInput): Promise<ChatResponseData> {
  if (!input.prompt.trim()) {
    throw new AppRouteError(400, 'INVALID_PROMPT', '消息内容不能为空。');
  }

  const conversation = await getConversationDetail(conversationId);
  const { aiConfig } = await loadFullServerConfig();
  const quotedTweetMessage = input.quotedTweetId
    ? conversation.messages.find((message) => message.id === input.quotedTweetId && message.role === 'tweet') ?? null
    : null;
  const quotedTweet = quotedTweetMessage
    ? {
        id: quotedTweetMessage.tweetId ?? quotedTweetMessage.id,
        text: quotedTweetMessage.content,
        createdAt: quotedTweetMessage.createdAt,
      }
    : null;

  const userMessage = {
    id: `${conversationId}-user-${Date.now()}`,
    role: 'user' as const,
    content: input.prompt.trim(),
    createdAt: new Date().toISOString(),
    citedTweetId: quotedTweet?.id ?? null,
  };

  const assistantMessage = {
    id: `${conversationId}-assistant-${Date.now() + 1}`,
    role: 'assistant' as const,
    content: await getConversationAiReply({
      conversation,
      prompt: input.prompt.trim(),
      aiConfig,
      quotedTweet,
    }),
    createdAt: new Date().toISOString(),
    citedTweetId: quotedTweet?.id ?? null,
  };

  return {
    userMessage,
    assistantMessage,
  };
}

function encodeSseEvent(event: string, payload: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
}

export async function streamConversationMessage(conversationId: string, input: SendMessageInput) {
  if (!input.prompt.trim()) {
    throw new AppRouteError(400, 'INVALID_PROMPT', '消息内容不能为空。');
  }

  const conversation = await getConversationDetail(conversationId);
  const { aiConfig } = await loadFullServerConfig();
  const quotedTweetMessage = input.quotedTweetId
    ? conversation.messages.find((message) => message.id === input.quotedTweetId && message.role === 'tweet') ?? null
    : null;
  const quotedTweet = quotedTweetMessage
    ? {
        id: quotedTweetMessage.tweetId ?? quotedTweetMessage.id,
        text: quotedTweetMessage.content,
        createdAt: quotedTweetMessage.createdAt,
      }
    : null;

  const userMessage = {
    id: `${conversationId}-user-${Date.now()}`,
    role: 'user' as const,
    content: input.prompt.trim(),
    createdAt: new Date().toISOString(),
    citedTweetId: quotedTweet?.id ?? null,
  };

  const assistantMessage = {
    id: `${conversationId}-assistant-${Date.now() + 1}`,
    role: 'assistant' as const,
    content: '',
    createdAt: new Date().toISOString(),
    citedTweetId: quotedTweet?.id ?? null,
  };

  const textStream = streamConversationAiReply({
    conversation,
    prompt: input.prompt.trim(),
    aiConfig,
    quotedTweet,
  });

  const encoder = new TextEncoder();
  const iterator = textStream[Symbol.asyncIterator]();
  let assistantContent = '';

  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(
        encoder.encode(encodeSseEvent('user-message', { success: true, data: userMessage })),
      );
      controller.enqueue(
        encoder.encode(encodeSseEvent('assistant-message', { success: true, data: assistantMessage })),
      );
    },
    async pull(controller) {
      try {
        const next = await iterator.next();

        if (next.done) {
          const messagesToPersist: ChatMessage[] = [
            userMessage,
            {
              ...assistantMessage,
              content: assistantContent,
            },
          ];
          await appendMessagesToConversation(conversationId, messagesToPersist);
          controller.enqueue(
            encoder.encode(encodeSseEvent('done', { success: true, data: { id: assistantMessage.id } })),
          );
          controller.close();
          return;
        }

        controller.enqueue(
          encoder.encode(
            encodeSseEvent('text-delta', {
              success: true,
              data: { id: assistantMessage.id, delta: next.value },
            }),
          ),
        );
        assistantContent += next.value;
      } catch (error) {
        const appError =
          error instanceof AppRouteError
            ? error
            : new AppRouteError(500, 'AI_STREAM_ERROR', error instanceof Error ? error.message : '流式生成失败。');

        controller.enqueue(
          encoder.encode(
            encodeSseEvent('error', {
              success: false,
              errorCode: appError.errorCode,
              error: appError.message,
            }),
          ),
        );
        controller.close();
      }
    },
  });
}
