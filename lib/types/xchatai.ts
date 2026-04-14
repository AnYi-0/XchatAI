export type ThemeMode = 'light' | 'dark' | 'system';
export type MessageRole = 'tweet' | 'user' | 'assistant';
export type AIProvider = 'openai' | 'claude' | 'gemini' | 'qwen';

export type Tweet = {
  id: string;
  text: string;
  createdAt: string;
};

export type ChatMessage = {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  citedTweetId?: string | null;
  tweetId?: string | null;
};

export type ConversationSummary = {
  id: string;
  name: string;
  handle: string;
  bio: string;
  avatarSeed: string;
  updatedAt: string;
  lastMessagePreview: string;
  messageCount: number;
};

export type ConversationDetail = ConversationSummary & {
  messages: ChatMessage[];
  hasMore: boolean;
  nextOffset: number | null;
  totalMessages: number;
};

export type AIConfig = {
  provider: AIProvider;
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: string;
  maxTokens: string;
  enableThinking: boolean;
  thinkingBudget: string;
  thinkingLevel: 'minimal' | 'low' | 'medium' | 'high';
};

export type TwitterConfig = {
  bearerToken: string;
  apiKey: string;
  apiSecret: string;
};

export type SendMessageInput = {
  prompt: string;
  quotedTweetId?: string | null;
  aiConfig?: AIConfig;
  twitterConfig?: TwitterConfig;
};

export type ChatResponseData = {
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
};

export type ConversationListPage = {
  items: ConversationSummary[];
  hasMore: boolean;
  nextOffset: number | null;
  total: number;
};

export type AuthUser = {
  id: string;
  username: string;
  displayName: string;
};

export type TwitterUserProfile = {
  id: string;
  name: string;
  username: string;
  description: string;
  avatarUrl?: string;
  verified?: boolean;
};

export type TwitterPreviewResult = {
  profile: TwitterUserProfile;
  tweets: Tweet[];
};

export type ConfigSecretStatus = {
  aiApiKeySet: boolean;
  twitterBearerTokenSet: boolean;
  twitterApiKeySet: boolean;
  twitterApiSecretSet: boolean;
  twitterAccessTokenSet: boolean;
  twitterAccessSecretSet: boolean;
};

export type ServerConfigSnapshot = {
  aiConfig: Omit<AIConfig, 'apiKey'>;
  twitterConfig: Partial<TwitterConfig>;
  secretStatus: ConfigSecretStatus;
};
