import { RequestEvent } from '../types/request-types';
import { coreApi } from '../services/core-api';
import { connectionManager } from '../services/connection-manager';
import { HttpCodedError } from '../errors/http-error';
import { HttpStatusCode } from 'axios';
import logger from '../utils/logger';

/**
 * Authentication module for WebSocket connections
 * Handles the authenticate command that clients must send as their first message
 */
export const authModule = {
  /**
   * Authenticate a WebSocket connection
   *
   * This handler processes the authenticate command sent by WebSocket clients.
   * It validates the provided shareable token with the backend (just like HTTP /resource/get),
   * fetches the resource configuration, and updates the connection record.
   *
   * Expected message format:
   * {
   *   command: "authenticate",
   *   token: "shareable-token-here",
   *   sessionId?: "optional-session-id"
   * }
   *
   * Unlike HTTP which returns a transient JWT, WebSocket connections are stateful,
   * so the shareable context is stored in the connection record for subsequent messages.
   *
   * @param event - The request event containing the shareable token
   * @returns Success message with resource configuration
   * @throws {HttpCodedError} 400 - If token is missing from the request
   * @throws {HttpCodedError} 400 - If token is invalid or expired
   * @throws {HttpCodedError} 500 - If connection update fails
   */
  authenticate: async (event: RequestEvent) => {
    let connectionId: string | undefined;

    if (event.websocketContext) {
      if ('requestContext' in event.websocketContext && event.websocketContext.requestContext) {
        connectionId = (event.websocketContext.requestContext as { connectionId?: string }).connectionId;
      } else if ('connectionId' in event.websocketContext) {
        connectionId = event.websocketContext.connectionId as string;
      }
    }

    if (!connectionId) {
      throw new HttpCodedError(HttpStatusCode.InternalServerError, 'No connection ID found');
    }

    // Extract shareable token from message body
    const { token, sessionId } = event.parsedBody as { token?: string; sessionId?: string };

    if (!token) {
      logger.error(`Authentication attempt without token for connection ${connectionId}`);
      throw new HttpCodedError(HttpStatusCode.BadRequest, 'Token is required');
    }

    // Fetch and validate the resource configuration from backend
    // This is the same logic as HTTP /resource/get
    const shareable = await coreApi.getConfiguration(token);

    if (!shareable) {
      logger.error(`Invalid or expired token for connection ${connectionId}`);
      throw new HttpCodedError(HttpStatusCode.BadRequest, 'Invalid or expired resource');
    }

    // Update connection with authenticated shareable context
    try {
      await connectionManager.saveConnection(connectionId, shareable, sessionId);

      return {
        result: {
          authenticated: true,
          config: shareable
        },
        statusCode: HttpStatusCode.Ok
      };
    } catch (error) {
      logger.error(`Failed to update connection ${connectionId}:`, error);
      throw new HttpCodedError(HttpStatusCode.InternalServerError, 'Failed to authenticate connection');
    }
  }
};
