import fs from 'node:fs/promises';
import path from 'node:path';
import { AppRouteError } from '@/lib/server/api/http-error';
import type {
  ChatMessage,
  ConversationDetail,
  ConversationListPage,
  ConversationSummary,
  TwitterPreviewResult,
} from '@/lib/types/xchatai';

const DATA_ROOT = path.join(process.cwd(), 'data', 'conversations');
const SESSION_FILENAME = 'conversation.json';
const DEFAULT_LIST_LIMIT = 15;
const DEFAULT_MESSAGE_LIMIT = 100;

type StoredConversation = {
  id: string;
  name: string;
  handle: string;
  bio: string;
  avatarSeed: string;
  createdAt: string;
  updatedAt: string;
  lastMessagePreview: string;
  messageCount: number;
  messages: ChatMessage[];
};

async function ensureDataRoot() {
  await fs.mkdir(DATA_ROOT, { recursive: true });
}

function getConversationDirectory(conversationId: string) {
  return path.join(DATA_ROOT, conversationId);
}

function getConversationFilePath(conversationId: string) {
  return path.join(getConversationDirectory(conversationId), SESSION_FILENAME);
}

function toSummary(conversation: StoredConversation): ConversationSummary {
  return {
    id: conversation.id,
    name: conversation.name,
    handle: conversation.handle,
    bio: conversation.bio,
    avatarSeed: conversation.avatarSeed,
    updatedAt: conversation.updatedAt,
    lastMessagePreview: conversation.lastMessagePreview,
    messageCount: conversation.messageCount,
  };
}

function paginateMessages(messages: ChatMessage[], offset = 0, limit = DEFAULT_MESSAGE_LIMIT) {
  const normalizedOffset = Math.max(0, offset);
  const normalizedLimit = Math.max(1, limit);
  const endExclusive = Math.max(0, messages.length - normalizedOffset);
  const startInclusive = Math.max(0, endExclusive - normalizedLimit);
  const slice = messages.slice(startInclusive, endExclusive);
  const nextOffset = startInclusive > 0 ? normalizedOffset + slice.length : null;
  const hasMore = startInclusive > 0;

  return {
    items: slice,
    hasMore,
    nextOffset,
    total: messages.length,
  };
}

async function readConversationFile(conversationId: string): Promise<StoredConversation | null> {
  try {
    const raw = await fs.readFile(getConversationFilePath(conversationId), 'utf8');
    return JSON.parse(raw) as StoredConversation;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

async function writeConversationFile(conversation: StoredConversation) {
  const directory = getConversationDirectory(conversation.id);
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(getConversationFilePath(conversation.id), `${JSON.stringify(conversation, null, 2)}\n`, 'utf8');
}

function createStoredConversationFromTwitterPreview(preview: TwitterPreviewResult): StoredConversation {
  const now = new Date().toISOString();
  const tweetMessages: ChatMessage[] = preview.tweets.map((tweet) => ({
    id: tweet.id,
    role: 'tweet',
    content: tweet.text,
    createdAt: tweet.createdAt,
    tweetId: tweet.id,
    citedTweetId: null,
  }));
  const sortedMessages = [...tweetMessages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const lastMessage = sortedMessages[sortedMessages.length - 1];

  return {
    id: preview.profile.id,
    name: preview.profile.name,
    handle: preview.profile.username,
    bio: preview.profile.description,
    avatarSeed: preview.profile.username,
    createdAt: now,
    updatedAt: lastMessage?.createdAt ?? now,
    lastMessagePreview: lastMessage?.content.slice(0, 120) ?? '',
    messageCount: sortedMessages.length,
    messages: sortedMessages,
  };
}

export async function ensureConversationSeeds() {
  await ensureDataRoot();
}

export async function listStoredConversations(params?: { offset?: number; limit?: number }): Promise<ConversationListPage> {
  await ensureConversationSeeds();
  const offset = Math.max(0, params?.offset ?? 0);
  const limit = Math.max(1, params?.limit ?? DEFAULT_LIST_LIMIT);
  const directories = await fs.readdir(DATA_ROOT, { withFileTypes: true });
  const conversations = await Promise.all(
    directories
      .filter((entry) => entry.isDirectory())
      .map((entry) => readConversationFile(entry.name)),
  );

  const items = conversations
    .filter((item): item is StoredConversation => Boolean(item))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const page = items.slice(offset, offset + limit).map(toSummary);
  const nextOffset = offset + page.length < items.length ? offset + page.length : null;

  return {
    items: page,
    hasMore: nextOffset !== null,
    nextOffset,
    total: items.length,
  };
}

export async function getStoredConversationDetail(
  conversationId: string,
  params?: { offset?: number; limit?: number },
): Promise<ConversationDetail> {
  await ensureConversationSeeds();
  const conversation = await readConversationFile(conversationId);
  if (!conversation) {
    throw new AppRouteError(404, 'CONVERSATION_NOT_FOUND', '会话不存在。');
  }

  const page = paginateMessages(conversation.messages, params?.offset, params?.limit);
  return {
    ...toSummary(conversation),
    messages: page.items,
    hasMore: page.hasMore,
    nextOffset: page.nextOffset,
    totalMessages: page.total,
  };
}

export async function appendMessagesToConversation(
  conversationId: string,
  messages: ChatMessage[],
) {
  await ensureConversationSeeds();
  const conversation = await readConversationFile(conversationId);
  if (!conversation) {
    throw new AppRouteError(404, 'CONVERSATION_NOT_FOUND', '会话不存在。');
  }

  const nextMessages = [...conversation.messages, ...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const lastMessage = nextMessages[nextMessages.length - 1];

  const nextConversation: StoredConversation = {
    ...conversation,
    messages: nextMessages,
    updatedAt: lastMessage?.createdAt ?? conversation.updatedAt,
    lastMessagePreview: lastMessage?.content.slice(0, 120) ?? conversation.lastMessagePreview,
    messageCount: nextMessages.length,
  };

  await writeConversationFile(nextConversation);
  return nextConversation;
}

export async function upsertConversationFromTwitterPreview(preview: TwitterPreviewResult) {
  await ensureDataRoot();
  const existing = await readConversationFile(preview.profile.id);
  const nextConversation = createStoredConversationFromTwitterPreview(preview);

  if (existing) {
    const nonTweetMessages = existing.messages.filter((message) => message.role !== 'tweet');
    const mergedMessages = [...nextConversation.messages, ...nonTweetMessages].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    const lastMessage = mergedMessages[mergedMessages.length - 1];

    const mergedConversation: StoredConversation = {
      ...existing,
      name: nextConversation.name,
      handle: nextConversation.handle,
      bio: nextConversation.bio,
      avatarSeed: nextConversation.avatarSeed,
      updatedAt: lastMessage?.createdAt ?? existing.updatedAt,
      lastMessagePreview: lastMessage?.content.slice(0, 120) ?? existing.lastMessagePreview,
      messageCount: mergedMessages.length,
      messages: mergedMessages,
    };

    await writeConversationFile(mergedConversation);
    return mergedConversation;
  }

  await writeConversationFile(nextConversation);
  return nextConversation;
}

export async function deleteStoredConversation(conversationId: string) {
  await ensureDataRoot();
  const directory = getConversationDirectory(conversationId);

  try {
    await fs.rm(directory, { recursive: true, force: false });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new AppRouteError(404, 'CONVERSATION_NOT_FOUND', '会话不存在。');
    }
    throw error;
  }

  return { ok: true, conversationId };
}
