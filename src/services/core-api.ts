/**
 * Business logic service for Core API operations.
 *
 * Handles shareable token validation, webchat messaging, and history retrieval.
 */

import { AxiosInstance } from 'axios';
import { tokenService, TransientTokenService } from './transient-token';
import logger from '../utils/logger';
import { getHttpClient } from './http-client';
import { ShareableContext } from '../types/shareable-context';

/**
 * Service for interacting with the Core API.
 *
 * Provides methods for:
 * - Validating shareable tokens
 * - Sending webchat messages
 * - Retrieving webchat history
 */
export const CreateCoreApiService = (client: AxiosInstance, tokenService: TransientTokenService) => ({
  /**
   * Validates a shareable token and retrieves its configuration.
   *
   * @param shareableToken - The shareable token to validate
   * @returns Configuration data associated with the token
   * @throws {HttpClientError} With code INVALID_TOKEN if token is invalid
   * @throws {HttpClientError} With code CONFIGURATION_ERROR for other errors
   *
   * @example
   * ```typescript
   * const config = await coreApi.getConfiguration('token123');
   * ```
   */
  getConfiguration: async (shareableToken: string): Promise<ShareableContext | null> => {
    const headers = {
      'x-shareable-token': shareableToken
    };
    const response = await client.get(`/shareable`, { headers });
    if (!response.data.success) {
      throw new Error(`Failed to fetch resource ${response.data.result}`);
    }
    return response.data.result;
  },

  /**
   * Sends a message in a webchat session.
   *
   * @param authToken - Transient authentication token
   * @param payload - Message payload with sessionId and message content
   * @returns Response data from the message endpoint
   * @throws {HttpClientError} With code INVALID_TOKEN if token is invalid
   * @throws {HttpClientError} With code MESSAGE_ERROR for other errors
   *
   * @example
   * ```typescript
   * const result = await coreApi.sendWebchatMessage(token, {
   *   sessionId: 'session123',
   *   message: 'Hello!'
   * });
   * ```
   */
  sendWebchatMessage: async (
    sessionId: string,
    payload: { message: string; [key: string]: unknown },
    shareableToken: string
  ) => {
    const headers = {
      'x-shareable-token': shareableToken
    };

    logger.info('Sending webchat message', { sessionId });
    const response = await client.post(`/webchat/${sessionId}`, payload, { headers });
    if (!response.data.success) {
      throw new Error(`Failed to fetch resource ${response.data.result}`);
    }
    return response.data.result;
  },

  /**
   * Retrieves the message history for a webchat session.
   *
   * @param authToken - Transient authentication token
   * @param sessionId - The session ID to retrieve history for
   * @returns Array of message objects
   * @throws {HttpClientError} With code INVALID_TOKEN if token is invalid
   * @throws {HttpClientError} With code HISTORY_ERROR for other errors
   *
   * @example
   * ```typescript
   * const messages = await coreApi.getWebchatHistory(token, 'session123');
   * ```
   */
  getWebchatHistory: async (sessionId: string, shareableToken: string) => {
    const headers = {
      'x-shareable-token': shareableToken
    };

    logger.info('Fetching webchat history', { sessionId });
    const response = await client.get(`/webchat/history/${sessionId}`, { headers });

    if (!response.data.success) {
      throw new Error(`Failed to fetch webchat history ${response.data.result}`);
    }
    const messages = response.data.result || [];
    logger.debug('History retrieved', { messageCount: messages.length });
    return messages;
  }
});

export type CoreApiService = ReturnType<typeof CreateCoreApiService>;
export const coreApi = CreateCoreApiService(getHttpClient(), tokenService);
