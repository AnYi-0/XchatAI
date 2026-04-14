'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createConversationRequest,
  deleteConversationRequest,
  fetchConversationDetail,
  fetchConversationSummaries,
  streamConversationMessageRequest,
} from '@/lib/services/conversation-client';
import { useConfigStore } from '@/lib/store/config-store';
import { useWorkspaceUiStore } from '@/lib/store/ui-store';
import type { ConversationDetail, ConversationSummary } from '@/lib/types/xchatai';

const SESSION_PAGE_SIZE = 15;
const MESSAGE_PAGE_SIZE = 100;

function updateConversationSummary(
  summaries: ConversationSummary[],
  conversationId: string,
  patch: Partial<ConversationSummary>,
) {
  const next = summaries.map((summary) =>
    summary.id === conversationId ? { ...summary, ...patch } : summary,
  );

  const target = next.find((summary) => summary.id === conversationId);
  const others = next.filter((summary) => summary.id !== conversationId);
  return target ? [target, ...others] : next;
}

export function useConversationWorkspace() {
  const selectedConversationId = useWorkspaceUiStore((state) => state.selectedConversationId);
  const setSelectedConversationId = useWorkspaceUiStore((state) => state.setSelectedConversationId);
  const query = useWorkspaceUiStore((state) => state.query);
  const setQuery = useWorkspaceUiStore((state) => state.setQuery);
  const setConfigOpen = useWorkspaceUiStore((state) => state.setConfigOpen);
  const aiConfig = useConfigStore((state) => state.aiConfig);
  const twitterConfig = useConfigStore((state) => state.twitterConfig);

  const [summaries, setSummaries] = useState<ConversationSummary[]>([]);
  const [summariesNextOffset, setSummariesNextOffset] = useState<number | null>(0);
  const [summariesHasMore, setSummariesHasMore] = useState(true);
  const [loadingMoreSummaries, setLoadingMoreSummaries] = useState(false);
  const [conversationCache, setConversationCache] = useState<Record<string, ConversationDetail>>({});
  const [activeConversation, setActiveConversation] = useState<ConversationDetail | null>(null);
  const [composer, setComposer] = useState('');
  const [quotedTweetId, setQuotedTweetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [deletingConversationId, setDeletingConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSummaries = useCallback(
    async (mode: 'reset' | 'append' = 'reset') => {
      const offset = mode === 'append' ? summariesNextOffset ?? summaries.length : 0;
      if (mode === 'append' && (!summariesHasMore || offset == null)) {
        return;
      }

      try {
        if (mode === 'append') {
          setLoadingMoreSummaries(true);
        } else {
          setLoading(true);
        }

        const page = await fetchConversationSummaries({ offset, limit: SESSION_PAGE_SIZE });
        setSummaries((previous) => (mode === 'append' ? [...previous, ...page.items] : page.items));
        setSummariesHasMore(page.hasMore);
        setSummariesNextOffset(page.nextOffset);

        if (!useWorkspaceUiStore.getState().selectedConversationId && page.items[0]) {
          setSelectedConversationId(page.items[0].id);
        }
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : '加载会话失败。');
      } finally {
        setLoading(false);
        setLoadingMoreSummaries(false);
      }
    },
    [setSelectedConversationId, summaries.length, summariesHasMore, summariesNextOffset],
  );

  const loadConversation = useCallback(
    async (conversationId: string, options?: { force?: boolean; appendHistory?: boolean }) => {
      const force = options?.force ?? false;
      const appendHistory = options?.appendHistory ?? false;
      const cachedConversation = conversationCache[conversationId];

      if (!force && !appendHistory && cachedConversation) {
        setActiveConversation(cachedConversation);
        setQuotedTweetId(null);
        setLoadingConversation(false);
        return;
      }

      try {
        if (appendHistory) {
          if (!cachedConversation?.hasMore || cachedConversation.nextOffset == null) return;
          setLoadingOlderMessages(true);
        } else {
          setLoadingConversation(true);
        }
        setError(null);

        const detail = await fetchConversationDetail(conversationId, {
          offset: appendHistory ? cachedConversation?.nextOffset ?? 0 : 0,
          limit: MESSAGE_PAGE_SIZE,
        });

        const nextConversation = appendHistory && cachedConversation
          ? {
              ...detail,
              messages: [...detail.messages, ...cachedConversation.messages],
            }
          : detail;

        setConversationCache((previous) => ({
          ...previous,
          [conversationId]: nextConversation,
        }));
        setActiveConversation(nextConversation);
        if (!appendHistory) {
          setQuotedTweetId(null);
        }
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : '加载会话详情失败。');
      } finally {
        setLoadingConversation(false);
        setLoadingOlderMessages(false);
      }
    },
    [conversationCache],
  );

  useEffect(() => {
    void loadSummaries('reset');
  }, [loadSummaries]);

  useEffect(() => {
    if (!selectedConversationId) return;
    void loadConversation(selectedConversationId);
  }, [loadConversation, selectedConversationId]);

  const filteredSummaries = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return summaries;
    return summaries.filter((item) => {
      return (
        item.name.toLowerCase().includes(keyword) ||
        item.handle.toLowerCase().includes(keyword) ||
        item.bio.toLowerCase().includes(keyword)
      );
    });
  }, [query, summaries]);

  const sendMessage = useCallback(async () => {
    if (!selectedConversationId || !activeConversation) return;
    if (!composer.trim()) {
      setError('请先输入消息。');
      return;
    }

    try {
      setSending(true);
      const prompt = composer.trim();
      const currentQuotedTweetId = quotedTweetId;
      setComposer('');
      setQuotedTweetId(null);
      setError(null);

      await streamConversationMessageRequest(
        selectedConversationId,
        {
          prompt,
          quotedTweetId: currentQuotedTweetId,
          aiConfig,
          twitterConfig,
        },
        {
          onUserMessage: (userMessage) => {
            setActiveConversation((previous) => {
              if (!previous) return previous;
              return {
                ...previous,
                messages: [...previous.messages, userMessage],
                totalMessages: previous.totalMessages + 1,
              };
            });
            setConversationCache((previous) => {
              const current = previous[selectedConversationId];
              if (!current) return previous;
              return {
                ...previous,
                [selectedConversationId]: {
                  ...current,
                  messages: [...current.messages, userMessage],
                  totalMessages: current.totalMessages + 1,
                  updatedAt: userMessage.createdAt,
                  lastMessagePreview: userMessage.content.slice(0, 120),
                  messageCount: current.messageCount + 1,
                },
              };
            });
            setSummaries((previous) =>
              updateConversationSummary(previous, selectedConversationId, {
                updatedAt: userMessage.createdAt,
                lastMessagePreview: userMessage.content.slice(0, 120),
                messageCount: (activeConversation?.messageCount ?? 0) + 1,
              }),
            );
          },
          onAssistantMessage: (assistantMessage) => {
            setActiveConversation((previous) => {
              if (!previous) return previous;
              return {
                ...previous,
                messages: [...previous.messages, assistantMessage],
                totalMessages: previous.totalMessages + 1,
              };
            });
            setConversationCache((previous) => {
              const current = previous[selectedConversationId];
              if (!current) return previous;
              return {
                ...previous,
                [selectedConversationId]: {
                  ...current,
                  messages: [...current.messages, assistantMessage],
                  totalMessages: current.totalMessages + 1,
                  updatedAt: assistantMessage.createdAt,
                  messageCount: current.messageCount + 1,
                },
              };
            });
          },
          onTextDelta: (assistantMessageId, delta) => {
            setActiveConversation((previous) => {
              if (!previous) return previous;
              return {
                ...previous,
                messages: previous.messages.map((message) =>
                  message.id === assistantMessageId ? { ...message, content: message.content + delta } : message,
                ),
              };
            });
            setConversationCache((previous) => {
              const current = previous[selectedConversationId];
              if (!current) return previous;
              const nextMessages = current.messages.map((message) =>
                message.id === assistantMessageId ? { ...message, content: message.content + delta } : message,
              );
              const assistant = nextMessages.find((message) => message.id === assistantMessageId);
              return {
                ...previous,
                [selectedConversationId]: {
                  ...current,
                  messages: nextMessages,
                  lastMessagePreview: assistant?.content.slice(0, 120) ?? current.lastMessagePreview,
                },
              };
            });
          },
          onError: (message) => {
            setError(message);
          },
        },
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '发送失败。');
    } finally {
      setSending(false);
    }
  }, [activeConversation, aiConfig, composer, quotedTweetId, selectedConversationId, twitterConfig]);

  const refreshConversation = useCallback(async () => {
    if (!selectedConversationId) return;
    await loadConversation(selectedConversationId, { force: true });
  }, [loadConversation, selectedConversationId]);

  const loadMoreSummaries = useCallback(async () => {
    await loadSummaries('append');
  }, [loadSummaries]);

  const loadOlderMessages = useCallback(async () => {
    if (!selectedConversationId) return;
    await loadConversation(selectedConversationId, { appendHistory: true });
  }, [loadConversation, selectedConversationId]);

  const createConversation = useCallback(async (username: string) => {
    try {
      setCreatingConversation(true);
      setError(null);
      const detail = await createConversationRequest(username);
      const summary: ConversationSummary = {
        id: detail.id,
        name: detail.name,
        handle: detail.handle,
        bio: detail.bio,
        avatarSeed: detail.avatarSeed,
        updatedAt: detail.updatedAt,
        lastMessagePreview: detail.lastMessagePreview,
        messageCount: detail.messageCount,
      };

      setSummaries((previous) => {
        const next = previous.filter((item) => item.id !== summary.id);
        return [summary, ...next];
      });
      setConversationCache((previous) => ({
        ...previous,
        [detail.id]: detail,
      }));
      setActiveConversation(detail);
      setSelectedConversationId(detail.id);
      setQuotedTweetId(null);
      return detail;
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : '新增会话失败。';
      setError(message);
      throw requestError;
    } finally {
      setCreatingConversation(false);
    }
  }, [setSelectedConversationId]);

  const removeConversation = useCallback(
    async (conversationId: string) => {
      try {
        setDeletingConversationId(conversationId);
        setError(null);
        await deleteConversationRequest(conversationId);

        setSummaries((previous) => previous.filter((item) => item.id !== conversationId));
        setConversationCache((previous) => {
          const next = { ...previous };
          delete next[conversationId];
          return next;
        });

        const remainingSummaries = summaries.filter((item) => item.id !== conversationId);
        if (selectedConversationId === conversationId) {
          const nextSelectedId = remainingSummaries[0]?.id ?? null;
          setSelectedConversationId(nextSelectedId);
          setActiveConversation(nextSelectedId ? conversationCache[nextSelectedId] ?? null : null);
        }
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : '删除会话失败。');
      } finally {
        setDeletingConversationId(null);
      }
    },
    [conversationCache, selectedConversationId, setSelectedConversationId, summaries],
  );

  return {
    summaries,
    filteredSummaries,
    summariesHasMore,
    loadingMoreSummaries,
    activeConversation,
    composer,
    setComposer,
    quotedTweetId,
    setQuotedTweetId,
    loading,
    loadingConversation,
    loadingOlderMessages,
    sending,
    creatingConversation,
    deletingConversationId,
    error,
    query,
    setQuery,
    selectedConversationId,
    setSelectedConversationId,
    refreshConversation,
    loadMoreSummaries,
    loadOlderMessages,
    createConversation,
    removeConversation,
    sendMessage,
    setConfigOpen,
  };
}
