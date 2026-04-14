'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useConversationWorkspace } from '@/lib/hooks/use-conversation-workspace';
import { validateAiConfigRequest } from '@/lib/services/ai-client';
import { logoutRequest } from '@/lib/services/auth-client';
import { fetchServerConfigRequest, saveServerConfigRequest } from '@/lib/services/config-client';
import { validateTwitterConfigRequest } from '@/lib/services/twitter-client';
import { useWorkspaceUiStore } from '@/lib/store/ui-store';
import { useConfigStore } from '@/lib/store/config-store';
import { ConfigDialog } from './config-dialog';
import { SessionList } from './session-list';
import { ChatWindow } from './chat-window';

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function WorkspaceClient() {
  const router = useRouter();
  const {
    filteredSummaries,
    activeConversation,
    composer,
    setComposer,
    quotedTweetId,
    setQuotedTweetId,
    loading,
    loadingConversation,
    loadingOlderMessages,
    loadMoreSummaries,
    loadOlderMessages,
    summariesHasMore,
    loadingMoreSummaries,
    sending,
    creatingConversation,
    deletingConversationId,
    error,
    query,
    setQuery,
    selectedConversationId,
    setSelectedConversationId,
    createConversation,
    removeConversation,
    sendMessage,
  } = useConversationWorkspace();

  const isConfigOpen = useWorkspaceUiStore((state) => state.isConfigOpen);
  const setConfigOpen = useWorkspaceUiStore((state) => state.setConfigOpen);
  const theme = useWorkspaceUiStore((state) => state.theme);
  const setTheme = useWorkspaceUiStore((state) => state.setTheme);
  const aiConfig = useConfigStore((state) => state.aiConfig);
  const twitterConfig = useConfigStore((state) => state.twitterConfig);
  const secretStatus = useConfigStore((state) => state.secretStatus);
  const configHydrated = useConfigStore((state) => state.hasHydrated);
  const applyServerConfig = useConfigStore((state) => state.applyServerConfig);
  const setConfigHydrated = useConfigStore((state) => state.setHasHydrated);
  const [configStatus, setConfigStatus] = useState<string | null>(null);
  const [newConversationUsername, setNewConversationUsername] = useState('');
  const [newConversationOpen, setNewConversationOpen] = useState(false);
  const twitterConfigured = Boolean(
    twitterConfig.bearerToken.trim() || secretStatus.twitterBearerTokenSet,
  );
  const aiConfigured = Boolean(
    aiConfig.baseUrl.trim() && aiConfig.model.trim() && (aiConfig.apiKey.trim() || secretStatus.aiApiKeySet),
  );
  const themeOptions = [
    { value: 'light', label: '浅色' },
    { value: 'dark', label: '深色' },
    { value: 'system', label: '跟随系统' },
  ] as const;

  useEffect(() => {
    let active = true;

    const loadServerConfig = async () => {
      try {
        const snapshot = await fetchServerConfigRequest();
        if (!active) return;
        applyServerConfig(snapshot);
      } catch (requestError) {
        if (!active) return;
        setConfigStatus(requestError instanceof Error ? requestError.message : '加载服务端配置失败。');
        setConfigHydrated(true);
      }
    };

    void loadServerConfig();

    return () => {
      active = false;
    };
  }, [applyServerConfig, setConfigHydrated]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const useDark = theme === 'dark' || (theme === 'system' && media.matches);
    document.documentElement.classList.toggle('dark', useDark);
  }, [theme]);

  useEffect(() => {
    if (!configHydrated) return;
    if (!twitterConfigured || !aiConfigured) {
      setConfigOpen(true);
    }
  }, [aiConfigured, configHydrated, setConfigOpen, twitterConfigured]);

  const testTwitterConfig = async () => {
    try {
      await validateTwitterConfigRequest(twitterConfig);
      setConfigStatus('Twitter 接口验证成功。');
    } catch (requestError) {
      setConfigStatus(requestError instanceof Error ? requestError.message : 'Twitter 验证失败。');
    }
  };

  const testAiConfig = async () => {
    try {
      await validateAiConfigRequest(aiConfig);
      setConfigStatus('AI 接口验证成功。');
    } catch (requestError) {
      setConfigStatus(requestError instanceof Error ? requestError.message : 'AI 验证失败。');
    }
  };

  const saveAllConfig = () => {
    void (async () => {
      try {
        const snapshot = await saveServerConfigRequest({ aiConfig, twitterConfig });
        applyServerConfig(snapshot);
        setConfigStatus('配置已保存到服务端 .env 文件。');
        setConfigOpen(false);
      } catch (requestError) {
        setConfigStatus(requestError instanceof Error ? requestError.message : '保存配置失败。');
        setConfigOpen(true);
      }
    })();
  };

  const handleLogout = () => {
    void (async () => {
      try {
        await logoutRequest();
      } finally {
        router.replace('/login');
        router.refresh();
      }
    })();
  };

  const handleCreateConversation = async () => {
    const username = newConversationUsername.trim().replace(/^@/, '');
    if (!username) {
      setConfigStatus('请输入 Twitter 账号。');
      return;
    }

    try {
      await createConversation(username);
      setNewConversationUsername('');
      setNewConversationOpen(false);
    } catch {
      // error state already handled in hook
    }
  };

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-gradient-to-b from-slate-50 to-slate-100 text-foreground dark:from-slate-950 dark:to-slate-900">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/5 top-0 h-80 w-80 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/5 h-80 w-80 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <header className="relative z-20 mx-auto flex w-full max-w-[1440px] shrink-0 flex-col gap-3 px-4 pb-2 pt-3 md:px-6">
        <div className="flex flex-col gap-3 rounded-[24px] border border-white/60 bg-white/75 p-3 shadow-lg shadow-black/5 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70 dark:shadow-black/30 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="XchatAI" className="size-10 rounded-2xl object-cover shadow-lg shadow-violet-500/20" />
            <h1 className="text-lg font-semibold text-foreground">XchatAI</h1>
          </div>

          <div className="flex flex-1 flex-col gap-2 lg:max-w-3xl lg:flex-row lg:items-center lg:justify-end">
            <button
              type="button"
              onClick={() => {
                setConfigStatus(null);
                setConfigOpen(true);
              }}
              className={cn(
                'inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium shadow-sm transition',
                twitterConfigured && aiConfigured
                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300'
                  : 'border-primary/20 bg-primary/10 text-primary hover:bg-primary/15',
              )}
            >
              <span
                className={cn(
                  'inline-block size-2 rounded-full',
                  twitterConfigured && aiConfigured ? 'bg-emerald-500' : 'bg-primary',
                )}
              />
              配置
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-2xl border border-border/70 bg-background/80 px-4 py-2 text-sm font-medium text-muted-foreground shadow-sm transition hover:text-foreground"
            >
              退出登录
            </button>

            <div className="flex items-center gap-1 rounded-full bg-slate-100/80 p-1 dark:bg-slate-800/90">
              {themeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTheme(option.value)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                    theme === option.value
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex min-h-0 w-full max-w-[1440px] flex-1 flex-col px-4 pb-3 md:px-6">
        <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="min-h-0 overflow-hidden rounded-[26px] border border-white/60 bg-white/80 shadow-2xl shadow-black/5 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80 dark:shadow-black/30">
            <div className="flex h-full min-h-0 flex-col">
              <div className="border-b border-border/70 px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <p className="shrink-0 text-sm font-semibold leading-9 text-foreground/80">
                    会话列表
                  </p>
                  <label className="flex h-9 flex-1 items-center rounded-2xl border border-border/70 bg-background/80 px-3.5">
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="搜索昵称或 @账号"
                      className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
                    />
                  </label>
                </div>
              </div>
              <div
                className="min-h-0 flex-1 overflow-y-auto p-2.5"
                onScroll={(event) => {
                  const element = event.currentTarget;
                  if (
                    summariesHasMore &&
                    !loadingMoreSummaries &&
                    element.scrollTop + element.clientHeight >= element.scrollHeight - 80
                  ) {
                    void loadMoreSummaries();
                  }
                }}
              >
                {loading ? (
                  <div className="rounded-3xl border border-dashed border-border/70 px-4 py-6 text-center text-sm leading-7 text-muted-foreground">
                    正在加载会话...
                  </div>
                ) : (
                  <>
                    <SessionList
                      sessions={filteredSummaries}
                      selectedConversationId={selectedConversationId}
                      onSelect={setSelectedConversationId}
                      onDelete={(conversationId) => void removeConversation(conversationId)}
                      deletingConversationId={deletingConversationId}
                      emptyText="没有匹配的会话。"
                    />
                    {loadingMoreSummaries ? (
                      <div className="px-3 py-3 text-center text-xs text-muted-foreground">正在加载更多会话...</div>
                    ) : null}
                  </>
                )}
              </div>
              <div className="border-t border-border/70 p-2.5">
                {newConversationOpen ? (
                  <div className="rounded-[18px] border border-border/70 bg-background/75 p-3">
                    <input
                      value={newConversationUsername}
                      onChange={(event) => setNewConversationUsername(event.target.value)}
                      placeholder="输入 @twitter账号"
                      className="h-10 w-full rounded-2xl border border-border/70 bg-background/80 px-3.5 text-sm outline-none"
                    />
                    <div className="mt-3 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setNewConversationOpen(false);
                          setNewConversationUsername('');
                        }}
                        className="rounded-2xl border border-border/70 px-3 py-2 text-sm text-muted-foreground transition hover:text-foreground"
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleCreateConversation()}
                        disabled={creatingConversation}
                        className="rounded-2xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-70"
                      >
                        {creatingConversation ? '添加中...' : '新增会话'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setNewConversationOpen(true)}
                    className="w-full rounded-[18px] border border-dashed border-border/70 px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
                  >
                    + 新增会话
                  </button>
                )}
              </div>
            </div>
          </aside>

          <section className="min-h-0 overflow-hidden rounded-[26px] border border-white/60 bg-white/80 shadow-2xl shadow-black/5 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80 dark:shadow-black/30">
            <ChatWindow
              conversation={activeConversation}
              loadingConversation={loadingConversation}
              composer={composer}
              onComposerChange={setComposer}
              quotedTweetId={quotedTweetId}
              onQuoteTweet={setQuotedTweetId}
              onSend={sendMessage}
              hasMoreMessages={Boolean(activeConversation?.hasMore)}
              loadingOlderMessages={loadingOlderMessages}
              onLoadOlderMessages={loadOlderMessages}
              sending={sending}
              error={error}
            />
          </section>
        </div>
      </main>

      <ConfigDialog
        open={isConfigOpen}
        dismissible={twitterConfigured && aiConfigured}
        status={configStatus}
        onClose={() => setConfigOpen(false)}
        onTestTwitter={testTwitterConfig}
        onTestAi={testAiConfig}
        onSave={saveAllConfig}
      />
    </div>
  );
}
