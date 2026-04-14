'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage, ConversationDetail } from '@/lib/types/xchatai';
import { AvatarMark } from './avatar-mark';

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function formatRelativeTime(createdAt: string) {
  const deltaMs = Date.now() - new Date(createdAt).getTime();
  const minutes = Math.max(1, Math.floor(deltaMs / (1000 * 60)));
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
}

function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none text-[13px] leading-6 prose-headings:mb-2 prose-headings:mt-4 prose-headings:font-semibold prose-h1:text-lg prose-h2:text-base prose-h3:text-sm prose-p:my-2 prose-p:leading-6 prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground prose-code:rounded-md prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-[12px] prose-code:font-medium prose-code:text-violet-700 prose-code:before:hidden prose-code:after:hidden prose-pre:my-3 prose-pre:overflow-x-auto prose-pre:rounded-2xl prose-pre:border prose-pre:border-white/10 prose-pre:bg-slate-950 prose-pre:p-4 prose-pre:text-slate-100 prose-pre:shadow-inner prose-blockquote:my-3 prose-blockquote:rounded-r-xl prose-blockquote:border-l-4 prose-blockquote:border-violet-400/70 prose-blockquote:bg-violet-500/5 prose-blockquote:px-4 prose-blockquote:py-2 prose-blockquote:text-muted-foreground prose-ul:my-3 prose-ul:list-disc prose-ul:pl-5 prose-ol:my-3 prose-ol:list-decimal prose-ol:pl-5 prose-li:my-1 prose-hr:my-4 prose-hr:border-border prose-table:my-3 prose-table:w-full prose-table:overflow-hidden prose-table:rounded-xl prose-table:border prose-table:border-border/70 prose-thead:bg-slate-100 prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:text-xs prose-th:font-semibold prose-td:px-3 prose-td:py-2 prose-td:text-sm dark:prose-invert dark:prose-code:bg-slate-800/80 dark:prose-code:text-violet-300 dark:prose-blockquote:border-violet-400 dark:prose-blockquote:bg-violet-400/10 dark:prose-thead:bg-slate-800/80">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}

export function ChatWindow(props: {
  conversation: ConversationDetail | null;
  loadingConversation: boolean;
  composer: string;
  onComposerChange: (value: string) => void;
  quotedTweetId: string | null;
  onQuoteTweet: (tweetId: string | null) => void;
  onSend: () => void;
  hasMoreMessages: boolean;
  loadingOlderMessages: boolean;
  onLoadOlderMessages: () => void;
  sending: boolean;
  error: string | null;
}) {
  const {
    conversation,
    loadingConversation,
    composer,
    onComposerChange,
    quotedTweetId,
    onQuoteTweet,
    onSend,
    hasMoreMessages,
    loadingOlderMessages,
    onLoadOlderMessages,
    sending,
    error,
  } = props;
  const messageScrollRef = useRef<HTMLDivElement>(null);
  const messagesContentRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const composerPanelRef = useRef<HTMLDivElement>(null);
  const preserveScrollRef = useRef<{ scrollHeight: number; scrollTop: number } | null>(null);

  const tweetMessages = conversation?.messages.filter((message) => message.role === 'tweet') ?? [];
  const quotedTweet = tweetMessages.find((tweet) => tweet.id === quotedTweetId) ?? null;
  const lastMessageContent = conversation?.messages[conversation.messages.length - 1]?.content ?? '';

  useLayoutEffect(() => {
    const container = messageScrollRef.current;
    if (!container) return;

    if (preserveScrollRef.current) {
      const snapshot = preserveScrollRef.current;
      container.scrollTop = container.scrollHeight - snapshot.scrollHeight + snapshot.scrollTop;
      preserveScrollRef.current = null;
    } else {
      container.scrollTop = container.scrollHeight;
    }
  }, [conversation?.id, conversation?.messages.length, lastMessageContent]);

  useLayoutEffect(() => {
    const textarea = composerRef.current;
    if (!textarea) return;
    textarea.style.height = '0px';
    const nextHeight = Math.min(textarea.scrollHeight, 160);
    textarea.style.height = `${Math.max(nextHeight, 72)}px`;
    textarea.style.overflowY = textarea.scrollHeight > 160 ? 'auto' : 'hidden';
    const container = messageScrollRef.current;
    if (container && !preserveScrollRef.current) {
      container.scrollTop = container.scrollHeight;
    }
  }, [composer]);

  useEffect(() => {
    const panel = composerPanelRef.current;
    const container = messageScrollRef.current;
    if (!panel || !container || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      if (!preserveScrollRef.current) {
        container.scrollTop = container.scrollHeight;
      }
    });
    observer.observe(panel);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const content = messagesContentRef.current;
    const container = messageScrollRef.current;
    if (!content || !container || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => {
      if (!preserveScrollRef.current) {
        container.scrollTop = container.scrollHeight;
      }
    });

    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  if (!conversation) {
    return (
      <div className="grid min-h-[70dvh] place-items-center p-8 text-center text-muted-foreground">
        <div className="max-w-md rounded-[28px] border border-dashed border-border/70 px-8 py-10 text-sm leading-7">
          请先从左侧选择一个会话。
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border/70 bg-gradient-to-r from-white/30 to-transparent px-4 py-3 dark:from-white/5">
        <div className="flex items-center gap-3">
          <div className="relative">
            <AvatarMark seed={conversation.avatarSeed} label={conversation.name} large />
            <span className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-white bg-emerald-400 dark:border-slate-900" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="truncate text-base font-semibold text-foreground">{conversation.name}</h2>
              <span className="truncate text-xs text-muted-foreground">@{conversation.handle}</span>
            </div>
            <p className="mt-1 line-clamp-2 max-w-3xl text-[13px] leading-5 text-muted-foreground/90">
              {conversation.bio}
            </p>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.07),transparent_35%)] px-4 py-3">
        <div className="mx-auto flex h-full max-w-5xl min-h-0 flex-col">
          <div
            ref={messageScrollRef}
            className="min-h-0 flex-1 overflow-y-auto pr-1.5"
            onScroll={(event) => {
              const element = event.currentTarget;
              if (element.scrollTop <= 40 && hasMoreMessages && !loadingOlderMessages) {
                preserveScrollRef.current = {
                  scrollHeight: element.scrollHeight,
                  scrollTop: element.scrollTop,
                };
                onLoadOlderMessages();
              }
            }}
          >
            <div ref={messagesContentRef} className="space-y-3 pb-5">
              {loadingOlderMessages ? (
                <div className="text-center text-xs text-muted-foreground">正在加载更早消息...</div>
              ) : null}
              {loadingConversation ? (
                <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-sm text-muted-foreground">
                  正在加载会话...
                </div>
              ) : null}

              {conversation.messages.map((message: ChatMessage) => {
                const citedTweet = conversation.messages.find(
                  (tweet) => tweet.id === message.citedTweetId && tweet.role === 'tweet',
                ) ?? null;
                const isUser = message.role === 'user';
                const isTweet = message.role === 'tweet';
                const isStreamingPlaceholder = !isUser && !isTweet && sending && message.content.trim().length === 0;

                if (isTweet) {
                  const quoted = message.id === quotedTweetId;
                  return (
                    <div key={message.id} className="flex items-start gap-2.5">
                      <AvatarMark seed={conversation.avatarSeed} label={conversation.name} />
                      <div className="max-w-3xl">
                        <div
                          className={cn(
                            'rounded-[20px] border px-3.5 py-2.5 shadow-sm',
                            quoted
                              ? 'border-primary/25 bg-primary/10 shadow-primary/10'
                              : 'border-slate-200/70 bg-slate-50/85 dark:border-white/10 dark:bg-slate-950/70',
                          )}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <p className="text-[13px] leading-6 whitespace-pre-wrap text-foreground/90">
                                {message.content}
                              </p>
                              <p className="mt-2 text-[10px] text-muted-foreground">
                                @{conversation.handle} · {formatRelativeTime(message.createdAt)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => onQuoteTweet(quoted ? null : message.id)}
                              disabled={sending}
                              className={cn(
                                'shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60',
                                quoted
                                  ? 'border-primary/25 bg-primary text-primary-foreground'
                                  : 'border-border/70 bg-background/80 text-muted-foreground hover:text-foreground',
                              )}
                            >
                              引用此条消息
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={message.id}
                    className={cn('flex items-end gap-2.5', isUser ? 'justify-end' : 'justify-start')}
                  >
                    {!isUser ? <AvatarMark seed="xchatai-assistant" label="XchatAI" /> : null}
                    <div
                      className={cn(
                        'max-w-3xl rounded-[20px] border px-3.5 py-2.5 shadow-sm',
                        isUser
                          ? 'border-primary/25 bg-primary text-primary-foreground shadow-primary/10'
                          : 'border-slate-200/70 bg-slate-50/85 text-foreground dark:border-white/10 dark:bg-slate-950/70',
                      )}
                    >
                      {citedTweet ? (
                        <div
                          className={cn(
                            'mb-3 rounded-2xl border px-3 py-2 text-xs leading-6',
                            isUser
                              ? 'border-white/20 bg-white/10 text-primary-foreground/90'
                              : 'border-border/70 bg-background/70 text-muted-foreground',
                          )}
                        >
                          <span className="font-medium">已引用：</span>
                          {citedTweet.content.split('\n')[0]}
                        </div>
                      ) : null}
                      {isStreamingPlaceholder ? (
                        <div className="flex items-center gap-1.5 py-1">
                          <span className="size-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="size-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="size-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      ) : !isUser ? (
                        <MarkdownMessage content={message.content} />
                      ) : (
                        <p className="text-[13px] leading-6 whitespace-pre-wrap">{message.content}</p>
                      )}
                      <p className={cn('mt-2 text-[10px]', isUser ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                        {isUser ? '我' : 'XchatAI'} · {formatRelativeTime(message.createdAt)}
                      </p>
                    </div>
                    {isUser ? <AvatarMark seed="me" label="我" /> : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div ref={composerPanelRef} className="shrink-0 border-t border-border/70 bg-white/75 px-4 py-3 backdrop-blur dark:bg-slate-900/75">
        {quotedTweet ? (
          <div className="mx-auto mb-2.5 max-w-5xl rounded-3xl border border-primary/20 bg-primary/10 p-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary/80">已引用消息</p>
                <p className="mt-2 text-[13px] leading-6 text-foreground/90">{quotedTweet.content}</p>
              </div>
              <button
                type="button"
                onClick={() => onQuoteTweet(null)}
                className="rounded-full border border-primary/20 bg-white/60 px-3 py-1 text-xs font-medium text-primary dark:bg-slate-900/70"
              >
                取消引用
              </button>
            </div>
          </div>
        ) : null}

        <div className="mx-auto max-w-5xl rounded-[20px] border border-border/70 bg-background/70 p-3">
          <textarea
            ref={composerRef}
            rows={3}
            value={composer}
            disabled={sending}
            onChange={(event) => onComposerChange(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                event.preventDefault();
                onSend();
              }
            }}
            placeholder="输入你的问题，可引用一条消息后发问，也可直接基于最近推文发问…"
            className="min-h-18 max-h-40 w-full resize-none border-0 bg-transparent text-[13px] leading-6 outline-none placeholder:text-muted-foreground/45 disabled:cursor-not-allowed disabled:opacity-70"
          />
          <div className="mt-2.5 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">Ctrl / Cmd + Enter 发送</p>
            <button
              type="button"
              onClick={onSend}
              disabled={sending}
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-2xl bg-primary px-4 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {sending ? '生成中...' : '发送'}
            </button>
          </div>
          {error ? (
            <div className="mt-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
