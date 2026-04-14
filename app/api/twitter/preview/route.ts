import { NextRequest } from 'next/server';
import { apiSuccess, handleRouteError } from '@/lib/server/api/response';
import { resolveMergedTwitterConfig } from '@/lib/server/services/secure-config-service';
import { previewTwitterUser } from '@/lib/server/services/twitter-service';
import { parseTwitterPreviewPayload } from '@/lib/server/validators/xchatai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = parseTwitterPreviewPayload(body);
    const result = await previewTwitterUser({
      ...payload,
      twitterConfig: await resolveMergedTwitterConfig(payload.twitterConfig),
    });
    return apiSuccess(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
