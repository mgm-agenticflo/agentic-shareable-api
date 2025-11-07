import { HttpStatusCode } from 'axios';
import { HttpError } from '../errors/http-error';
import { coreApi, CoreApiService } from '../services/core-api';
import { WebchatMessageRequest, WebchatRequestPayload, WithShareable } from '../types/request-types';

const CreateWebChatModule = (coreApi: CoreApiService) => ({
  send: async (event: WithShareable) => {
    const { sessionId, ...payload } = event.parsedBody as WebchatMessageRequest;

    if (!payload || !payload.message) {
      throw new HttpError(HttpStatusCode.BadRequest, 'message is required');
    }

    const result = await coreApi.sendWebchatMessage(sessionId, payload, event.shareableContext.token);
    return { result };
  },

  getHistory: async (event: WithShareable) => {
    const { sessionId } = event.parsedBody as WebchatRequestPayload;

    if (!sessionId) {
      throw new HttpError(HttpStatusCode.BadRequest, 'session id is required');
    }

    const result = await coreApi.getWebchatHistory(sessionId, event.shareableContext.token);
    return { result };
  }
});

export type WebChatModule = ReturnType<typeof CreateWebChatModule>;
export const webchatModule = CreateWebChatModule(coreApi);
