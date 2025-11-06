import { HttpError } from '../errors/http-error';
import { coreApi, CoreApiService } from '../services/core-api';
import { ParsedRequestContext, RequestEvent } from '../types/request-types';

const CreateWebChatModule = (coreApi: CoreApiService) => ({
  send: async (event: RequestEvent, context: ParsedRequestContext) => {
    const body = JSON.parse(event.body || '{}');
    const { sessionId, ...payload } = body;

    if (!payload || !payload.message) {
      throw new HttpError(400, 'Message is required');
    }

    return coreApi.sendWebchatMessage(sessionId, payload, context.shareableContext?.token!);
  },

  getHistory: async (event: RequestEvent, context: ParsedRequestContext) => {
    const body = JSON.parse(event.body || '{}');
    const { sessionId } = body;

    if (!sessionId) {
      return new HttpError(400, 'Session ID is required');
    }

    return coreApi.getWebchatHistory(sessionId, context.shareableContext?.token!);
  }
});

export type WebChatModule = ReturnType<typeof CreateWebChatModule>;
export const webchatModule = CreateWebChatModule(coreApi);
