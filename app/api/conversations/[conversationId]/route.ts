import { NextRequest } from 'next/server';
import { apiSuccess, assertCondition, handleRouteError } from '@/lib/server/api/response';
import { deleteConversation, getConversationDetail } from '@/lib/server/services/conversation-service';
import { parsePaginationParams } from '@/lib/server/validators/xchatai';

export async function GET(request: NextRequest, context: { params: Promise<{ conversationId: string }> }) {
  try {
    const { conversationId } = await context.params;
    assertCondition(conversationId, 400, 'INVALID_CONVERSATION_ID', '会话 ID 不能为空。');
    const page = parsePaginationParams(request.nextUrl.searchParams, { limit: 100, offset: 0 });
    const detail = await getConversationDetail(conversationId, page);
    return apiSuccess(detail);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ conversationId: string }> },
) {
  try {
    const { conversationId } = await context.params;
    assertCondition(conversationId, 400, 'INVALID_CONVERSATION_ID', '会话 ID 不能为空。');
    const result = await deleteConversation(conversationId);
    return apiSuccess(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
