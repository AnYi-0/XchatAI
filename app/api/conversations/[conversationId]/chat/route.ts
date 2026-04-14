import { NextRequest } from 'next/server';
import { assertCondition, handleRouteError } from '@/lib/server/api/response';
import { streamConversationMessage } from '@/lib/server/services/conversation-service';
import { parseChatPayload } from '@/lib/server/validators/xchatai';

export async function POST(request: NextRequest, context: { params: Promise<{ conversationId: string }> }) {
  try {
    const { conversationId } = await context.params;
    assertCondition(conversationId, 400, 'INVALID_CONVERSATION_ID', '会话 ID 不能为空。');
    const body = await request.json();
    const payload = parseChatPayload(body);
    const stream = await streamConversationMessage(conversationId, payload);
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
