import { NextRequest } from 'next/server';
import { apiSuccess, handleRouteError } from '@/lib/server/api/response';
import { loadServerConfigSnapshot, saveServerConfig } from '@/lib/server/services/secure-config-service';
import { parseConfigSavePayload } from '@/lib/server/validators/xchatai';

export async function GET(_request: NextRequest) {
  try {
    const snapshot = await loadServerConfigSnapshot();
    return apiSuccess(snapshot);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = parseConfigSavePayload(body);
    const snapshot = await saveServerConfig(payload);
    return apiSuccess(snapshot);
  } catch (error) {
    return handleRouteError(error);
  }
}
