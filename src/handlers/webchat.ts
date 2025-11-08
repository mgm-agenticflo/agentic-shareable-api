import { HttpStatusCode } from 'axios';
import { HttpCodedError } from '../errors/http-error';
import { coreApi, CoreApiService } from '../services/core-api';
import { WebchatMessageRequest, WebchatRequestPayload, WithShareable } from '../types/request-types';

const CreateWebChatModule = (coreApi: CoreApiService) => ({
  /**
   * Sends a message in a webchat session.
   *
   * This endpoint allows clients to send messages within an active webchat session
   * associated with the shareable resource. The message is processed and added to
   * the conversation history.
   *
   * @param event - The HTTP event containing the shareable context, session ID, and message payload
   * @returns An object containing the sent message details and any response
   *
   * @throws {HttpCodedError} 400 - If the message content is missing or empty
   *
   * @example
   * // Request body: { sessionId: "sess_123", message: "Hello!" }
   * // Returns: {
   *                result: {
   *                  sessionId: "sess_123",
   *                  timestamp: "2025-11-07T...",
   *                  message: [{"role": "...", "content": "..."}]
   *               }
   *            }
   */
  send: async (event: WithShareable) => {
    const { sessionId, ...payload } = event.parsedBody as WebchatMessageRequest;

    if (!payload || !payload.message) {
      throw new HttpCodedError(HttpStatusCode.BadRequest, 'message is required');
    }

    const result = await coreApi.sendWebchatMessage(sessionId, payload, event.shareableContext.token);
    return { result };
  },

  /**
   * Retrieves the complete message history for a webchat session.
   *
   * This endpoint fetches all messages exchanged in a specific webchat session,
   * allowing clients to display conversation history or restore session state.
   *
   * @param event - The HTTP event containing the shareable context and session ID
   * @returns An object containing the array of messages in chronological order
   *
   * @throws {HttpCodedError} 400 - If the session ID is missing
   *
   * @example
   * // Request body: { sessionId: "sess_123" }
   * // Returns: { result: [{"role": "...", "content": "..."}] }
   */
  getHistory: async (event: WithShareable) => {
    const { sessionId } = event.parsedBody as WebchatRequestPayload;

    if (!sessionId) {
      throw new HttpCodedError(HttpStatusCode.BadRequest, 'session id is required');
    }

    const result = await coreApi.getWebchatHistory(sessionId, event.shareableContext.token);
    return { result };
  }
});

export type WebChatModule = ReturnType<typeof CreateWebChatModule>;
export const webchatModule = CreateWebChatModule(coreApi);
