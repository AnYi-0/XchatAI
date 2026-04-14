import { NextRequest } from 'next/server';
import { apiSuccess, handleRouteError } from '@/lib/server/api/response';
import { resolveMergedAiConfig } from '@/lib/server/services/secure-config-service';
import { validateAiConfig } from '@/lib/server/services/ai-service';
import { parseAiValidatePayload } from '@/lib/server/validators/xchatai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = parseAiValidatePayload(body);
    const result = await validateAiConfig(await resolveMergedAiConfig(payload.aiConfig));
    return apiSuccess(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
