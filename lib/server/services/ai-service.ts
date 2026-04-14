import type { AIConfig, ConversationDetail, Tweet } from '@/lib/types/xchatai';
import { generateConversationReply, streamConversationReply, validateAiConfiguration } from '@/lib/server/providers/ai-provider';

export async function getConversationAiReply(params: {
  conversation: ConversationDetail;
  prompt: string;
  aiConfig: AIConfig;
  quotedTweet: Tweet | null;
}) {
  return generateConversationReply(params);
}

export function streamConversationAiReply(params: {
  conversation: ConversationDetail;
  prompt: string;
  aiConfig: AIConfig;
  quotedTweet: Tweet | null;
}) {
  return streamConversationReply(params);
}

export async function validateAiConfig(aiConfig: AIConfig) {
  return validateAiConfiguration(aiConfig);
}
