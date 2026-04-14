'use client';

import type { ConversationSummary } from '@/lib/types/xchatai';
import { AvatarMark } from './avatar-mark';

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function SessionList(props: {
  sessions: ConversationSummary[];
  selectedConversationId: string | null;
  onSelect: (conversationId: string) => void;
  onDelete: (conversationId: string) => void;
  deletingConversationId: string | null;
  emptyText: string;
}) {
  const { sessions, selectedConversationId, onSelect, onDelete, deletingConversationId, emptyText } = props;

  return (
    <div className="grid gap-1.5">
      {sessions.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border/70 px-4 py-6 text-center text-sm leading-7 text-muted-foreground">
          {emptyText}
        </div>
      ) : (
        sessions.map((session, index) => {
          const active = session.id === selectedConversationId;
          return (
            <div key={session.id}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => onSelect(session.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect(session.id);
                  }
                }}
                className={cn(
                  'w-full cursor-pointer rounded-[18px] border px-2.5 py-2.5 text-left transition focus:outline-none focus:ring-2 focus:ring-primary/30',
                  active
                    ? 'border-primary/25 bg-primary/10 shadow-lg shadow-primary/10'
                    : 'border-transparent bg-background/70 hover:border-primary/15 hover:bg-background/90',
                )}
              >
                <div className="flex items-start gap-2.5">
                  <AvatarMark seed={session.avatarSeed} label={session.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <p className="truncate text-[13px] font-semibold leading-5 text-foreground">
                          {session.name}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">@{session.handle}</p>
                      </div>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDelete(session.id);
                        }}
                        disabled={deletingConversationId === session.id}
                        className="shrink-0 rounded-full border border-border/70 px-2 py-0.5 text-[10px] text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingConversationId === session.id ? '删除中' : '删除'}
                      </button>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-[11px] leading-4.5 text-muted-foreground/90">
                      {session.bio}
                    </p>
                  </div>
                </div>
              </div>
              {index < sessions.length - 1 ? <div className="mx-3 my-1.5 border-t border-dashed border-border/70" /> : null}
            </div>
          );
        })
      )}
    </div>
  );
}
