import type { ChatResponseData, ConversationDetail, ConversationListPage, SendMessageInput } from '@/lib/types/xchatai';
import { ClientApiError, requestJson } from './http-client';

export async function fetchConversationSummaries(params?: { offset?: number; limit?: number }) {
  const searchParams = new URLSearchParams();
  if (params?.offset != null) searchParams.set('offset', String(params.offset));
  if (params?.limit != null) searchParams.set('limit', String(params.limit));
  const query = searchParams.toString();
  return requestJson<ConversationListPage>(`/api/conversations${query ? `?${query}` : ''}`);
}

export async function fetchConversationDetail(
  conversationId: string,
  params?: { offset?: number; limit?: number },
) {
  const searchParams = new URLSearchParams();
  if (params?.offset != null) searchParams.set('offset', String(params.offset));
  if (params?.limit != null) searchParams.set('limit', String(params.limit));
  const query = searchParams.toString();
  return requestJson<ConversationDetail>(`/api/conversations/${conversationId}${query ? `?${query}` : ''}`);
}

export async function createConversationRequest(username: string) {
  return requestJson<ConversationDetail>('/api/conversations', {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
}

export async function deleteConversationRequest(conversationId: string) {
  return requestJson<{ ok: true; conversationId: string }>(`/api/conversations/${conversationId}`, {
    method: 'DELETE',
  });
}

export async function sendConversationMessageRequest(conversationId: string, payload: SendMessageInput) {
  return requestJson<ChatResponseData>(`/api/conversations/${conversationId}/chat`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

type StreamHandlers = {
  onUserMessage: (message: ChatResponseData['userMessage']) => void;
  onAssistantMessage: (message: ChatResponseData['assistantMessage']) => void;
  onTextDelta: (assistantMessageId: string, delta: string) => void;
  onError: (message: string) => void;
};

function redirectToLogin(path?: string) {
  if (typeof window === 'undefined') return;

  const current = `${window.location.pathname}${window.location.search}`;
  const loginPath =
    path ||
    `/login?from=${encodeURIComponent(current && current !== '/login' ? current : '/')}`;

  window.location.replace(loginPath);
}

export async function streamConversationMessageRequest(
  conversationId: string,
  payload: SendMessageInput,
  handlers: StreamHandlers,
) {
  const response = await fetch(`/api/conversations/${conversationId}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  if (!response.ok || !response.body) {
    const payload = (await response.json().catch(() => null)) as
      | { success: false; errorCode: string; error: string; redirectTo?: string }
      | null;

    if (payload?.errorCode === 'UNAUTHORIZED') {
      redirectToLogin(payload.redirectTo);
    }

    throw new ClientApiError(
      payload?.errorCode ?? 'REQUEST_FAILED',
      payload?.error ?? '流式请求失败。',
      response.status || 500,
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const emitEvent = (eventName: string, data: string) => {
    const payload = JSON.parse(data) as
      | { success: true; data: unknown }
      | { success: false; errorCode: string; error: string };

    if (payload.success === false) {
      handlers.onError(payload.error);
      return;
    }

    switch (eventName) {
      case 'user-message':
        handlers.onUserMessage(payload.data as ChatResponseData['userMessage']);
        break;
      case 'assistant-message':
        handlers.onAssistantMessage(payload.data as ChatResponseData['assistantMessage']);
        break;
      case 'text-delta': {
        const chunk = payload.data as { id: string; delta: string };
        handlers.onTextDelta(chunk.id, chunk.delta);
        break;
      }
      case 'error':
        handlers.onError(
          'error' in payload && typeof payload.error === 'string' ? payload.error : '流式请求失败。',
        );
        break;
      default:
        break;
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');

    while (true) {
      const separatorIndex = buffer.indexOf('\n\n');
      if (separatorIndex === -1) break;

      const part = buffer.slice(0, separatorIndex);
      buffer = buffer.slice(separatorIndex + 2);

      const lines = part.split('\n');
      const eventLine = lines.find((line) => line.startsWith('event:'));
      const dataLines = lines.filter((line) => line.startsWith('data:'));
      if (!eventLine || dataLines.length === 0) continue;

      const eventName = eventLine.replace('event:', '').trim();
      const dataText = dataLines.map((line) => line.replace('data:', '').trim()).join('\n');

      try {
        emitEvent(eventName, dataText);
      } catch {
        buffer = `${part}\n\n${buffer}`;
        break;
      }
    }
  }
}
