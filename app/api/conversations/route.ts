import { NextRequest } from 'next/server';
import { apiSuccess, handleRouteError } from '@/lib/server/api/response';
import { createConversationFromTwitterUsername, listConversations } from '@/lib/server/services/conversation-service';
import { parseCreateConversationPayload, parsePaginationParams } from '@/lib/server/validators/xchatai';

export async function GET(request: NextRequest) {
  try {
    const page = parsePaginationParams(request.nextUrl.searchParams, { limit: 15, offset: 0 });
    const conversations = await listConversations(page);
    return apiSuccess(conversations);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = parseCreateConversationPayload(body);
    const conversation = await createConversationFromTwitterUsername(payload.username);
    return apiSuccess(conversation);
  } catch (error) {
    return handleRouteError(error);
  }
}
